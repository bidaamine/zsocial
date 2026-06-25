"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayRouterService = void 0;
const common_1 = require("@nestjs/common");
let GatewayRouterService = class GatewayRouterService {
    routeRequest(path) {
        if (path.startsWith('/auth'))
            return 'http://auth-service:4003';
        if (path.startsWith('/media'))
            return 'http://media-file-service:4107';
        if (path.startsWith('/notify'))
            return 'http://notification-service:4105';
        throw new common_1.HttpException('Service not found', common_1.HttpStatus.NOT_FOUND);
    }
};
exports.GatewayRouterService = GatewayRouterService;
exports.GatewayRouterService = GatewayRouterService = __decorate([
    (0, common_1.Injectable)()
], GatewayRouterService);
