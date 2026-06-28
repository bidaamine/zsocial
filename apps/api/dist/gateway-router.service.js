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
var GatewayRouterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayRouterService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let GatewayRouterService = GatewayRouterService_1 = class GatewayRouterService {
    httpService;
    logger = new common_1.Logger(GatewayRouterService_1.name);
    constructor(httpService) {
        this.httpService = httpService;
    }
    getTargetUrl(serviceName) {
        const registry = {
            'auth': process.env.AUTH_SERVICE_URL || 'http://localhost:4100',
            'media': process.env.MEDIA_SERVICE_URL || 'http://localhost:4107',
            'notify': process.env.NOTIFY_SERVICE_URL || 'http://localhost:4105',
            'profile': process.env.PROFILE_SERVICE_URL || 'http://localhost:4001',
            'family': process.env.FAMILY_SERVICE_URL || 'http://localhost:4002',
            'content': process.env.CONTENT_SERVICE_URL || 'http://localhost:4112',
            'messaging': process.env.MESSAGING_SERVICE_URL || 'http://localhost:4113',
        };
        return registry[serviceName];
    }
    async proxy(serviceName, req) {
        const targetBase = this.getTargetUrl(serviceName);
        if (!targetBase) {
            throw new common_1.HttpException('Service not found in Zero-Trust registry', common_1.HttpStatus.NOT_FOUND);
        }
        const targetPath = req.url.replace(`/api/route/${serviceName}`, '');
        const url = `${targetBase}${targetPath}`;
        this.logger.log(`Proxying request to ${url} for user ${req.user?.sub}`);
        try {
            const response = await (0, rxjs_1.lastValueFrom)(this.httpService.request({
                method: req.method,
                url,
                data: req.body,
                headers: {
                    ...req.headers,
                    host: undefined, // remove original host
                    'x-nexus-user-id': req.user?.sub,
                    'x-nexus-user-role': req.user?.role,
                },
            }));
            return response.data;
        }
        catch (err) {
            this.logger.error(`Proxy error to ${url}: ${err.message}`);
            throw new common_1.HttpException(err.response?.data || 'Downstream service error', err.response?.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.GatewayRouterService = GatewayRouterService;
exports.GatewayRouterService = GatewayRouterService = GatewayRouterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], GatewayRouterService);
