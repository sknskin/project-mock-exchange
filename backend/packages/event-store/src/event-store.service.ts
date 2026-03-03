/**
 * @file Event Store 서비스
 * @description 이벤트 저장, 스트림 읽기, 스냅샷 관리, Outbox 처리를 담당합니다
 *
 * @file Event Store Service
 * @description Handles event persistence, stream reading, snapshot management, and outbox
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';
import {
  AggregateVersion,
  AppendEventParams,
  DlqEntry,
  OutboxEntry,
  SequenceGap,
  StoredEvent,
  SubscriptionCheckpoint,
} from './interfaces/event-store.interface';

export class ConcurrencyError extends Error {
  constructor(streamId: string, expectedVersion: number) {
    super(
      `Concurrency conflict on stream "${streamId}" at expected version ${expectedVersion}`,
    );
    this.name = 'ConcurrencyError';
  }
}

@Injectable()
export class EventStoreService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(EventStoreService.name);

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
  }

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
    this.logger.log('Event Store initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  private async ensureSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS event_store (
          global_position   BIGSERIAL PRIMARY KEY,
          stream_id         VARCHAR(255) NOT NULL,
          stream_position   INTEGER NOT NULL,
          event_type        VARCHAR(255) NOT NULL,
          event_data        JSONB NOT NULL,
          metadata          JSONB NOT NULL DEFAULT '{}',
          event_id          VARCHAR(255) NOT NULL UNIQUE,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_stream_position UNIQUE (stream_id, stream_position)
        );

        CREATE INDEX IF NOT EXISTS idx_es_stream_id
          ON event_store (stream_id, stream_position ASC);
        CREATE INDEX IF NOT EXISTS idx_es_event_type
          ON event_store (event_type);
        CREATE INDEX IF NOT EXISTS idx_es_created_at
          ON event_store (created_at);

        CREATE TABLE IF NOT EXISTS event_snapshots (
          stream_id         VARCHAR(255) PRIMARY KEY,
          snapshot_data     JSONB NOT NULL,
          stream_position   INTEGER NOT NULL,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS event_subscriptions (
          subscription_id   VARCHAR(255) PRIMARY KEY,
          last_position     BIGINT NOT NULL DEFAULT 0,
          updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS event_outbox (
          id                BIGSERIAL PRIMARY KEY,
          event_id          VARCHAR(255) NOT NULL,
          topic             VARCHAR(255) NOT NULL,
          partition_key     VARCHAR(255) NOT NULL,
          payload           JSONB NOT NULL,
          published         BOOLEAN NOT NULL DEFAULT FALSE,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          published_at      TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
          ON event_outbox (published, created_at) WHERE published = FALSE;

        -- #25: Dead Letter Queue for failed outbox entries
        CREATE TABLE IF NOT EXISTS dead_letter_queue (
          id                  BIGSERIAL PRIMARY KEY,
          original_outbox_id  BIGINT NOT NULL,
          event_id            VARCHAR(255) NOT NULL,
          topic               VARCHAR(255) NOT NULL,
          partition_key       VARCHAR(255) NOT NULL,
          payload             JSONB NOT NULL,
          error_message       TEXT NOT NULL DEFAULT '',
          retry_count         INTEGER NOT NULL DEFAULT 0,
          status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_retried_at     TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_dlq_status
          ON dead_letter_queue (status) WHERE status = 'PENDING';

        -- #26: Aggregate version tracking for sequence/gap detection
        CREATE TABLE IF NOT EXISTS aggregate_versions (
          stream_id           VARCHAR(255) PRIMARY KEY,
          current_version     INTEGER NOT NULL DEFAULT 0,
          event_count         INTEGER NOT NULL DEFAULT 0,
          updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    } finally {
      client.release();
    }
  }

  async appendEvent(params: AppendEventParams, outbox?: { topic: string; partitionKey: string }): Promise<StoredEvent> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<StoredEvent>(
        `INSERT INTO event_store (stream_id, stream_position, event_type, event_data, metadata, event_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING global_position as "globalPosition", stream_id as "streamId",
                   stream_position as "streamPosition", event_type as "eventType",
                   event_data as "eventData", metadata, event_id as "eventId",
                   created_at as "createdAt"`,
        [
          params.streamId,
          params.expectedVersion,
          params.eventType,
          JSON.stringify(params.eventData),
          JSON.stringify(params.metadata),
          params.eventId,
        ],
      );

      if (outbox) {
        await client.query(
          `INSERT INTO event_outbox (event_id, topic, partition_key, payload)
           VALUES ($1, $2, $3, $4)`,
          [
            params.eventId,
            outbox.topic,
            outbox.partitionKey,
            JSON.stringify({
              eventId: params.eventId,
              eventType: params.eventType,
              eventData: params.eventData,
              metadata: params.metadata,
            }),
          ],
        );
      }

      // #26: Atomically update aggregate version tracking
      await client.query(
        `INSERT INTO aggregate_versions (stream_id, current_version, event_count, updated_at)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (stream_id)
         DO UPDATE SET current_version = $2,
                       event_count = aggregate_versions.event_count + 1,
                       updated_at = NOW()`,
        [params.streamId, params.expectedVersion],
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      if (
        error instanceof Error &&
        error.message.includes('uq_stream_position')
      ) {
        throw new ConcurrencyError(params.streamId, params.expectedVersion);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async readStream(streamId: string, fromPosition = 0): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT global_position as "globalPosition", stream_id as "streamId",
              stream_position as "streamPosition", event_type as "eventType",
              event_data as "eventData", metadata, event_id as "eventId",
              created_at as "createdAt"
       FROM event_store
       WHERE stream_id = $1 AND stream_position >= $2
       ORDER BY stream_position ASC`,
      [streamId, fromPosition],
    );
    return result.rows;
  }

  async readAllFromPosition(fromPosition: number, limit = 1000): Promise<StoredEvent[]> {
    const result = await this.pool.query<StoredEvent>(
      `SELECT global_position as "globalPosition", stream_id as "streamId",
              stream_position as "streamPosition", event_type as "eventType",
              event_data as "eventData", metadata, event_id as "eventId",
              created_at as "createdAt"
       FROM event_store
       WHERE global_position > $1
       ORDER BY global_position ASC
       LIMIT $2`,
      [fromPosition, limit],
    );
    return result.rows;
  }

  async getUnpublishedOutboxEntries(limit = 100): Promise<OutboxEntry[]> {
    const result = await this.pool.query<OutboxEntry>(
      `SELECT id, event_id as "eventId", topic, partition_key as "partitionKey",
              payload, published, created_at as "createdAt", published_at as "publishedAt"
       FROM event_outbox
       WHERE published = FALSE
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  async markOutboxPublished(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query(
      `UPDATE event_outbox SET published = TRUE, published_at = NOW()
       WHERE id = ANY($1)`,
      [ids],
    );
  }

  async getCheckpoint(subscriptionId: string): Promise<number> {
    const result = await this.pool.query<SubscriptionCheckpoint>(
      `SELECT last_position as "lastPosition" FROM event_subscriptions WHERE subscription_id = $1`,
      [subscriptionId],
    );
    return result.rows[0]?.lastPosition ?? 0;
  }

  async saveCheckpoint(subscriptionId: string, position: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO event_subscriptions (subscription_id, last_position, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (subscription_id)
       DO UPDATE SET last_position = $2, updated_at = NOW()`,
      [subscriptionId, position],
    );
  }

  async saveSnapshot(streamId: string, data: Record<string, unknown>, position: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO event_snapshots (stream_id, snapshot_data, stream_position, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (stream_id)
       DO UPDATE SET snapshot_data = $2, stream_position = $3, created_at = NOW()`,
      [streamId, JSON.stringify(data), position],
    );
  }

  async purgePublished(days: number = 30): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM event_outbox WHERE published = TRUE AND published_at < NOW() - INTERVAL '1 day' * $1`,
      [days],
    );
    const count = result.rowCount || 0;
    if (count > 0) {
      this.logger.log(`Purged ${count} published outbox entries older than ${days} days`);
    }
    return count;
  }

  async getSnapshot(streamId: string): Promise<{ data: Record<string, unknown>; position: number } | null> {
    const result = await this.pool.query(
      `SELECT snapshot_data as "data", stream_position as "position"
       FROM event_snapshots WHERE stream_id = $1`,
      [streamId],
    );
    if (result.rows.length === 0) return null;
    return { data: result.rows[0].data, position: result.rows[0].position };
  }

  // =========================================================================
  // #25: Dead Letter Queue (DLQ) 재처리 메커니즘
  // =========================================================================

  /**
   * 실패한 Outbox 엔트리를 DLQ로 이동
   * Move a failed outbox entry to the dead letter queue
   */
  async moveToDlq(outboxEntry: OutboxEntry, errorMessage: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO dead_letter_queue (original_outbox_id, event_id, topic, partition_key, payload, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        outboxEntry.id,
        outboxEntry.eventId,
        outboxEntry.topic,
        outboxEntry.partitionKey,
        typeof outboxEntry.payload === 'string'
          ? outboxEntry.payload
          : JSON.stringify(outboxEntry.payload),
        errorMessage,
      ],
    );

    // 원본 outbox 엔트리를 published로 표시하여 relay 루프에서 제외
    // Mark original outbox entry as published so the relay loop stops retrying it
    await this.markOutboxPublished([outboxEntry.id]);

    this.logger.warn(
      `Moved outbox entry ${outboxEntry.id} (event=${outboxEntry.eventId}) to DLQ: ${errorMessage}`,
    );
  }

  /**
   * DLQ 엔트리 목록 조회 (상태별 필터링)
   * Get DLQ entries, optionally filtered by status
   */
  async getDlqEntries(status: 'PENDING' | 'RETRIED' | 'DISCARDED' = 'PENDING', limit = 100): Promise<DlqEntry[]> {
    const result = await this.pool.query<DlqEntry>(
      `SELECT id, original_outbox_id as "originalOutboxId", event_id as "eventId",
              topic, partition_key as "partitionKey", payload,
              error_message as "errorMessage", retry_count as "retryCount",
              status, created_at as "createdAt", last_retried_at as "lastRetriedAt"
       FROM dead_letter_queue
       WHERE status = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [status, limit],
    );
    return result.rows;
  }

  /**
   * DLQ 엔트리를 outbox로 재전송하여 재처리
   * Retry a DLQ entry by re-inserting it into the outbox for reprocessing
   */
  async retryDlqEntry(dlqId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<DlqEntry>(
        `SELECT id, event_id as "eventId", topic, partition_key as "partitionKey",
                payload, retry_count as "retryCount"
         FROM dead_letter_queue
         WHERE id = $1 AND status = 'PENDING'
         FOR UPDATE`,
        [dlqId],
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const entry = result.rows[0];

      // outbox에 새 엔트리로 재삽입 / Re-insert as a new outbox entry
      await client.query(
        `INSERT INTO event_outbox (event_id, topic, partition_key, payload)
         VALUES ($1, $2, $3, $4)`,
        [
          entry.eventId,
          entry.topic,
          entry.partitionKey,
          typeof entry.payload === 'string'
            ? entry.payload
            : JSON.stringify(entry.payload),
        ],
      );

      // DLQ 엔트리를 RETRIED 상태로 업데이트 / Update DLQ entry status to RETRIED
      await client.query(
        `UPDATE dead_letter_queue
         SET status = 'RETRIED', retry_count = retry_count + 1, last_retried_at = NOW()
         WHERE id = $1`,
        [dlqId],
      );

      await client.query('COMMIT');
      this.logger.log(`Retried DLQ entry ${dlqId} (event=${entry.eventId})`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 여러 DLQ 엔트리를 한꺼번에 재시도
   * Retry multiple DLQ entries at once
   */
  async retryAllPendingDlq(limit = 100): Promise<number> {
    const entries = await this.getDlqEntries('PENDING', limit);
    let retried = 0;
    for (const entry of entries) {
      const success = await this.retryDlqEntry(entry.id);
      if (success) retried++;
    }
    if (retried > 0) {
      this.logger.log(`Retried ${retried} DLQ entries`);
    }
    return retried;
  }

  /**
   * DLQ 엔트리를 영구 폐기 (수동 검토 후)
   * Permanently discard a DLQ entry (after manual review)
   */
  async discardDlqEntry(dlqId: number): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE dead_letter_queue SET status = 'DISCARDED' WHERE id = $1 AND status = 'PENDING'`,
      [dlqId],
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * DLQ 통계 조회 / Get DLQ statistics
   */
  async getDlqStats(): Promise<{ pending: number; retried: number; discarded: number }> {
    const result = await this.pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text as count FROM dead_letter_queue GROUP BY status`,
    );
    const stats = { pending: 0, retried: 0, discarded: 0 };
    for (const row of result.rows) {
      const count = parseInt(row.count, 10);
      if (row.status === 'PENDING') stats.pending = count;
      else if (row.status === 'RETRIED') stats.retried = count;
      else if (row.status === 'DISCARDED') stats.discarded = count;
    }
    return stats;
  }

  // =========================================================================
  // #26: 이벤트 버전/시퀀스 추적
  // =========================================================================

  /**
   * 애그리거트의 현재 버전 조회
   * Get the current version of an aggregate stream
   */
  async getAggregateVersion(streamId: string): Promise<AggregateVersion | null> {
    const result = await this.pool.query<AggregateVersion>(
      `SELECT stream_id as "streamId", current_version as "currentVersion",
              event_count as "eventCount", updated_at as "updatedAt"
       FROM aggregate_versions
       WHERE stream_id = $1`,
      [streamId],
    );
    return result.rows[0] || null;
  }

  /**
   * 모든 애그리거트의 버전 목록 조회
   * List all aggregate versions (for monitoring/admin)
   */
  async listAggregateVersions(limit = 100, offset = 0): Promise<AggregateVersion[]> {
    const result = await this.pool.query<AggregateVersion>(
      `SELECT stream_id as "streamId", current_version as "currentVersion",
              event_count as "eventCount", updated_at as "updatedAt"
       FROM aggregate_versions
       ORDER BY updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows;
  }

  /**
   * 특정 스트림의 이벤트 시퀀스 갭 감지
   * Detect gaps in the event sequence for a specific stream
   */
  async detectSequenceGaps(streamId: string): Promise<SequenceGap[]> {
    const result = await this.pool.query<{ expected_pos: number; actual_pos: number }>(
      `SELECT
         prev.stream_position + 1 as expected_pos,
         curr.stream_position as actual_pos
       FROM event_store curr
       JOIN event_store prev
         ON curr.stream_id = prev.stream_id
         AND curr.stream_position > prev.stream_position
       WHERE curr.stream_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM event_store mid
           WHERE mid.stream_id = $1
             AND mid.stream_position = prev.stream_position + 1
         )
         AND curr.stream_position = (
           SELECT MIN(n.stream_position)
           FROM event_store n
           WHERE n.stream_id = $1
             AND n.stream_position > prev.stream_position
         )
         AND prev.stream_position + 1 < curr.stream_position
       ORDER BY prev.stream_position ASC`,
      [streamId],
    );
    return result.rows.map((row) => ({
      streamId,
      expectedPosition: row.expected_pos,
      actualPosition: row.actual_pos,
    }));
  }

  /**
   * 모든 스트림에서 시퀀스 갭을 가진 스트림 목록 감지
   * Detect all streams that have sequence gaps (for audit/monitoring)
   */
  async detectAllSequenceGaps(): Promise<SequenceGap[]> {
    const result = await this.pool.query<{ stream_id: string; expected_pos: number; actual_pos: number }>(
      `SELECT
         curr.stream_id,
         prev.stream_position + 1 as expected_pos,
         curr.stream_position as actual_pos
       FROM event_store curr
       JOIN event_store prev
         ON curr.stream_id = prev.stream_id
         AND curr.stream_position > prev.stream_position
       WHERE NOT EXISTS (
           SELECT 1 FROM event_store mid
           WHERE mid.stream_id = curr.stream_id
             AND mid.stream_position = prev.stream_position + 1
         )
         AND curr.stream_position = (
           SELECT MIN(n.stream_position)
           FROM event_store n
           WHERE n.stream_id = curr.stream_id
             AND n.stream_position > prev.stream_position
         )
         AND prev.stream_position + 1 < curr.stream_position
       ORDER BY curr.stream_id, prev.stream_position ASC`,
    );
    return result.rows.map((row) => ({
      streamId: row.stream_id,
      expectedPosition: row.expected_pos,
      actualPosition: row.actual_pos,
    }));
  }

  /**
   * 애그리거트 버전 정보와 실제 이벤트 수의 일관성 검증
   * Verify consistency between aggregate_versions table and actual event counts
   */
  async verifyAggregateConsistency(streamId: string): Promise<{
    consistent: boolean;
    trackedVersion: number | null;
    actualMaxPosition: number | null;
    trackedEventCount: number | null;
    actualEventCount: number | null;
  }> {
    const [versionResult, eventResult] = await Promise.all([
      this.pool.query<{ current_version: number; event_count: number }>(
        `SELECT current_version, event_count FROM aggregate_versions WHERE stream_id = $1`,
        [streamId],
      ),
      this.pool.query<{ max_pos: number; cnt: number }>(
        `SELECT COALESCE(MAX(stream_position), -1) as max_pos, COUNT(*)::int as cnt
         FROM event_store WHERE stream_id = $1`,
        [streamId],
      ),
    ]);

    if (versionResult.rows.length === 0 && eventResult.rows[0].cnt === 0) {
      return {
        consistent: true,
        trackedVersion: null,
        actualMaxPosition: null,
        trackedEventCount: null,
        actualEventCount: null,
      };
    }

    const tracked = versionResult.rows[0];
    const actual = eventResult.rows[0];

    const consistent =
      tracked !== undefined &&
      tracked.current_version === actual.max_pos &&
      tracked.event_count === actual.cnt;

    return {
      consistent,
      trackedVersion: tracked?.current_version ?? null,
      actualMaxPosition: actual.max_pos,
      trackedEventCount: tracked?.event_count ?? null,
      actualEventCount: actual.cnt,
    };
  }
}
