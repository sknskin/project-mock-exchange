# Notification Service

알림 처리 마이크로서비스입니다.
Microservice for notification delivery.

## Port

`3004`

## Responsibilities

- In-app notifications (order fills, price alerts)
- Email notification dispatch
- Price alert monitoring and triggering
- Consume events from Kafka for automated notifications

## Tech

NestJS, Redis, Kafka
