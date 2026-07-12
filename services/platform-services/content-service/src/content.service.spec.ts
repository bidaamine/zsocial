import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContentService } from './content.service';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ContentService', () => {
  let service: ContentService;
  let postRepoMock: any;
  let commentRepoMock: any;
  let likeRepoMock: any;

  let postsDb: Record<string, Post> = {};
  let commentsDb: Record<string, Comment> = {};
  let likesDb: Record<string, Like> = {};

  beforeEach(async () => {
    postsDb = {};
    commentsDb = {};
    likesDb = {};

    postRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({
        id: 'post-uuid-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...dto,
      })),
      save: jest.fn().mockImplementation((post) => {
        postsDb[post.id] = post;
        return Promise.resolve(post);
      }),
      findOne: jest.fn().mockImplementation(({ where: { id } }) => {
        return Promise.resolve(postsDb[id] || null);
      }),
      find: jest.fn().mockImplementation(({ order }) => {
        return Promise.resolve(Object.values(postsDb).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      }),
      remove: jest.fn().mockImplementation((post) => {
        delete postsDb[post.id];
        return Promise.resolve(post);
      }),
      delete: jest.fn().mockImplementation(({ authorId }) => {
        for (const [id, post] of Object.entries(postsDb)) {
          if (post.authorId === authorId) delete postsDb[id];
        }
        return Promise.resolve({ affected: 1 });
      }),
    };

    commentRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({
        id: 'comment-uuid-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        ...dto,
      })),
      save: jest.fn().mockImplementation((comment) => {
        commentsDb[comment.id] = comment;
        return Promise.resolve(comment);
      }),
      findOne: jest.fn().mockImplementation(({ where: { id } }) => {
        return Promise.resolve(commentsDb[id] || null);
      }),
      find: jest.fn().mockImplementation(({ where: { postId } }) => {
        return Promise.resolve(Object.values(commentsDb).filter(c => c.postId === postId));
      }),
      remove: jest.fn().mockImplementation((comment) => {
        delete commentsDb[comment.id];
        return Promise.resolve(comment);
      }),
      delete: jest.fn().mockImplementation(({ postId, authorId }) => {
        for (const [id, comment] of Object.entries(commentsDb)) {
          if (comment.postId === postId || comment.authorId === authorId) delete commentsDb[id];
        }
        return Promise.resolve({ affected: 1 });
      }),
    };

    likeRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({
        id: 'like-uuid-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        ...dto,
      })),
      save: jest.fn().mockImplementation((like) => {
        likesDb[like.id] = like;
        return Promise.resolve(like);
      }),
      findOne: jest.fn().mockImplementation(({ where: { postId, userId } }) => {
        const found = Object.values(likesDb).find(l => l.postId === postId && l.userId === userId);
        return Promise.resolve(found || null);
      }),
      remove: jest.fn().mockImplementation((like) => {
        delete likesDb[like.id];
        return Promise.resolve(like);
      }),
      delete: jest.fn().mockImplementation(({ postId, userId }) => {
        for (const [id, like] of Object.entries(likesDb)) {
          if (like.postId === postId || like.userId === userId) delete likesDb[id];
        }
        return Promise.resolve({ affected: 1 });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: getRepositoryToken(Post), useValue: postRepoMock },
        { provide: getRepositoryToken(Comment), useValue: commentRepoMock },
        { provide: getRepositoryToken(Like), useValue: likeRepoMock },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  it('should create and save a post', async () => {
    const post = await service.createPost('user1', 'Hello Title', 'Hello Content', ['tag1']);
    expect(post.id).toBeDefined();
    expect(post.authorId).toBe('user1');
    expect(post.title).toBe('Hello Title');
    expect(post.type).toBe('post'); // defaults to short-form post
  });

  it('should support article type and list an author\'s content', async () => {
    const article = await service.createPost('user1', 'My Article', 'Long form body', [], 'article');
    expect(article.type).toBe('article');

    await service.createPost('user1', 'A status', 'short body');

    const authored = await service.listPostsByAuthor('user1');
    expect(authored.length).toBe(2);
  });

  it('should update a post if owner', async () => {
    const post = await service.createPost('user1', 'Original Title', 'Original Content');
    const updated = await service.updatePost(post.id, 'user1', 'Updated Title');
    expect(updated.title).toBe('Updated Title');
  });

  it('should throw ForbiddenException if updating post of another user', async () => {
    const post = await service.createPost('user1', 'Original Title', 'Original Content');
    await expect(service.updatePost(post.id, 'user2', 'Updated Title')).rejects.toThrow(ForbiddenException);
  });

  it('should add comment and retrieve list', async () => {
    const post = await service.createPost('user1', 'Post Title', 'Post Content');
    const comment = await service.addComment(post.id, 'user2', 'This is a comment');
    expect(comment.id).toBeDefined();

    const comments = await service.getComments(post.id);
    expect(comments.length).toBe(1);
    expect(comments[0]?.content).toBe('This is a comment');
  });

  it('should toggle likes on a post', async () => {
    const post = await service.createPost('user1', 'Post Title', 'Post Content');
    const res1 = await service.toggleLike(post.id, 'user2');
    expect(res1.liked).toBe(true);

    const res2 = await service.toggleLike(post.id, 'user2');
    expect(res2.liked).toBe(false);
  });

  it('should wipe user data on GDPR requests', async () => {
    const post = await service.createPost('user1', 'Title', 'Content');
    await service.addComment(post.id, 'user2', 'comment');
    await service.toggleLike(post.id, 'user2');

    await service.deleteUserData('user2');

    // Likes and comments of user2 should be cleared
    expect(Object.keys(commentsDb).length).toBe(0);
    expect(Object.keys(likesDb).length).toBe(0);
  });
});
