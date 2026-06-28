import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DeletionJob } from './entities/deletion-job.entity';
import { CascadingWipeService } from './cascading-wipe.service';
export declare class DeletionQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly deletionJobRepository;
    private readonly cascadingWipeService;
    private readonly logger;
    private kafkaClient;
    constructor(deletionJobRepository: Repository<DeletionJob>, cascadingWipeService: CascadingWipeService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getJobStatus(jobId: string): Promise<DeletionJob | null>;
    registerDeletionRequest(userId: string): Promise<string>;
    handleServiceDeletionCompleted(jobId: string, serviceName: string): Promise<void>;
}
//# sourceMappingURL=deletion-queue.service.d.ts.map