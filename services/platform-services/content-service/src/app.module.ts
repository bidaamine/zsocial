import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentController } from './content.controller';
import { FeedController } from './feed.controller';
import { ContentService } from './content.service';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { ZeroTrustGuard } from './zero-trust.guard';
import { PostgresModule } from '@nexus/core-infra';

@Module({
  imports: [
    PostgresModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      username: 'nexus',
      password: 'password',
      database: 'nexus_db',
      autoLoadEntities: true,
      synchronize: true, // Dev-only
    }),
    TypeOrmModule.forFeature([Post, Comment, Like]),
  ],
  controllers: [ContentController, FeedController],
  providers: [
    ContentService,
    ZeroTrustGuard,
  ],
})
export class AppModule {}
