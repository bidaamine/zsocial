import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { MessageDraft } from './entities/message-draft.entity';
import * as crypto from 'crypto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  
  // Platform-held encryption key (32 bytes)
  private readonly encryptionKey = crypto.scryptSync(process.env.MSG_ENCRYPTION_SECRET || 'nexus-gcm-secret-key-1234567890', 'salt', 32);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageDraft)
    private readonly draftRepository: Repository<MessageDraft>,
  ) {}

  async sendMessage(senderId: string, receiverId: string, cleartextBody: string): Promise<Message> {
    this.logger.log(`Encrypting and sending message from ${senderId} to ${receiverId}`);

    // Encrypt using AES-256-GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(cleartextBody, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Calculate metadata
    const now = new Date();
    const currentHour = now.getHours();
    const isLateNight = currentHour >= 23 || currentHour < 5;
    const messageLength = cleartextBody.length;

    const message = this.messageRepository.create({
      senderId,
      receiverId,
      encryptedBody: encrypted,
      iv: iv.toString('hex'),
      authTag,
      isLateNight,
      messageLength,
    });

    const saved = await this.messageRepository.save(message);

    // Emitting simulated metadata signal to auditing logs
    this.logger.log(`Message metadata scanned: Length=${messageLength}, LateNight=${isLateNight}`);
    return saved;
  }

  async getMessageHistory(userId: string, targetUserId: string): Promise<any[]> {
    this.logger.log(`Retrieving messaging history between ${userId} and ${targetUserId}`);

    const messages = await this.messageRepository.find({
      where: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId },
      ],
      order: { sentAt: 'ASC' },
    });

    return messages.map((msg) => {
      let cleartextBody = '[Decryption Failed]';
      try {
        if (msg.iv && msg.authTag) {
          const ivBuffer = Buffer.from(msg.iv, 'hex');
          const authTagBuffer = Buffer.from(msg.authTag, 'hex');
          const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, ivBuffer);
          decipher.setAuthTag(authTagBuffer);
          
          let decrypted = decipher.update(msg.encryptedBody, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          cleartextBody = decrypted;
        }
      } catch (err: any) {
        this.logger.error(`Decryption error for message ${msg.id}: ${err.message}`);
      }

      return {
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        body: cleartextBody,
        sentAt: msg.sentAt,
        readAt: msg.readAt,
        isLateNight: msg.isLateNight,
        messageLength: msg.messageLength,
      };
    });
  }

  async getMetadataLogs(userId: string): Promise<any[]> {
    this.logger.log(`Fetching message pattern metadata logs for threat/safeguarding analysis on user: ${userId}`);
    
    // Fetch recent messages metadata only (no iv, authTag, or body included!)
    const messages = await this.messageRepository.find({
      where: [
        { senderId: userId },
        { receiverId: userId },
      ],
      order: { sentAt: 'DESC' },
      take: 50,
    });

    return messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      sentAt: msg.sentAt,
      isLateNight: msg.isLateNight,
      messageLength: msg.messageLength,
    }));
  }

  // --- AI Digital Twin Capabilities ---

  private readonly aiRouterUrl = process.env.AI_MODEL_ROUTER_URL || 'http://localhost:4703';

  /**
   * AI Digital Twin drafting. The `intent` is the sender's notes / desired gist; the
   * twin expands it into a polished message by calling the ai-model-router service,
   * which routes to a real LLM (or a simulated model when no provider keys are set).
   *
   * Resilient by design: if the router is unreachable, the raw intent is stored as the
   * draft with aiGenerated=false and a low confidence, so the feature degrades
   * gracefully instead of failing. `confidenceScore` here is only a caller-supplied
   * floor used for the degraded path; the AI path derives confidence from the routing
   * outcome instead of trusting a client-provided value.
   */
  async createDraft(ownerId: string, recipientId: string, intent: string, confidenceScore = 0.3): Promise<MessageDraft> {
    this.logger.log(`AI Digital Twin is drafting message on behalf of user ${ownerId} to recipient ${recipientId}`);

    let draftedContent = intent;
    let aiGenerated = false;
    let confidence = confidenceScore;

    const ai = await this.generateDraftViaRouter(ownerId, intent);
    if (ai) {
      draftedContent = ai.text;
      aiGenerated = true;
      // Real signal: a draft produced only after the router failed over to a backup
      // model is marked slightly less confident than a clean primary-model draft.
      confidence = ai.fallbackTriggered ? 0.7 : 0.9;
    } else {
      this.logger.warn(
        `AI model router unavailable; storing raw intent as draft for user ${ownerId} (aiGenerated=false).`,
      );
    }

    const draft = this.draftRepository.create({
      ownerId,
      recipientId,
      draftedContent,
      confidenceScore: confidence,
      aiGenerated,
      reviewedByOwner: false,
    });
    return this.draftRepository.save(draft);
  }

  /**
   * Calls ai-model-router /route to draft a message. Returns null on any failure so
   * the caller can fall back. Uses an AbortController timeout so a hung router never
   * blocks the request path.
   */
  private async generateDraftViaRouter(
    userId: string,
    intent: string,
  ): Promise<{ text: string; fallbackTriggered: boolean } | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const prompt =
        'You are an AI digital twin drafting a short, friendly direct message on behalf of a user. ' +
        'Reply with ONLY the message body — no preamble, no surrounding quotes. ' +
        `The sender's intent / notes: "${intent}"`;

      const res = await fetch(`${this.aiRouterUrl}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          task_type: 'generation',
          latency_priority: 'balanced',
          privacy_sensitivity: 'sensitive',
          cost_envelope: 'low_cost',
          domain: 'general',
          user_id: userId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`ai-model-router responded HTTP ${res.status}`);
      }

      const data: any = await res.json();
      const text = (data?.response_text || '').trim();
      if (!text) {
        throw new Error('ai-model-router returned an empty response');
      }
      return { text, fallbackTriggered: !!data?.fallback_triggered };
    } catch (err: any) {
      this.logger.warn(`AI draft generation via model-router failed: ${err.message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async getActiveDrafts(ownerId: string): Promise<MessageDraft[]> {
    return this.draftRepository.find({
      where: { ownerId, reviewedByOwner: false, sentAt: undefined },
      order: { createdAt: 'DESC' },
    });
  }

  async approveAndSendDraft(draftId: string, ownerId: string): Promise<Message> {
    this.logger.log(`Owner ${ownerId} approved AI drafted message ${draftId}`);
    
    const draft = await this.draftRepository.findOne({ where: { id: draftId } });
    if (!draft) {
      throw new NotFoundException(`Message draft ${draftId} not found`);
    }

    if (draft.ownerId !== ownerId) {
      throw new ForbiddenException('You can only approve drafts created on your behalf');
    }

    draft.reviewedByOwner = true;
    draft.sentAt = new Date();
    await this.draftRepository.save(draft);

    // Send the draft as a real message
    return this.sendMessage(draft.ownerId, draft.recipientId, draft.draftedContent);
  }

  async deleteUserData(userId: string): Promise<void> {
    this.logger.log(`GDPR Cascade Deletion: Purging all messages and drafts for user ${userId}`);
    await this.messageRepository.delete({ senderId: userId });
    await this.messageRepository.delete({ receiverId: userId });
    await this.draftRepository.delete({ ownerId: userId });
    await this.draftRepository.delete({ recipientId: userId });
  }
}
