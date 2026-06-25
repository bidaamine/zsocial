import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial\packages\core-infra"

# 1. Update package.json
pkg_path = os.path.join(base_dir, "package.json")
with open(pkg_path, "r") as f:
    pkg = json.load(f)

pkg["dependencies"]["@nestjs/typeorm"] = "^11.0.0"
pkg["dependencies"]["typeorm"] = "^0.3.20"
pkg["dependencies"]["pg"] = "^8.13.3"
pkg["dependencies"]["neo4j-driver"] = "^5.28.0"
pkg["dependencies"]["@aws-sdk/client-s3"] = "^3.758.0"
pkg["dependencies"]["@aws-sdk/s3-request-presigner"] = "^3.758.0"

with open(pkg_path, "w") as f:
    json.dump(pkg, f, indent=2)

# Create folders
os.makedirs(os.path.join(base_dir, "src", "postgres"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "src", "neo4j"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "src", "minio"), exist_ok=True)

# 2. src/postgres/postgres.module.ts
postgres_mod = """import { Module, DynamicModule, Global } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Global()
@Module({})
export class PostgresModule {
  static forRoot(options: TypeOrmModuleOptions): DynamicModule {
    return {
      module: PostgresModule,
      imports: [TypeOrmModule.forRoot(options)],
      exports: [TypeOrmModule],
    };
  }
}
"""
with open(os.path.join(base_dir, "src", "postgres", "postgres.module.ts"), "w") as f:
    f.write(postgres_mod)

# 3. src/neo4j/neo4j.service.ts
neo4j_svc = """import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session, SessionMode } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  getDriver(): Driver {
    return this.driver;
  }

  getReadSession(database?: string): Session {
    return this.driver.session({
      database: database || 'neo4j',
      defaultAccessMode: neo4j.session.READ,
    });
  }

  getWriteSession(database?: string): Session {
    return this.driver.session({
      database: database || 'neo4j',
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  async onModuleDestroy() {
    await this.driver.close();
  }
}
"""
with open(os.path.join(base_dir, "src", "neo4j", "neo4j.service.ts"), "w") as f:
    f.write(neo4j_svc)

# 4. src/neo4j/neo4j.module.ts
neo4j_mod = """import { Module, DynamicModule, Global } from '@nestjs/common';
import neo4j, { Config } from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

export interface Neo4jModuleOptions {
  uri: string;
  username?: string;
  password?: string;
  config?: Config;
}

@Global()
@Module({})
export class Neo4jModule {
  static forRoot(options: Neo4jModuleOptions): DynamicModule {
    const driverProvider = {
      provide: 'NEO4J_DRIVER',
      useFactory: () => {
        let auth;
        if (options.username && options.password) {
          auth = neo4j.auth.basic(options.username, options.password);
        }
        return neo4j.driver(options.uri, auth, options.config);
      },
    };

    return {
      module: Neo4jModule,
      providers: [driverProvider, Neo4jService],
      exports: [Neo4jService, 'NEO4J_DRIVER'],
    };
  }
}
"""
with open(os.path.join(base_dir, "src", "neo4j", "neo4j.module.ts"), "w") as f:
    f.write(neo4j_mod)

# 5. src/minio/minio.service.ts
minio_svc = """import { Injectable, Inject } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MinioService {
  constructor(
    @Inject('MINIO_CLIENT') private readonly s3Client: S3Client,
    @Inject('MINIO_BUCKET') private readonly bucket: string,
  ) {}

  getClient(): S3Client {
    return this.s3Client;
  }

  async getPresignedUploadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
"""
with open(os.path.join(base_dir, "src", "minio", "minio.service.ts"), "w") as f:
    f.write(minio_svc)

# 6. src/minio/minio.module.ts
minio_mod = """import { Module, DynamicModule, Global } from '@nestjs/common';
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
"""
with open(os.path.join(base_dir, "src", "minio", "minio.module.ts"), "w") as f:
    f.write(minio_mod)

# 7. Update index.ts
with open(os.path.join(base_dir, "src", "index.ts"), "a") as f:
    f.write("export * from './postgres/postgres.module';\\n")
    f.write("export * from './neo4j/neo4j.module';\\n")
    f.write("export * from './neo4j/neo4j.service';\\n")
    f.write("export * from './minio/minio.module';\\n")
    f.write("export * from './minio/minio.service';\\n")

print("Created Postgres, Neo4j, and Minio modules successfully.")
