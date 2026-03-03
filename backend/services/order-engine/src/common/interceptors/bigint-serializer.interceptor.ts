import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Decimal from 'decimal.js';

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value.toString();
  }
  if (value instanceof Decimal) return value.toString();
  if (value instanceof Date) return value.toISOString();
  // Prisma Decimal is not always instanceof Decimal — detect by shape
  if (typeof value === 'object' && 'd' in value && 'e' in value && 's' in value) {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serialize(data)));
  }
}
