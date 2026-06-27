"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LiveUpdatesGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveUpdatesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const stream_manager_service_1 = require("./stream-manager.service");
const common_1 = require("@nestjs/common");
let LiveUpdatesGateway = LiveUpdatesGateway_1 = class LiveUpdatesGateway {
    streamManager;
    server;
    logger = new common_1.Logger(LiveUpdatesGateway_1.name);
    constructor(streamManager) {
        this.streamManager = streamManager;
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleSubscribe(data, client) {
        this.logger.log(`Client ${client.id} subscribing to topic ${data.topic}`);
        client.join(data.topic);
        const msg = this.streamManager.formatMessage(data.topic, { status: 'subscribed' });
        return { event: 'subscription_success', data: msg };
    }
    handleUnsubscribe(data, client) {
        this.logger.log(`Client ${client.id} unsubscribing from topic ${data.topic}`);
        client.leave(data.topic);
        return { event: 'unsubscription_success', data: { topic: data.topic } };
    }
    // Called by Kafka consumer to broadcast
    broadcastToTopic(topic, eventName, payload) {
        this.logger.log(`Broadcasting to ${topic}: ${eventName}`);
        this.server.to(topic).emit(eventName, payload);
    }
};
exports.LiveUpdatesGateway = LiveUpdatesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], LiveUpdatesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe_topic'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], LiveUpdatesGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe_topic'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], LiveUpdatesGateway.prototype, "handleUnsubscribe", null);
exports.LiveUpdatesGateway = LiveUpdatesGateway = LiveUpdatesGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true }),
    __metadata("design:paramtypes", [stream_manager_service_1.StreamManagerService])
], LiveUpdatesGateway);
