# Order Engine Service

주문 접수 및 매칭 엔진 마이크로서비스입니다.
Microservice for order intake and matching engine.

## Port

`3002`

## Responsibilities

- Accept market and limit orders
- Match orders using price-time priority algorithm
- Publish `order.events` and `trade.events` to Kafka
- Manage open order book per symbol

## Tech

NestJS, Prisma (PostgreSQL), Redis, Kafka
