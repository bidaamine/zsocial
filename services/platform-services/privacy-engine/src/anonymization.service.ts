import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnonymizationService {
  private readonly logger = new Logger(AnonymizationService.name);

  // List of keys that contain PII and should be removed completely
  private readonly piiKeys = new Set(['name', 'email', 'phone', 'address', 'ssn', 'ip_address', 'location']);

  /**
   * Applies anonymization to a JSON payload. Removes PII completely and
   * adds differential privacy noise to numeric metrics (e.g., heart rate, salary).
   */
  anonymizePayload(payload: any, epsilon: number = 0.5): any {
    this.logger.log(`Anonymizing payload with epsilon=${epsilon}`);
    return this.traverseAndAnonymize(payload, epsilon);
  }

  private traverseAndAnonymize(obj: any, epsilon: number): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.traverseAndAnonymize(item, epsilon));
    }

    const anonymized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // 1. Strip PII keys
      if (this.piiKeys.has(lowerKey) || lowerKey.includes('name') || lowerKey.includes('email')) {
        continue; // Completely remove this key from the dataset
      }

      // 2. Apply differential privacy to numeric values
      if (typeof value === 'number') {
        anonymized[key] = value + this.generateLaplaceNoise(1 / epsilon);
      } 
      // 3. Recurse for nested objects
      else if (typeof value === 'object') {
        anonymized[key] = this.traverseAndAnonymize(value, epsilon);
      } 
      // 4. Keep other non-PII primitives
      else {
        anonymized[key] = value;
      }
    }
    return anonymized;
  }

  private generateLaplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}
