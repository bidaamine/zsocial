import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ZkpService } from './zkp.service';
export declare class ChildDataProtectionInterceptor implements NestInterceptor {
    private readonly zkpService;
    constructor(zkpService: ZkpService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private traverseAndEncrypt;
    private traverseAndDecrypt;
}
//# sourceMappingURL=child-data-protection.interceptor.d.ts.map