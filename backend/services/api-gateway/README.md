# API Gateway

프론트엔드 요청을 각 백엔드 서비스로 라우팅하는 게이트웨이입니다.
Gateway that routes frontend requests to backend microservices.

## Port

`3000`

## Responsibilities

- HTTP reverse proxy to all backend services
- WebSocket connection management (real-time prices, chat)
- Swagger API documentation (`/api-docs`)
- Health check endpoints (`/health/live`)
- Rate limiting and request validation

## Tech

NestJS, Redis, Kafka
