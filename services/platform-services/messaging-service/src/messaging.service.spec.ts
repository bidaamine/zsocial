import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessagingService } from './messaging.service';
import { Message } from './entities/message.entity';
import { MessageDraft } from './entities/message-draft.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MessagingService', () => {
  let service: MessagingService;
  let messageRepoMock: any;
  let draftRepoMock: any;

  let messagesDb: Record<string, Message> = {};
  let draftsDb: Record<string, MessageDraft> = {};

  beforeEach(async () => {
    messagesDb = {};
    draftsDb = {};

    messageRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({
        id: 'msg-uuid-' + Math.random().toString(36).substr(2, 9),
        sentAt: new Date(),
        ...dto,
      })),
      save: jest.fn().mockImplementation((msg) => {
        messagesDb[msg.id] = msg;
        return Promise.resolve(msg);
      }),
      find: jest.fn().mockImplementation(() => {
        return Promise.resolve(Object.values(messagesDb));
      }),
      delete: jest.fn().mockImplementation(({ senderId, receiverId }) => {
        for (const [id, msg] of Object.entries(messagesDb)) {
          if (msg.senderId === senderId || msg.receiverId === receiverId) {
            delete messagesDb[id];
          }
        }
        return Promise.resolve({ affected: 1 });
      }),
    };

    draftRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({
        id: 'draft-uuid-' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        ...dto,
      })),
      save: jest.fn().mockImplementation((draft) => {
        draftsDb[draft.id] = draft;
        return Promise.resolve(draft);
      }),
      findOne: jest.fn().mockImplementation(({ where: { id } }) => {
        return Promise.resolve(draftsDb[id] || null);
      }),
      find: jest.fn().mockImplementation(({ where: { ownerId } }) => {
        return Promise.resolve(Object.values(draftsDb).filter(d => d.ownerId === ownerId));
      }),
      delete: jest.fn().mockImplementation(({ ownerId, recipientId }) => {
        for (const [id, draft] of Object.entries(draftsDb)) {
          if (draft.ownerId === ownerId || draft.recipientId === recipientId) {
            delete draftsDb[id];
          }
        }
        return Promise.resolve({ affected: 1 });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: getRepositoryToken(Message), useValue: messageRepoMock },
        { provide: getRepositoryToken(MessageDraft), useValue: draftRepoMock },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  it('should encrypt sent message and decrypt history correctly', async () => {
    const msg = await service.sendMessage('user1', 'user2', 'Super Secret Text');
    expect(msg.id).toBeDefined();
    expect(msg.encryptedBody).not.toBe('Super Secret Text');
    expect(msg.iv).toBeDefined();
    expect(msg.authTag).toBeDefined();

    const history = await service.getMessageHistory('user1', 'user2');
    expect(history.length).toBe(1);
    expect(history[0]?.body).toBe('Super Secret Text');
    expect(history[0]?.isLateNight).toBeDefined();
  });

  it('should leak no cleartext body or IV keys in metadata logs', async () => {
    await service.sendMessage('user1', 'user2', 'Secret Body text');
    
    const logs = await service.getMetadataLogs('user1');
    expect(logs.length).toBe(1);
    expect(logs[0]?.id).toBeDefined();
    expect(logs[0]?.body).toBeUndefined();
    expect(logs[0]?.iv).toBeUndefined();
    expect(logs[0]?.authTag).toBeUndefined();
    expect(logs[0]?.messageLength).toBe(16);
  });

  it('should create and retrieve AI twin drafts', async () => {
    const draft = await service.createDraft('user1', 'user2', 'Twin drafted response');
    expect(draft.id).toBeDefined();
    expect(draft.reviewedByOwner).toBe(false);

    const active = await service.getActiveDrafts('user1');
    expect(active.length).toBe(1);
    expect(active[0]?.draftedContent).toBe('Twin drafted response');
  });

  it('should allow sending approved drafts as real encrypted messages', async () => {
    const draft = await service.createDraft('user1', 'user2', 'Twin drafted content');
    const msg = await service.approveAndSendDraft(draft.id, 'user1');
    
    expect(msg.id).toBeDefined();
    expect(msg.senderId).toBe('user1');
    expect(msg.receiverId).toBe('user2');

    const history = await service.getMessageHistory('user1', 'user2');
    expect(history.length).toBe(1);
    expect(history[0]?.body).toBe('Twin drafted content');
  });

  it('should delete user messages and drafts on GDPR deletion requested', async () => {
    await service.sendMessage('user1', 'user2', 'Hello');
    await service.createDraft('user1', 'user2', 'Twin draft');

    await service.deleteUserData('user1');

    expect(Object.keys(messagesDb).length).toBe(0);
    expect(Object.keys(draftsDb).length).toBe(0);
  });
});
