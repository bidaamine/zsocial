import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

@Injectable()
export class CascadingWipeService {
  private readonly logger = new Logger(CascadingWipeService.name);

  private readonly backupsDir = process.env.GDPR_BACKUPS_DIR || './backups';
  private readonly datalakeDir = process.env.GDPR_DATALAKE_DIR || './datalake';
  private readonly modelsDir = process.env.GDPR_MODELS_DIR || './models';

  async purgeAllBackups(userId: string): Promise<number> {
    this.logger.log(`Beginning backup database purge for user: ${userId}`);
    let purgedFiles = 0;

    try {
      await fs.mkdir(this.backupsDir, { recursive: true });
      const files = await fs.readdir(this.backupsDir);

      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.txt')) {
          const filePath = path.join(this.backupsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          if (content.includes(userId)) {
            const lines = content.split('\n');
            const cleanedLines = lines.filter(line => !line.includes(userId));
            await fs.writeFile(filePath, cleanedLines.join('\n'), 'utf8');
            this.logger.log(`Successfully purged user references from backup: ${file}`);
            purgedFiles++;
          }
        }
      }
    } catch (e: any) {
      this.logger.error(`Error purging backups: ${e.message}`);
    }
    return purgedFiles;
  }

  async purgeDataLake(userId: string): Promise<number> {
    this.logger.log(`Beginning Data Lake log purge for user: ${userId}`);
    let purgedRecords = 0;

    try {
      await fs.mkdir(this.datalakeDir, { recursive: true });
      const files = await fs.readdir(this.datalakeDir);

      for (const file of files) {
        if (file.endsWith('.csv') || file.endsWith('.json')) {
          const filePath = path.join(this.datalakeDir, file);

          if (file.endsWith('.json')) {
            try {
              const content = await fs.readFile(filePath, 'utf8');
              const data = JSON.parse(content);
              if (Array.isArray(data)) {
                const originalLength = data.length;
                const filtered = data.filter((row: any) => row.userId !== userId && row.id !== userId);
                if (filtered.length < originalLength) {
                  await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), 'utf8');
                  purgedRecords += (originalLength - filtered.length);
                  this.logger.log(`Purged ${originalLength - filtered.length} records from data lake: ${file}`);
                }
              }
            } catch (e: any) {
              this.logger.warn(`Failed to parse json datalake file ${file}: ${e.message}`);
            }
          } else if (file.endsWith('.csv')) {
            const content = await fs.readFile(filePath, 'utf8');
            if (content.includes(userId)) {
              const lines = content.split('\n');
              const cleanedLines = lines.filter(line => !line.includes(userId));
              await fs.writeFile(filePath, cleanedLines.join('\n'), 'utf8');
              purgedRecords++;
              this.logger.log(`Purged user rows from CSV data lake file: ${file}`);
            }
          }
        }
      }
    } catch (e: any) {
      this.logger.error(`Error purging data lake: ${e.message}`);
    }
    return purgedRecords;
  }

  async purgeModelCheckpoints(userId: string): Promise<boolean> {
    this.logger.log(`Beginning AI model recommendation embedding purge for user: ${userId}`);
    const checkpointDir = path.join(this.modelsDir, 'recommendations');
    const checkpointPath = path.join(checkpointDir, 'embeddings.json');

    try {
      if (existsSync(checkpointPath)) {
        const content = await fs.readFile(checkpointPath, 'utf8');
        const embeddings = JSON.parse(content);
        if (embeddings && embeddings[userId]) {
          delete embeddings[userId];
          await fs.writeFile(checkpointPath, JSON.stringify(embeddings, null, 2), 'utf8');
          this.logger.log(`Successfully deleted user embedding vector from model checkpoint file.`);
          return true;
        }
      } else {
        this.logger.warn(`No active recommendation embeddings checkpoint file found at: ${checkpointPath}`);
      }
    } catch (e: any) {
      this.logger.error(`Failed to purge AI checkpoint: ${e.message}`);
    }
    return false;
  }
}
