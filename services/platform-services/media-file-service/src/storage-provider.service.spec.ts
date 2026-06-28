import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorageProviderService } from './storage-provider.service';
import { MinioService } from '@nexus/core-infra';
import { MediaRecord } from './entities/media-record.entity';
import { ForbiddenException } from '@nestjs/common';
import { Readable } from 'stream';

describe('StorageProviderService', () => {
  let service: StorageProviderService;
  let minioMock: any;
  let mediaDb: Record<string, MediaRecord>;
  let mockS3Response: any;

  beforeEach(async () => {
    mediaDb = {};
    mockS3Response = {
      Body: Readable.from(['standard-file-contents']),
    };

    minioMock = {
      getPresignedUploadUrl: jest.fn().mockResolvedValue('http://upload-url'),
      getPresignedDownloadUrl: jest.fn().mockResolvedValue('http://download-url'),
      getClient: jest.fn().mockReturnValue({
        send: jest.fn().mockImplementation((command) => {
          if (command.constructor.name === 'GetObjectCommand' || command.input?.Key) {
            return Promise.resolve(mockS3Response);
          }
          return Promise.resolve({});
        }),
      }),
    };

    const mediaRepositoryMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((record) => {
        mediaDb[record.id] = record;
        return Promise.resolve(record);
      }),
      findOne: jest.fn().mockImplementation(({ where: { id } }) => Promise.resolve(mediaDb[id] || null)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageProviderService,
        { provide: MinioService, useValue: minioMock },
        { provide: getRepositoryToken(MediaRecord), useValue: mediaRepositoryMock },
        { provide: 'MINIO_BUCKET', useValue: 'nexus-media' },
      ],
    }).compile();

    service = module.get<StorageProviderService>(StorageProviderService);
  });

  it('should generate an upload url and save pending record', async () => {
    const res = await service.generateUploadUrl('avatar.png', 'user-1');
    expect(res.fileId).toBeDefined();
    expect(res.url).toBe('http://upload-url');
    expect(mediaDb[res.fileId]).toBeDefined();
    expect(mediaDb[res.fileId]?.status).toBe('pending_upload');
  });

  it('should throw ForbiddenException if user does not own the file on download request', async () => {
    const res = await service.generateUploadUrl('avatar.png', 'user-1');
    await expect(service.generateDownloadUrl(res.fileId, 'different-user')).rejects.toThrow(ForbiddenException);
  });

  it('should process uploaded file and mark it clean if no EICAR signature', async () => {
    const res = await service.generateUploadUrl('avatar.png', 'user-1');
    const record = await service.processUploadedFile(res.fileId);
    expect(record.status).toBe('clean');
    expect(record.mimeType).toBe('image/png');
  });

  it('should process and quarantine file if it contains EICAR malware signature', async () => {
    const res = await service.generateUploadUrl('malware.txt', 'user-1');
    
    // Inject EICAR signature in stream response
    mockS3Response = {
      Body: Readable.from(['X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*']),
    };

    const record = await service.processUploadedFile(res.fileId);
    expect(record.status).toBe('quarantined');
    expect(record.size).toBe(0);

    // Attempting to download quarantined file should throw ForbiddenException
    await expect(service.generateDownloadUrl(res.fileId, 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('should parse MP4 duration correctly from container box atoms', async () => {
    // Construct a mock MP4 buffer containing a 'moov' atom and an 'mvhd' sub-atom
    const mockMp4 = Buffer.alloc(40);
    mockMp4.writeUInt32BE(40, 0); // size of moov
    mockMp4.write('moov', 4);
    mockMp4.writeUInt32BE(32, 8); // size of mvhd
    mockMp4.write('mvhd', 12);
    mockMp4.writeUInt8(0, 16); // version 0
    mockMp4.writeUInt32BE(1000, 28); // timescale = 1000
    mockMp4.writeUInt32BE(5000, 32); // duration = 5000

    const duration = (service as any).parseMp4Duration(mockMp4);
    expect(duration).toBe(5);
  });
});
