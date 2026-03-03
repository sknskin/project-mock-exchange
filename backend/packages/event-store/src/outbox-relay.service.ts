/**
 * @file Outbox Relay 서비스
 * @description 미발행 Outbox 엔트리를 Kafka로 발행하는 스케줄러
 *
 * @file Outbox Relay Service
 * @description Scheduler that publishes unpublished outbox entries to Kafka
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { EventStoreService } from './event-store.service';

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private producer: Producer;
  private connected = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private readonly pollIntervalMs: number;
  private readonly maxRetryPerEntry: number;

  /** 엔트리별 실패 횟수 추적 (outbox id -> failure count) */
  private readonly failureCounts = new Map<number, number>();

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly configService: ConfigService,
  ) {
    const kafka = new Kafka({
      clientId: 'outbox-relay',
      brokers: this.configService
        .get<string>('KAFKA_BROKERS', 'localhost:9092')
        .split(','),
      retry: { initialRetryTime: 300, retries: 5 },
    });
    this.producer = kafka.producer();
    this.pollIntervalMs = this.configService.get<number>('OUTBOX_POLL_INTERVAL_MS', 5000);
    this.maxRetryPerEntry = this.configService.get<number>('OUTBOX_MAX_RETRY_PER_ENTRY', 5);
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.connected = true;
      this.logger.log('Outbox relay Kafka producer connected');
    } catch (error) {
      this.logger.warn('Kafka not available for outbox relay, will retry on next poll', error);
    }

    this.intervalHandle = setInterval(() => this.relay(), this.pollIntervalMs);
    this.logger.log(`Outbox relay started (poll every ${this.pollIntervalMs}ms)`);
  }

  async onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
    if (this.connected) {
      await this.producer.disconnect();
    }
  }

  private async relay() {
    if (!this.connected) {
      try {
        await this.producer.connect();
        this.connected = true;
      } catch {
        return; // Kafka still unavailable, skip this cycle
      }
    }

    try {
      const entries = await this.eventStore.getUnpublishedOutboxEntries(100);
      if (entries.length === 0) return;

      const publishedIds: number[] = [];

      for (const entry of entries) {
        try {
          await this.producer.send({
            topic: entry.topic,
            messages: [
              {
                key: entry.partitionKey,
                value: typeof entry.payload === 'string'
                  ? entry.payload
                  : JSON.stringify(entry.payload),
              },
            ],
          });
          publishedIds.push(entry.id);
          // 성공 시 실패 카운트 초기화 / Reset failure count on success
          this.failureCounts.delete(entry.id);
        } catch (entryError) {
          const errorMessage = entryError instanceof Error ? entryError.message : String(entryError);
          const failCount = (this.failureCounts.get(entry.id) || 0) + 1;
          this.failureCounts.set(entry.id, failCount);

          if (failCount >= this.maxRetryPerEntry) {
            // 최대 재시도 초과 — DLQ로 이동 / Max retries exceeded — move to DLQ
            this.logger.error(
              `Outbox entry ${entry.id} (event=${entry.eventId}) failed ${failCount} times, moving to DLQ: ${errorMessage}`,
            );
            try {
              await this.eventStore.moveToDlq(entry, errorMessage);
              this.failureCounts.delete(entry.id);
            } catch (dlqError) {
              this.logger.error(
                'Failed to move entry to DLQ',
                dlqError instanceof Error ? dlqError.message : dlqError,
              );
            }
          } else {
            this.logger.warn(
              `Outbox entry ${entry.id} publish failed (attempt ${failCount}/${this.maxRetryPerEntry}): ${errorMessage}`,
            );
          }
        }
      }

      if (publishedIds.length > 0) {
        await this.eventStore.markOutboxPublished(publishedIds);
        this.logger.log(`Outbox relay: published ${publishedIds.length} entries`);
      }
    } catch (error) {
      this.logger.error('Outbox relay cycle failed', error instanceof Error ? error.message : error);
      this.connected = false;
    }
  }
}
