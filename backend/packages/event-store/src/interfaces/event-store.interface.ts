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
