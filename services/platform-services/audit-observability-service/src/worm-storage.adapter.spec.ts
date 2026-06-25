import { Test } from '@nestjs/testing';
import { WormStorageAdapter } from './worm-storage.adapter';
import { BadRequestException } from '@nestjs/common';

describe('WormStorageAdapter', () => {
  let adapter: WormStorageAdapter;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [WormStorageAdapter]
    }).compile();
    adapter = mod.get(WormStorageAdapter);
  });

  it('should write once successfully', () => {
    const rec = adapter.writeOnce('1', { a: 1 });
    expect(rec.a).toBe(1);
    expect(rec.timestamp).toBeDefined();
  });

  it('should throw if writing twice', () => {
    adapter.writeOnce('1', { a: 1 });
    expect(() => adapter.writeOnce('1', { a: 2 })).toThrow(BadRequestException);
  });
});
