"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const worm_storage_adapter_1 = require("./worm-storage.adapter");
const common_1 = require("@nestjs/common");
describe('WormStorageAdapter', () => {
    let adapter;
    beforeEach(async () => {
        const mod = await testing_1.Test.createTestingModule({
            providers: [worm_storage_adapter_1.WormStorageAdapter]
        }).compile();
        adapter = mod.get(worm_storage_adapter_1.WormStorageAdapter);
    });
    it('should write once successfully', () => {
        const rec = adapter.writeOnce('1', { a: 1 });
        expect(rec.a).toBe(1);
        expect(rec.timestamp).toBeDefined();
    });
    it('should throw if writing twice', () => {
        adapter.writeOnce('1', { a: 1 });
        expect(() => adapter.writeOnce('1', { a: 2 })).toThrow(common_1.BadRequestException);
    });
});
