import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"

# 1. apps/api/src/rate-limiter.guard.spec.ts
spec_path = os.path.join(base_dir, "apps/api/src/rate-limiter.guard.spec.ts")
if os.path.exists(spec_path):
    with open(spec_path, "w") as f:
        f.write("""import { RateLimiterGuard } from './rate-limiter.guard';

describe('RateLimiterGuard', () => {
  it('should be defined', () => {
    expect(new RateLimiterGuard({} as any)).toBeDefined();
  });
});
""")

# 2. services/platform-services/media-file-service/src/media.controller.ts
media_ctrl_path = os.path.join(base_dir, "services/platform-services/media-file-service/src/media.controller.ts")
if os.path.exists(media_ctrl_path):
    with open(media_ctrl_path, "w") as f:
        f.write("""import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { StorageProviderService } from './storage-provider.service';
import { MediaAccessGuard } from './media-access.guard';

@Controller('media')
export class MediaController {
  constructor(private readonly storage: StorageProviderService) {}

  @Post('upload-url')
  @UseGuards(MediaAccessGuard)
  async getUploadUrl(@Body('filename') filename: string) {
    return { url: await this.storage.generateUploadUrl(filename) };
  }

  @Get('download-url/:fileId')
  @UseGuards(MediaAccessGuard)
  async getDownloadUrl(@Param('fileId') fileId: string) {
    return { url: await this.storage.generateDownloadUrl(fileId) };
  }
}
""")

# 3. services/platform-services/media-file-service/src/storage-provider.service.spec.ts
media_spec_path = os.path.join(base_dir, "services/platform-services/media-file-service/src/storage-provider.service.spec.ts")
if os.path.exists(media_spec_path):
    with open(media_spec_path, "w") as f:
        f.write("""import { Test, TestingModule } from '@nestjs/testing';
import { StorageProviderService } from './storage-provider.service';
import { MinioService } from '@nexus/core-infra';

describe('StorageProviderService', () => {
  let service: StorageProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageProviderService,
        { provide: MinioService, useValue: {} }
      ],
    }).compile();

    service = module.get<StorageProviderService>(StorageProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
""")

# 4. services/platform-services/notification-service/package.json
ns_pkg_path = os.path.join(base_dir, "services/platform-services/notification-service/package.json")
if os.path.exists(ns_pkg_path):
    with open(ns_pkg_path, "r") as f:
        ns_pkg = json.load(f)
    if "@nestjs/microservices" not in ns_pkg.get("dependencies", {}):
        ns_pkg["dependencies"]["@nestjs/microservices"] = "^11.1.27"
    with open(ns_pkg_path, "w") as f:
        json.dump(ns_pkg, f, indent=2)

# 5. services/platform-services/notification-service/src/notification.controller.ts
ns_ctrl_path = os.path.join(base_dir, "services/platform-services/notification-service/src/notification.controller.ts")
if os.path.exists(ns_ctrl_path):
    with open(ns_ctrl_path, "w") as f:
        f.write("""import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Controller('notify')
export class NotificationController {
  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  @EventPattern('dispatch_notification')
  async handleNotification(@Payload() data: { userId: string, channel: 'email' | 'push', payload: any }) {
    return this.dispatcher.dispatch(data.userId, data.channel, data.payload);
  }
}
""")

print("Fixes applied.")
