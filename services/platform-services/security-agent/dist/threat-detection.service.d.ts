import { RedisService } from '@nexus/core-infra';
export interface RequestHistory {
    ip: string;
    lat: number;
    lon: number;
    timestamp: number;
}
export declare class ThreatDetectionService {
    private readonly redisService;
    private readonly logger;
    constructor(redisService: RedisService);
    assessRisk(ip: string, action: string, userId: string): Promise<number>;
    private getIpCoordinates;
    private calculateDistance;
    private deg2rad;
}
//# sourceMappingURL=threat-detection.service.d.ts.map