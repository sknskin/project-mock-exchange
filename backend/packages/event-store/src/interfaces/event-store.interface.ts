/**
 * @file Event Store 인터페이스
 * @description 이벤트, 스냅샷, 구독 등 Event Store 핵심 타입 정의
 *
 * @file Event Store Interface
 * @description Core type definitions: events, snapshots, subscriptions
 */
export interface StoredEvent {
  globalPosition: number;
  streamId: string;
  streamPosition: number;
  eventType: string;
  eventData: Record<string, unknown>;
  metadata: Record<string, unknown>;
  eventId: string;
  createdAt: Date;
}

export interface AppendEventParams {
  streamId: string;
  expectedVersion: number;
  eventType: string;
  eventData: Record<string, unknown>;
  metadata: Record<string, unknown>;
  eventId: string;
}

export interface OutboxEntry {
  id: number;
  eventId: string;
  topic: string;
  partitionKey: string;
  payload: Record<string, unknown>;
  published: boolean;
  createdAt: Date;
  publishedAt: Date | null;
}

export interface SubscriptionCheckpoint {
  subscriptionId: string;
  lastPosition: number;
  updatedAt: Date;
}

export interface SnapshotData {
  streamId: string;
  snapshotData: Record<string, unknown>;
  streamPosition: number;
  createdAt: Date;
}

/**
 * Dead Letter Queue 엔트리
 * Represents a failed outbox entry that has been moved to the DLQ
 */
export interface DlqEntry {
  id: number;
  originalOutboxId: number;
  eventId: string;
  topic: string;
  partitionKey: string;
  payload: Record<string, unknown>;
  errorMessage: string;
  retryCount: number;
  status: 'PENDING' | 'RETRIED' | 'DISCARDED';
  createdAt: Date;
  lastRetriedAt: Date | null;
}

/**
 * 애그리거트 버전 추적 정보
 * Tracks the latest version (stream_position) for each aggregate stream
 */
export interface AggregateVersion {
  streamId: string;
  currentVersion: number;
  eventCount: number;
  updatedAt: Date;
}

/**
 * 이벤트 시퀀스 갭 정보
 * Represents a detected gap in the event sequence for a stream
 */
export interface SequenceGap {
  streamId: string;
  expectedPosition: number;
  actualPosition: number;
}
