import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamManagerService } from './stream-manager.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class LiveUpdatesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  
  private readonly logger = new Logger(LiveUpdatesGateway.name);

  constructor(private streamManager: StreamManagerService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_topic')
  handleSubscribe(@MessageBody() data: { topic: string }, @ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} subscribing to topic ${data.topic}`);
    client.join(data.topic);
    const msg = this.streamManager.formatMessage(data.topic, { status: 'subscribed' });
    return { event: 'subscription_success', data: msg };
  }

  @SubscribeMessage('unsubscribe_topic')
  handleUnsubscribe(@MessageBody() data: { topic: string }, @ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} unsubscribing from topic ${data.topic}`);
    client.leave(data.topic);
    return { event: 'unsubscription_success', data: { topic: data.topic } };
  }

  // Called by Kafka consumer to broadcast
  broadcastToTopic(topic: string, eventName: string, payload: any) {
    this.logger.log(`Broadcasting to ${topic}: ${eventName}`);
    this.server.to(topic).emit(eventName, payload);
  }
}
