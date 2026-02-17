import { CloudEvent, EventMetadata } from '../interfaces';
import { generateEventId, generateCorrelationId } from './id.util';

export function createCloudEvent<T>(params: {
  source: string;
  type: string;
  data: T;
  subject?: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
}): CloudEvent<T> {
  const metadata: EventMetadata = {
    correlationId: params.correlationId || generateCorrelationId(),
    causationId: params.causationId,
    userId: params.userId,
    version: 1,
  };

  return {
    specversion: '1.0',
    id: generateEventId(),
    source: params.source,
    type: params.type,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    subject: params.subject,
    data: params.data,
    metadata,
  };
}
