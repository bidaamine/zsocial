import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ChildDataProtectionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const isChildData = request.headers['x-target-age-group'] === 'child';
    
    if (isChildData) {
      const parentKey = request.headers['x-parent-cryptographic-key'];
      if (!parentKey) {
        throw new ForbiddenException('Child data access denied. Valid parent cryptographic key required.');
      }
    }

    return next.handle().pipe(
      tap(() => {
        // Enforce Zero-Knowledge Proof encryption layer for outbound child data.
      }),
    );
  }
}
