# Market Data Service

실시간 시세 시뮬레이션 및 차트 데이터 제공 마이크로서비스입니다.
Microservice for real-time price simulation and chart data.

## Port

`3001`

## Responsibilities

- Simulate real-time prices for 200+ symbols (stocks & crypto)
- Generate and serve candlestick (OHLCV) data
- Publish `price.updated` events to Kafka
- Provide order book depth data

## Tech

NestJS, Prisma (PostgreSQL), Redis, Kafka
