/**
 * @file 응답 캐시 인터셉터
 * @description TTL 기반 인메모리 응답 캐싱 — 라이브러리 의존 없이 자체 구현
 *
 * @file Response Cache Interceptor
 * @description TTL-based in-memory response caching — self-contained, no external library needed
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export const CACHE_TTL_KEY = 'cache_ttl_seconds';

/**
 * 캐시 TTL을 설정하는 데코레이터 — 핸들러 또는 컨트롤러에 적용
 * Decorator to set cache TTL — apply to handler or controller
 *
 * @param seconds 캐시 유효 시간 (초) / Cache validity in seconds
 */
export const CacheTTL = (seconds: number) =>
  SetMetadata(CACHE_TTL_KEY, seconds);

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class TtlCacheInterceptor implements NestInterceptor {
  private cache = new Map<string, CacheEntry>();
  constructor(private readonly reflector: Reflector) {
    // 60초마다 만료된 캐시 항목 정리 / Clean expired entries every 60 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt <= now) this.cache.delete(key);
      }
    }, 60_000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ttl = this.reflector.getAllAndOverride<number | undefined>(
      CACHE_TTL_KEY,
      [context.getHandler(), context.getClass()],
    );

    // TTL 미설정 시 캐시 바이패스 / Bypass cache if no TTL set
    if (!ttl) return next.handle();

    const request = context.switchToHttp().getRequest();
    // GET 요청만 캐시 / Only cache GET requests
    if (request.method !== 'GET') return next.handle();

    const key = `${request.url}`;
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > now) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        this.cache.set(key, { data, expiresAt: now + ttl * 1000 });
      }),
    );
  }
}
