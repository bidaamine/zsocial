import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamManagerService } from './stream-manager.service';
export declare class LiveUpdatesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private streamManager;
    server: Server;
    private readonly logger;
    constructor(streamManager: StreamManagerService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribe(data: {
        topic: string;
    }, client: Socket): {
        event: string;
        data: {
            topic: string;
            timestamp: string;
            data: any;
        };
    };
    handleUnsubscribe(data: {
        topic: string;
    }, client: Socket): {
        event: string;
        data: {
            topic: string;
        };
    };
    broadcastToTopic(topic: string, eventName: string, payload: any): void;
}
//# sourceMappingURL=live-updates.gateway.d.ts.map