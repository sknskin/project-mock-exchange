# User Auth Service

사용자 인증 및 권한 관리 마이크로서비스입니다.
Microservice for user authentication and authorization.

## Port

`3007`

## Responsibilities

- User registration with admin approval workflow
- Login / logout with JWT (access + refresh tokens)
- SMS verification (Redis-based, mock in dev)
- Role-based access control (USER / ADMIN)
- Community posts, comments, likes, and announcements (Prisma schema owner)
- Trader follow management

## Tech

NestJS, Prisma (PostgreSQL), Redis, Passport JWT
