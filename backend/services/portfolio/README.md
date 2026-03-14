# Portfolio Service

잔고 관리, 보유 자산 추적, 카피 트레이딩 마이크로서비스입니다.
Microservice for balance management, holdings tracking, and copy trading.

## Port

`3003`

## Responsibilities

- User balance (cash) management
- Holdings and position tracking
- P&L (profit and loss) calculation
- Copy trading configuration and execution
- Consume `trade.events` from Kafka and update portfolios

## Tech

NestJS, Prisma (PostgreSQL), Redis, Kafka
