import { randomBytes } from 'crypto';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateId(prefix: string, length = 21): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix}_${id}`;
}

export function generateOrderId(): string {
  return generateId('ord');
}

export function generateTradeId(): string {
  return generateId('trd');
}

export function generateCorrelationId(): string {
  return generateId('corr');
}

export function generateEventId(): string {
  return generateId('evt');
}

export function generateSagaId(): string {
  return generateId('saga');
}
