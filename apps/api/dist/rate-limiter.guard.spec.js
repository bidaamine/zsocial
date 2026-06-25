"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rate_limiter_guard_1 = require("./rate-limiter.guard");
describe('RateLimiterGuard', () => {
    it('should be defined', () => {
        expect(new rate_limiter_guard_1.RateLimiterGuard({})).toBeDefined();
    });
});
