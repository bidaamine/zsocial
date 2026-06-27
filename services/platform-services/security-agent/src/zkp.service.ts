import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ZkpService {
  private readonly logger = new Logger(ZkpService.name);

  /**
   * Conceptually simulates a Zero-Knowledge Proof encryption.
   * In a real implementation, this would use a cryptographic library like snarkjs
   * to verify that the parent holds the key without the platform ever seeing the key.
   * Here we use symmetric AES-256-GCM to encrypt child data such that the platform
   * cannot read it without the parent's key.
   */
  encryptChildData(data: any, parentKeyHex: string): { ciphertext: string, iv: string, authTag: string } {
    this.logger.log('Encrypting child data with Zero-Knowledge Proof simulation');
    const iv = crypto.randomBytes(12);
    const key = Buffer.from(parentKeyHex, 'hex');
    
    if (key.length !== 32) {
      throw new Error('Parent key must be 32 bytes (64 hex characters) for AES-256');
    }

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag
    };
  }

  decryptChildData(encryptedPayload: { ciphertext: string, iv: string, authTag: string }, parentKeyHex: string): any {
    this.logger.log('Decrypting child data using parent key');
    const key = Buffer.from(parentKeyHex, 'hex');
    const iv = Buffer.from(encryptedPayload.iv, 'hex');
    const authTag = Buffer.from(encryptedPayload.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedPayload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
