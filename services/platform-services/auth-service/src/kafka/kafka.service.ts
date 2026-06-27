import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafkaClient: ClientKafka;

  constructor() {
    this.kafkaClient = new ClientKafka({
      client: {
        clientId: 'auth-service',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      },
      producer: {
        allowAutoTopicCreation: true,
      }
    });
  }

  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('Kafka Client Connected for Auth Events');
    } catch (err: any) {
      this.logger.warn(`Failed to connect to Kafka: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  publishEvent(topic: string, payload: any) {
    this.logger.log(`Publishing event to topic "${topic}": ${JSON.stringify(payload)}`);
    try {
      this.kafkaClient.emit(topic, payload);
    } catch (err: any) {
      this.logger.error(`Failed to publish event to topic "${topic}": ${err.message}`);
    }
  }
}
