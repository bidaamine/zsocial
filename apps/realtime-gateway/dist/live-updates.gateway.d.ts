import { Server } from 'socket.io';
import { StreamManagerService } from './stream-manager.service';
export declare class LiveUpdatesGateway {
    private streamManager;
    server: Server;
    constructor(streamManager: StreamManagerService);
    handleSubscribe(data: {
        topic: string;
    }): {
        event: string;
        data: {
            topic: string;
            timestamp: string;
            data: any;
        };
    };
}
//# sourceMappingURL=live-updates.gateway.d.ts.map