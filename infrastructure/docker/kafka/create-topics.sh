#!/bin/bash
# ===========================================
# Mock Exchange - Kafka Topic Creation
# ===========================================

KAFKA_BIN="/opt/kafka/bin"
BOOTSTRAP="localhost:9092"

echo "Waiting for Kafka to be ready..."
sleep 5

echo "Creating Kafka topics..."

# Market Data topics
$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic market.prices.updated \
  --partitions 10 --replication-factor 1

# Order topics
$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic orders.commands \
  --partitions 10 --replication-factor 1

$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic orders.events \
  --partitions 10 --replication-factor 1

# Trade topics
$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic trades.executed \
  --partitions 10 --replication-factor 1

# Portfolio topics
$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic portfolio.events \
  --partitions 10 --replication-factor 1

# Notification topics
$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic notifications.commands \
  --partitions 5 --replication-factor 1

# Chat topics
$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic chat.messages \
  --partitions 5 --replication-factor 1

# AI topics
$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic ai.jobs \
  --partitions 3 --replication-factor 1

$KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
  --bootstrap-server $BOOTSTRAP \
  --topic ai.results \
  --partitions 3 --replication-factor 1

# Dead Letter Queue topics
for topic in orders.events portfolio.events notifications.commands chat.messages; do
  $KAFKA_BIN/kafka-topics.sh --create --if-not-exists \
    --bootstrap-server $BOOTSTRAP \
    --topic "dlq.${topic}" \
    --partitions 1 --replication-factor 1
done

echo "All topics created successfully!"
$KAFKA_BIN/kafka-topics.sh --list --bootstrap-server $BOOTSTRAP
