/**
 * @file 애그리거트 루트 기본 클래스
 * @description 이벤트 소싱 기반 애그리거트의 기본 클래스 (이벤트 적용/수집)
 *
 * @file Aggregate Root Base Class
 * @description Base class for event-sourced aggregates with event apply/collect
 */
import { StoredEvent } from './interfaces/event-store.interface';

export interface DomainEvent {
  eventType: string;
  eventData: Record<string, unknown>;
}

export abstract class AggregateRoot {
  private _uncommittedEvents: DomainEvent[] = [];
  private _version = -1;

  get version(): number {
    return this._version;
  }

  get uncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }

  loadFromHistory(events: StoredEvent[]): void {
    for (const event of events) {
      this.apply(event.eventType, event.eventData as Record<string, unknown>, false);
      this._version = event.streamPosition;
    }
  }

  protected raise(eventType: string, eventData: Record<string, unknown>): void {
    this.apply(eventType, eventData, true);
  }

  private apply(
    eventType: string,
    eventData: Record<string, unknown>,
    isNew: boolean,
  ): void {
    const handler = this.getEventHandler(eventType);
    if (handler) {
      handler.call(this, eventData);
    }

    if (isNew) {
      this._version++;
      this._uncommittedEvents.push({ eventType, eventData });
    }
  }

  private getEventHandler(eventType: string): ((data: Record<string, unknown>) => void) | null {
    // Convention: on{EventType} method name
    // e.g., "OrderPlaced" -> "onOrderPlaced"
    const shortType = eventType.split('.').pop() || eventType;
    const parts = shortType.split('_');
    const methodName =
      'on' +
      parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');

    const handler = (this as Record<string, unknown>)[methodName];
    if (typeof handler === 'function') {
      return handler as (data: Record<string, unknown>) => void;
    }
    return null;
  }
}
