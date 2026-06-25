import { Module, DynamicModule, Global } from '@nestjs/common';
import { ClientsModule, Transport, KafkaOptions } from '@nestjs/microservices';

@Global()
@Module({})
export class KafkaModule {
  /**
   * Initialize a Kafka Client.
   * @param name The injection token name for the Kafka Client
   * @param brokers Array of broker URLs, e.g. ['localhost:9092']
   * @param clientId The Kafka client ID
   */
  static registerClient(name: string, brokers: string[], clientId: string): DynamicModule {
    return {
      module: KafkaModule,
      imports: [
        ClientsModule.register([
          {
            name,
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId,
                brokers,
              },
              consumer: {
                groupId: `${clientId}-group`,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
