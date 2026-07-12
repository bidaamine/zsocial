import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || 'http://localhost:4106';

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
  ) {}

  async createPost(
    authorId: string,
    title: string,
    content: string,
    tags?: string[],
    type: 'post' | 'article' = 'post',
  ): Promise<Post> {
    this.logger.log(`Creating ${type} for user ${authorId}`);
    const post = this.postRepository.create({
      authorId,
      title,
      content,
      type: type === 'article' ? 'article' : 'post',
      tags: tags ? JSON.stringify(tags) : undefined,
    });
    return this.postRepository.save(post);
  }

  /**
   * Lists a single author's posts/articles (e.g. for a profile page), newest first,
   * optionally filtered by type. Paginated.
   */
  async listPostsByAuthor(
    authorId: string,
    limit = 20,
    offset = 0,
    type?: 'post' | 'article',
  ): Promise<Post[]> {
    const where: Record<string, unknown> = { authorId };
    if (type === 'post' || type === 'article') {
      where.type = type;
    }
    return this.postRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getPost(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async updatePost(id: string, authorId: string, title?: string, content?: string, tags?: string[]): Promise<Post> {
    this.logger.log(`Updating post ${id} by user ${authorId}`);
    const post = await this.getPost(id);

    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = JSON.stringify(tags);

    return this.postRepository.save(post);
  }

  async deletePost(id: string, authorId: string): Promise<void> {
    this.logger.log(`Deleting post ${id} by user ${authorId}`);
    const post = await this.getPost(id);

    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Cascade delete comments and likes manually to be safe
    await this.commentRepository.delete({ postId: id });
    await this.likeRepository.delete({ postId: id });
    await this.postRepository.remove(post);
  }

  async addComment(postId: string, authorId: string, content: string): Promise<Comment> {
    this.logger.log(`Adding comment to post ${postId} by user ${authorId}`);
    await this.getPost(postId); // Ensure post exists

    const comment = this.commentRepository.create({
      postId,
      authorId,
      content,
    });
    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: string, authorId: string): Promise<void> {
    this.logger.log(`Deleting comment ${commentId} by user ${authorId}`);
    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentRepository.remove(comment);
  }

  async getComments(postId: string): Promise<Comment[]> {
    await this.getPost(postId); // Ensure post exists
    return this.commentRepository.find({ where: { postId }, order: { createdAt: 'DESC' } });
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean }> {
    this.logger.log(`Toggling like on post ${postId} for user ${userId}`);
    await this.getPost(postId); // Ensure post exists

    const existing = await this.likeRepository.findOne({ where: { postId, userId } });
    if (existing) {
      await this.likeRepository.remove(existing);
      return { liked: false };
    } else {
      const like = this.likeRepository.create({ postId, userId });
      await this.likeRepository.save(like);
      return { liked: true };
    }
  }

  async generateFeed(userId: string, limit = 20, offset = 0, token?: string): Promise<Post[]> {
    this.logger.log(`Generating feed for user ${userId}`);

    let followingIds: string[] = [];
    if (token) {
      try {
        const response = await fetch(`${this.SOCIAL_SERVICE_URL}/social/connections`, {
          headers: {
            'Authorization': token,
          },
        });
        if (response.ok) {
          const data = await response.json();
          followingIds = data.connections || [];
        }
      } catch (e: any) {
        this.logger.warn(`Could not fetch user connections: ${e.message}`);
      }
    }

    // A real zsocial hybrid feed:
    // If following anyone, prioritize posts from them.
    // If none, or after those, pull newest global public posts.
    if (followingIds.length > 0) {
      return this.postRepository.find({
        where: [
          { authorId: In(followingIds) },
          { authorId: userId },
        ],
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });
    }

    // Global fallback feed
    return this.postRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async deleteUserData(userId: string): Promise<void> {
    this.logger.log(`GDPR Cascade: Purging all posts, comments, and likes for user ${userId}`);
    
    // Find all posts by this user to clean their likes/comments
    const userPosts = await this.postRepository.find({ where: { authorId: userId } });
    for (const post of userPosts) {
      await this.commentRepository.delete({ postId: post.id });
      await this.likeRepository.delete({ postId: post.id });
    }

    await this.postRepository.delete({ authorId: userId });
    await this.commentRepository.delete({ authorId: userId });
    await this.likeRepository.delete({ userId });
  }
}
