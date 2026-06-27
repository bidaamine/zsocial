"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const microservices_1 = require("@nestjs/microservices");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Configure hybrid application to listen to Kafka events
    app.connectMicroservice({
        transport: microservices_1.Transport.KAFKA,
        options: {
            client: {
                brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
            },
            consumer: {
                groupId: 'privacy-engine-group',
            },
        },
    });
    await app.startAllMicroservices();
    await app.listen(5100);
    console.log(`privacy-engine is running in hybrid mode on: ${await app.getUrl()}`);
}
bootstrap();
