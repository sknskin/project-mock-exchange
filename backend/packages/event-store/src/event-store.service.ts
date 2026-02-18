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
  AppendEventParams,
  OutboxEntry,
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

  async getSnapshot(streamId: string): Promise<{ data: Record<string, unknown>; position: number } | null> {
    const result = await this.pool.query(
      `SELECT snapshot_data as "data", stream_position as "position"
       FROM event_snapshots WHERE stream_id = $1`,
      [streamId],
    );
    if (result.rows.length === 0) return null;
    return { data: result.rows[0].data, position: result.rows[0].position };
  }
}
