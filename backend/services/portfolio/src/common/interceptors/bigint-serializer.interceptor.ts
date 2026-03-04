/**
 * @file BigInt/Decimal 직렬화 인터셉터
 * @description JSON 직렬화 시 BigInt, Decimal, Prisma Decimal, Date 타입을
 *              안전하게 문자열로 변환합니다. BigInt가 Number.MAX_SAFE_INTEGER를
 *              초과하면 문자열로 반환하여 정밀도 손실을 방지합니다.
 *
 * @file BigInt/Decimal Serializer Interceptor
 * @description Safely converts BigInt, Decimal, Prisma Decimal, and Date types
 *              to strings during JSON serialization. BigInt values exceeding
 *              Number.MAX_SAFE_INTEGER are returned as strings to prevent precision loss.
 */
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
