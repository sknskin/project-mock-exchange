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

/** Circuit Breaker 상태
 * Circuit Breaker state per service */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

/** Circuit Breaker 설정값
 * Circuit Breaker configuration */
const CIRCUIT_BREAKER_THRESHOLD = 5;       // 연속 실패 횟수 (consecutive failures to open)
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000; // 쿨다운 시간 30초 (cooldown before half-open retry)

/**
 * I-H-01: 서비스별 기본 타임아웃 설정 (밀리초).
 * 시세 조회처럼 빠른 응답이 필요한 서비스는 짧은 타임아웃을,
 * 주문 처리나 AI처럼 느릴 수 있는 서비스는 긴 타임아웃을 적용합니다.
 *
 * I-H-01: Default timeouts per service (milliseconds).
 * Fast-response services like market-data get shorter timeouts,
 * while potentially slow services like order-engine and ai-service get longer ones.
 */
const SERVICE_TIMEOUTS: Record<string, number> = {
  'market-data': 3000,     // 시세 조회는 빠른 응답 필요 / Market data needs fast response
  'user-auth': 5000,       // 인증 기본값 / Auth default
  'order-engine': 10000,   // 주문 처리는 DB 트랜잭션 포함 / Order processing includes DB transactions
  'portfolio': 5000,       // 포트폴리오 조회 / Portfolio queries
  'notification': 5000,    // 알림 발송 / Notification delivery
  'chat': 5000,            // 채팅 / Chat
  'ai-service': 30000,     // AI 응답은 LLM 호출로 느릴 수 있음 / AI responses may be slow due to LLM calls
};

/** I-H-01: 기본 타임아웃 (서비스별 설정이 없을 때 사용)
 * I-H-01: Default timeout when no service-specific setting exists */
const DEFAULT_TIMEOUT_MS = 5000;

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly clients: Map<string, AxiosInstance> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initClients();
  }

  /**
   * 각 마이크로서비스에 대한 Axios 클라이언트를 초기화합니다.
   * x-internal-token 헤더로 서비스 간 인증을 수행합니다.
   *
   * Initialize Axios clients for each microservice.
   * Uses x-internal-token header for inter-service authentication.
   */
  private initClients() {
    const internalToken = this.configService.getOrThrow<string>('INTERNAL_SERVICE_SECRET');
    const host = this.configService.getOrThrow<string>('SERVICE_HOST');
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
      // I-H-01: 서비스별 타임아웃 적용 — 환경 변수로 오버라이드 가능
      // I-H-01: Apply per-service timeout — overridable via environment variable
      const envTimeout = this.configService.get<number>(`PROXY_TIMEOUT_${name.toUpperCase().replace(/-/g, '_')}`);
      const timeout = envTimeout || SERVICE_TIMEOUTS[name] || DEFAULT_TIMEOUT_MS;
      this.clients.set(
        name,
        axios.create({
          baseURL,
          timeout,
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': internalToken,
          },
        }),
      );
    }
  }

  /**
   * 대상 마이크로서비스로 HTTP 요청을 전달하고 응답을 반환합니다.
   * I-H-01: 선택적 timeoutMs 파라미터로 요청별 타임아웃을 오버라이드할 수 있습니다.
   *
   * Forwards HTTP request to target microservice and returns response.
   * I-H-01: Optional timeoutMs parameter allows per-request timeout override.
   */
  async forward(
    service: string,
    config: AxiosRequestConfig,
    /** I-H-01: 요청별 타임아웃 오버라이드 (밀리초) / Per-request timeout override (ms) */
    timeoutMs?: number,
  ): Promise<{ status: number; data: unknown; headers?: Record<string, string> }> {
    const client = this.clients.get(service);
    if (!client) {
      this.logger.error(`Unknown service requested: ${service}`);
      throw new BadGatewayException('An internal error occurred. Please try again later.');
    }

    // Circuit Breaker 검사 / Check circuit breaker before forwarding
    this.checkCircuitBreaker(service);

    // 요청 ID 다운스트림 전파 (Forward request-id to downstream services)
    const reqId = (config.headers as Record<string, string>)?.['x-request-id'];
    if (reqId) {
      config.headers = { ...config.headers, 'x-request-id': reqId };
    }

    // I-H-01: 요청별 타임아웃이 지정되면 config에 적용 / Apply per-request timeout if specified
    if (timeoutMs) {
      config.timeout = timeoutMs;
    }

    try {
      const response = await client.request(config);
      // 5xx 응답은 서비스 장애로 간주 — Circuit Breaker에 실패 기록
      // Treat 5xx responses as service failures — record in circuit breaker
      if (response.status >= 500) {
        this.recordFailure(service);
      } else {
        this.recordSuccess(service);
      }
      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // 5xx 응답은 서비스 장애로 기록, 4xx는 정상 응답으로 처리
          // Record 5xx as failure, treat 4xx as normal response
          if (error.response.status >= 500) {
            this.recordFailure(service);
          } else {
            this.recordSuccess(service);
          }
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
          // 클라이언트에 내부 서비스명 노출 방지 — 일반적인 메시지 반환 (M-11)
          // Prevent leaking internal service names to clients — return generic message
          throw new ServiceUnavailableException('Upstream service is temporarily unavailable. Please try again later.');
        }
      }
      this.recordFailure(service);
      this.logger.error(`Proxy error to ${service} [${config.method} ${config.url}]: ${error instanceof Error ? error.message : 'unknown'}`);
      throw new BadGatewayException('An internal error occurred. Please try again later.');
    }
  }

  // ---- Circuit Breaker 헬퍼 / Circuit Breaker helpers ----

  /** 서비스별 Circuit Breaker 상태를 조회하거나 초기화
   * Get or initialize circuit breaker state for a service */
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
    // 클라이언트에 내부 서비스명/구현 상세 노출 방지 (M-11)
    // Prevent leaking internal service names/implementation details to clients
    throw new ServiceUnavailableException(
      'Service is temporarily unavailable. Please try again later.',
    );
  }

  /** 서비스 실패를 기록하고 임계값 초과 시 Circuit Breaker 오픈
   * Record failure and open circuit breaker if threshold exceeded */
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

  /** 서비스 성공을 기록하고 Circuit Breaker를 리셋
   * Record success and reset circuit breaker */
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
