import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ContentService } from './content.service';
import { ZeroTrustGuard } from './zero-trust.guard';

/**
 * Dedicated feed controller so the feed lives at a clean `/feed` path.
 * (Previously the feed was hacked onto the posts controller as `@Get('../feed')`,
 * which does not resolve to `/feed` in NestJS.)
 */
@Controller('feed')
export class FeedController {
  constructor(private readonly contentService: ContentService) {}

  @UseGuards(ZeroTrustGuard)
  @Get()
  async getFeed(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const token = req.headers.authorization;
    return this.contentService.generateFeed(
      req.user.sub,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
      token,
    );
  }
}
