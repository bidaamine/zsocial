import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AnonymizationService {
  private readonly logger = new Logger(AnonymizationService.name);

  applyDifferentialPrivacy(data: number[], epsilon: number): number[] {
    this.logger.log(`Applying differential privacy with epsilon=${epsilon}`);
    // Simplified Laplacian noise addition
    return data.map(value => {
        const noise = this.generateLaplaceNoise(1 / epsilon);
        return value + noise;
    });
  }

  private generateLaplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}
