export declare class AnonymizationService {
    private readonly logger;
    private readonly piiKeys;
    /**
     * Applies anonymization to a JSON payload. Removes PII completely and
     * adds differential privacy noise to numeric metrics (e.g., heart rate, salary).
     */
    anonymizePayload(payload: any, epsilon?: number): any;
    private traverseAndAnonymize;
    private generateLaplaceNoise;
}
//# sourceMappingURL=anonymization.service.d.ts.map