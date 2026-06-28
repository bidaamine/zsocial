import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConnection } from './entities/user-connection.entity';
import { Neo4jService } from '@nexus/core-infra';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    @InjectRepository(UserConnection)
    private readonly connectionRepo: Repository<UserConnection>,
    private readonly neo4jService: Neo4jService,
  ) {}

  async sendConnectionRequest(requesterId: string, receiverId: string): Promise<UserConnection> {
    if (requesterId === receiverId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    this.logger.log(`Sending connection request from ${requesterId} to ${receiverId}`);
    
    let connection = await this.connectionRepo.findOne({
      where: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    });

    if (connection) {
      throw new BadRequestException(`Connection or request already exists with status: ${connection.status}`);
    }

    connection = this.connectionRepo.create({
      requesterId,
      receiverId,
      status: 'pending',
    });
    const saved = await this.connectionRepo.save(connection);

    // Sync to Neo4j
    await this.runCypher(
      `MERGE (u1:User {id: $reqId})
       MERGE (u2:User {id: $recId})
       MERGE (u1)-[:PENDING]->(u2)`,
      { reqId: requesterId, recId: receiverId }
    );

    return saved;
  }

  async acceptConnectionRequest(receiverId: string, requesterId: string): Promise<UserConnection> {
    this.logger.log(`Accepting connection request from ${requesterId} for receiver ${receiverId}`);

    const connection = await this.connectionRepo.findOne({
      where: { requesterId, receiverId, status: 'pending' },
    });

    if (!connection) {
      throw new BadRequestException('Pending connection request not found');
    }

    connection.status = 'accepted';
    const saved = await this.connectionRepo.save(connection);

    // Sync to Neo4j
    await this.runCypher(
      `MATCH (u1:User {id: $reqId})-[r:PENDING]->(u2:User {id: $recId})
       DELETE r
       MERGE (u1)-[:CONNECTED]-(u2)`,
      { reqId: requesterId, recId: receiverId }
    );

    return saved;
  }

  async blockUserConnection(userId: string, targetId: string): Promise<UserConnection> {
    this.logger.log(`User ${userId} is blocking user ${targetId}`);

    let connection = await this.connectionRepo.findOne({
      where: [
        { requesterId: userId, receiverId: targetId },
        { requesterId: targetId, receiverId: userId },
      ],
    });

    if (!connection) {
      connection = this.connectionRepo.create({
        requesterId: userId,
        receiverId: targetId,
      });
    }

    connection.status = 'blocked';
    const saved = await this.connectionRepo.save(connection);

    // Sync to Neo4j
    await this.runCypher(
      `MERGE (u1:User {id: $uId})
       MERGE (u2:User {id: $tId})
       WITH u1, u2
       MATCH (u1)-[r]-(u2)
       DELETE r
       WITH u1, u2
       MERGE (u1)-[:BLOCKED]->(u2)`,
      { uId: userId, tId: targetId }
    );

    return saved;
  }

  async getMutualConnections(userId1: string, userId2: string): Promise<string[]> {
    this.logger.log(`Retrieving mutual connections between ${userId1} and ${userId2}`);
    
    const result = await this.runCypher(
      `MATCH (u1:User {id: $u1Id})-[:CONNECTED]-(mutual:User)-[:CONNECTED]-(u2:User {id: $u2Id})
       RETURN mutual.id as id`,
      { u1Id: userId1, u2Id: userId2 }
    );

    if (!result) return [];
    return result.records.map((record: any) => record.get('id'));
  }

  async getRecommendations(userId: string): Promise<{ id: string; strength: number }[]> {
    this.logger.log(`Retrieving recommendations (friends of friends) for user ${userId}`);

    const result = await this.runCypher(
      `MATCH (u:User {id: $userId})-[:CONNECTED]-(f:User)-[:CONNECTED]-(fof:User)
       WHERE NOT (u)-[:CONNECTED]-(fof) AND u <> fof
       RETURN fof.id as id, count(f) as strength
       ORDER BY strength DESC LIMIT 10`,
      { userId }
    );

    if (!result) return [];
    return result.records.map((record: any) => ({
      id: record.get('id'),
      strength: record.get('strength').toNumber ? record.get('strength').toNumber() : record.get('strength'),
    }));
  }

  async deleteConnection(userId: string, targetId: string): Promise<void> {
    this.logger.log(`Pruning connection between ${userId} and ${targetId}`);
    
    await this.connectionRepo.delete([
      { requesterId: userId, receiverId: targetId },
      { requesterId: targetId, receiverId: userId },
    ]);

    await this.runCypher(
      `MATCH (u1:User {id: $uId})-[r]-(u2:User {id: $tId})
       DELETE r`,
      { uId: userId, tId: targetId }
    );
  }

  async getUserConnections(userId: string): Promise<string[]> {
    const connections = await this.connectionRepo.find({
      where: [
        { requesterId: userId, status: 'accepted' },
        { receiverId: userId, status: 'accepted' },
      ],
    });
    return connections.map(conn => conn.requesterId === userId ? conn.receiverId : conn.requesterId);
  }

  async deleteUserData(userId: string): Promise<void> {
    this.logger.log(`GDPR Cascade: Wiping social graph details for user ${userId}`);
    
    await this.connectionRepo.delete({ requesterId: userId });
    await this.connectionRepo.delete({ receiverId: userId });

    await this.runCypher(
      `MATCH (u:User {id: $userId})
       DETACH DELETE u`,
      { userId }
    );
  }

  private async runCypher(query: string, params: Record<string, any>): Promise<any> {
    try {
      const session = this.neo4jService.getWriteSession();
      const result = await session.run(query, params);
      await session.close();
      return result;
    } catch (err: any) {
      this.logger.warn(`Neo4j session warning (graph DB might be offline or unseeded): ${err.message}`);
      return null;
    }
  }
}
