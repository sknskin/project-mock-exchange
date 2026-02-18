/**
 * @file CloudEvents 유틸리티
 * @description CloudEvents 규격 이벤트를 생성하는 팩토리 유틸리티
 *
 * @file CloudEvents Utility
 * @description Factory utility for creating CloudEvents-compliant events
 */
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
