"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const stream_manager_service_1 = require("./stream-manager.service");
describe('StreamManagerService', () => {
    let service;
    beforeEach(async () => {
        const mod = await testing_1.Test.createTestingModule({
            providers: [stream_manager_service_1.StreamManagerService]
        }).compile();
        service = mod.get(stream_manager_service_1.StreamManagerService);
    });
    it('should format message correctly', () => {
        const msg = service.formatMessage('alerts', { a: 1 });
        expect(msg.topic).toBe('alerts');
        expect(msg.data.a).toBe(1);
        expect(msg.timestamp).toBeDefined();
    });
});
