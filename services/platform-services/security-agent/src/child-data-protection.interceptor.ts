import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ZkpService } from './zkp.service';

@Injectable()
export class ChildDataProtectionInterceptor implements NestInterceptor {
  constructor(private readonly zkpService: ZkpService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const isChildData = request.headers['x-target-age-group'] === 'child';
    const parentKey = request.headers['x-parent-cryptographic-key'];
    
    if (isChildData) {
      if (!parentKey || parentKey.length !== 64) {
        throw new ForbiddenException('Child data access denied. Valid 32-byte parent cryptographic key (64 hex characters) required.');
      }

      // Inbound Request Encryption
      if (request.body && typeof request.body === 'object') {
        request.body = this.traverseAndEncrypt(request.body, parentKey);
      }
    }

    return next.handle().pipe(
      map(data => {
        // Outbound Response Decryption
        if (isChildData && data && parentKey) {
          return this.traverseAndDecrypt(data, parentKey);
        }
        return data;
      }),
    );
  }

  private traverseAndEncrypt(obj: any, parentKey: string): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.traverseAndEncrypt(item, parentKey));
    }

    const sensitiveFields = new Set(['bio', 'name', 'address']);
    const encrypted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.has(lowerKey) && typeof value === 'string') {
        try {
          encrypted[key] = this.zkpService.encryptChildData(value, parentKey);
        } catch (err) {
          encrypted[key] = value;
        }
      } else if (typeof value === 'object') {
        encrypted[key] = this.traverseAndEncrypt(value, parentKey);
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  private traverseAndDecrypt(obj: any, parentKey: string): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.traverseAndDecrypt(item, parentKey));
    }

    // Detect if this object itself is an encrypted GCM payload
    if ('ciphertext' in obj && 'iv' in obj && 'authTag' in obj) {
      try {
        return this.zkpService.decryptChildData(obj, parentKey);
      } catch (err) {
        // Fallback to original block if decryption fails (e.g. wrong key)
        return obj;
      }
    }

    const decrypted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      decrypted[key] = this.traverseAndDecrypt(value, parentKey);
    }
    return decrypted;
  }
}
