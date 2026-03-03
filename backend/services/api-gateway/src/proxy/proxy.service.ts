/**
 * @file 프록시 서비스
 * @description Axios를 사용하여 내부 마이크로서비스로 HTTP 요청을 전달합니다.
 *              기본 Circuit Breaker 패턴을 포함합니다.
 *
 * @file Proxy Service
 * @description Forwards HTTP requests to internal microservices using Axios.
 *              Includes a basic Circuit Breaker pattern.
 */
import { Injectable, Logger, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/** Circuit Breaker 상태 / Circuit Breaker state per service */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

/** Circuit Breaker 설정값 / Circuit Breaker configuration */
const CIRCUIT_BREAKER_THRESHOLD = 5;       // 연속 실패 횟수 (consecutive failures to open)
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000; // 쿨다운 시간 30초 (cooldown before half-open retry)

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly clients: Map<string, AxiosInstance> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initClients();
  }

  private initClients() {
    const internalToken = this.configService.getOrThrow<string>('INTERNAL_SERVICE_SECRET');
    const host = this.configService.get<string>('SERVICE_HOST', 'localhost');
    const services = {
      'user-auth': `http://${host}:${this.configService.getOrThrow('USER_AUTH_PORT')}`,
      'market-data': `http://${host}:${this.configService.getOrThrow('MARKET_DATA_PORT')}`,
      'order-engine': `http://${host}:${this.configService.getOrThrow('ORDER_ENGINE_PORT')}`,
      portfolio: `http://${host}:${this.configService.getOrThrow('PORTFOLIO_PORT')}`,
      notification: `http://${host}:${this.configService.getOrThrow('NOTIFICATION_PORT')}`,
      chat: `http://${host}:${this.configService.getOrThrow('CHAT_PORT')}`,
      'ai-service': `http://${host}:${this.configService.getOrThrow('AI_SERVICE_PORT')}`,
    };

    for (const [name, baseURL] of Object.entries(services)) {
      this.clients.set(
        name,
        axios.create({
          baseURL,
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': internalToken,
          },
        }),
      );
    }
  }

  async forward(
    service: string,
    config: AxiosRequestConfig,
  ): Promise<{ status: number; data: unknown; headers?: Record<string, string> }> {
    const client = this.clients.get(service);
    if (!client) {
      throw new Error(`Unknown service: ${service}`);
    }

    // Circuit Breaker 검사 / Check circuit breaker before forwarding
    this.checkCircuitBreaker(service);

    // 요청 ID 다운스트림 전파 (Forward request-id to downstream services)
    const reqId = (config.headers as Record<string, string>)?.['x-request-id'];
    if (reqId) {
      config.headers = { ...config.headers, 'x-request-id': reqId };
    }

    try {
      const response = await client.request(config);
      // 성공 시 Circuit Breaker 리셋 / Reset circuit breaker on success
      this.recordSuccess(service);
      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // 서버가 응답을 반환한 경우 — 서비스 자체는 살아있으므로 Circuit Breaker 리셋
          // Server responded — service is alive, reset circuit breaker
          this.recordSuccess(service);
          return {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers as Record<string, string>,
          };
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          // 연결 실패 — Circuit Breaker에 실패 기록 / Connection failure — record in circuit breaker
          this.recordFailure(service);
          this.logger.error(`Service unavailable: ${service} (${error.code})`);
          throw new ServiceUnavailableException(`${service} service is unavailable`);
        }
      }
      this.recordFailure(service);
      this.logger.error(`Proxy error to ${service}: ${error instanceof Error ? error.message : 'unknown'}`);
      throw new BadGatewayException('Internal service error');
    }
  }

  // ---- Circuit Breaker 헬퍼 / Circuit Breaker helpers ----

  private getCircuitBreaker(service: string): CircuitBreakerState {
    let cb = this.circuitBreakers.get(service);
    if (!cb) {
      cb = { failures: 0, lastFailureTime: 0, isOpen: false };
      this.circuitBreakers.set(service, cb);
    }
    return cb;
  }

  /**
   * Circuit Breaker가 열려 있으면 즉시 실패합니다.
   * 쿨다운이 지나면 반개방(half-open) 상태로 요청 1건을 허용합니다.
   *
   * If the circuit is open, fail immediately.
   * After cooldown, allow one request through (half-open).
   */
  private checkCircuitBreaker(service: string): void {
    const cb = this.getCircuitBreaker(service);
    if (!cb.isOpen) return;

    const elapsed = Date.now() - cb.lastFailureTime;
    if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
      // 쿨다운 경과 — 반개방 상태로 전환하여 한 건 허용 / Cooldown elapsed — allow one request (half-open)
      this.logger.log(`Circuit breaker for ${service}: half-open, allowing probe request`);
      cb.isOpen = false;
      cb.failures = 0;
      return;
    }

    this.logger.warn(
      `Circuit breaker OPEN for ${service}: failing fast (${Math.ceil((CIRCUIT_BREAKER_COOLDOWN_MS - elapsed) / 1000)}s remaining)`,
    );
    throw new ServiceUnavailableException(
      `${service} service is temporarily unavailable (circuit breaker open)`,
    );
  }

  private recordFailure(service: string): void {
    const cb = this.getCircuitBreaker(service);
    cb.failures++;
    cb.lastFailureTime = Date.now();

    if (cb.failures >= CIRCUIT_BREAKER_THRESHOLD && !cb.isOpen) {
      cb.isOpen = true;
      this.logger.error(
        `Circuit breaker OPENED for ${service} after ${cb.failures} consecutive failures. ` +
        `Requests will be rejected for ${CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s.`,
      );
    }
  }

  private recordSuccess(service: string): void {
    const cb = this.getCircuitBreaker(service);
    if (cb.failures > 0 || cb.isOpen) {
      this.logger.log(`Circuit breaker for ${service}: reset (service recovered)`);
    }
    cb.failures = 0;
    cb.isOpen = false;
    cb.lastFailureTime = 0;
  }
}
