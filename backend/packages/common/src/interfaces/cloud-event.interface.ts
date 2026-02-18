/**
 * @file CloudEvents 인터페이스
 * @description CloudEvents 규격에 맞는 이벤트 인터페이스 정의
 *
 * @file CloudEvents Interface
 * @description CloudEvents specification-compliant event interface definition
 */
export interface CloudEvent<T = unknown> {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  time: string;
  datacontenttype: 'application/json';
  subject?: string;
  data: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  userId?: string;
  version: number;
}
