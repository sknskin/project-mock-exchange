-- ===========================================
-- Mock Exchange - PostgreSQL Initialization
-- ===========================================
-- Creates separate databases for each service (Database per Service pattern)

-- User/Auth Service database
CREATE DATABASE mex_auth;

-- Order Engine database (Event Store + Read Models)
CREATE DATABASE mex_orders;

-- Portfolio Service database
CREATE DATABASE mex_portfolio;

-- Market Data Service database
CREATE DATABASE mex_market;

-- Notification Service database
CREATE DATABASE mex_notification;

-- Chat Service database
CREATE DATABASE mex_chat;

-- Enable UUID extension on all databases
\c mex_auth
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c mex_orders
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c mex_portfolio
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c mex_market
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c mex_notification
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c mex_chat
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
