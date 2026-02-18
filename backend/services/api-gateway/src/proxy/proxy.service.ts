/**
 * @file 프록시 서비스
 * @description Axios를 사용하여 내부 마이크로서비스로 HTTP 요청을 전달합니다
 *
 * @file Proxy Service
 * @description Forwards HTTP requests to internal microservices using Axios
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly clients: Map<string, AxiosInstance> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initClients();
  }

  private initClients() {
    const services = {
      'user-auth': `http://localhost:${this.configService.get('USER_AUTH_PORT', 3007)}`,
      'market-data': `http://localhost:${this.configService.get('MARKET_DATA_PORT', 3001)}`,
      'order-engine': `http://localhost:${this.configService.get('ORDER_ENGINE_PORT', 3002)}`,
      portfolio: `http://localhost:${this.configService.get('PORTFOLIO_PORT', 3003)}`,
      notification: `http://localhost:${this.configService.get('NOTIFICATION_PORT', 3004)}`,
      chat: `http://localhost:${this.configService.get('CHAT_PORT', 3005)}`,
      'ai-service': `http://localhost:${this.configService.get('AI_SERVICE_PORT', 3006)}`,
    };

    for (const [name, baseURL] of Object.entries(services)) {
      this.clients.set(
        name,
        axios.create({
          baseURL,
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
  }

  async forward(
    service: string,
    config: AxiosRequestConfig,
  ): Promise<{ status: number; data: unknown }> {
    const client = this.clients.get(service);
    if (!client) {
      throw new Error(`Unknown service: ${service}`);
    }

    try {
      const response = await client.request(config);
      return { status: response.status, data: response.data };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return { status: error.response.status, data: error.response.data };
      }
      this.logger.error(`Proxy error to ${service}: ${error}`);
      throw error;
    }
  }
}
