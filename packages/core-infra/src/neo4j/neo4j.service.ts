import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session, SessionMode } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  getDriver(): Driver {
    return this.driver;
  }

  getReadSession(database?: string): Session {
    return this.driver.session({
      database: database || 'neo4j',
      defaultAccessMode: neo4j.session.READ,
    });
  }

  getWriteSession(database?: string): Session {
    return this.driver.session({
      database: database || 'neo4j',
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  async onModuleDestroy() {
    await this.driver.close();
  }
}
