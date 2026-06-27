import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class KeysService {
  private readonly logger = new Logger(KeysService.name);
  private publicKey: string;
  private privateKey: string;

  private readonly keysDir = path.join(process.cwd(), 'secrets');
  private readonly publicKeyPath = path.join(this.keysDir, 'public.pem');
  private readonly privateKeyPath = path.join(this.keysDir, 'private.pem');

  constructor() {
    this.ensureKeysExist();
  }

  private ensureKeysExist() {
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true });
    }

    if (fs.existsSync(this.publicKeyPath) && fs.existsSync(this.privateKeyPath)) {
      this.publicKey = fs.readFileSync(this.publicKeyPath, 'utf8');
      this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
      this.logger.log('Loaded asymmetric keys from secure storage');
    } else {
      this.logger.log('No keys found. Generating new asymmetric key pair...');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      this.publicKey = publicKey;
      this.privateKey = privateKey;

      fs.writeFileSync(this.publicKeyPath, publicKey, { mode: 0o600 });
      fs.writeFileSync(this.privateKeyPath, privateKey, { mode: 0o600 });
      this.logger.log('New asymmetric keys generated and stored safely');
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getPrivateKey(): string {
    return this.privateKey;
  }
}
