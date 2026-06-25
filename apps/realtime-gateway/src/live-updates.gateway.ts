import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { StreamManagerService } from './stream-manager.service';

@WebSocketGateway({ cors: true })
export class LiveUpdatesGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private streamManager: StreamManagerService) {}

  @SubscribeMessage('subscribe_topic')
  handleSubscribe(@MessageBody() data: { topic: string }) {
    // In real app, socket joins room
    const msg = this.streamManager.formatMessage(data.topic, { status: 'subscribed' });
    return { event: 'subscription_success', data: msg };
  }
}
