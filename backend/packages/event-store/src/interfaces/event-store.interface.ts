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
