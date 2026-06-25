import { Module, DynamicModule, Global } from '@nestjs/common';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { MinioService } from './minio.service';

export interface MinioModuleOptions {
  config: S3ClientConfig;
  bucket: string;
}

@Global()
@Module({})
export class MinioModule {
  static forRoot(options: MinioModuleOptions): DynamicModule {
    const clientProvider = {
      provide: 'MINIO_CLIENT',
      useFactory: () => new S3Client(options.config),
    };

    const bucketProvider = {
      provide: 'MINIO_BUCKET',
      useValue: options.bucket,
    };

    return {
      module: MinioModule,
      providers: [clientProvider, bucketProvider, MinioService],
      exports: [MinioService, 'MINIO_CLIENT', 'MINIO_BUCKET'],
    };
  }
}
