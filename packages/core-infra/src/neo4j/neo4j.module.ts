import { Module, DynamicModule, Global } from '@nestjs/common';
import neo4j, { Config } from 'neo4j-driver';
import { Neo4jService } from './neo4j.service';

export interface Neo4jModuleOptions {
  uri: string;
  username?: string;
  password?: string;
  config?: Config;
}

@Global()
@Module({})
export class Neo4jModule {
  static forRoot(options: Neo4jModuleOptions): DynamicModule {
    const driverProvider = {
      provide: 'NEO4J_DRIVER',
      useFactory: () => {
        let auth;
        if (options.username && options.password) {
          auth = neo4j.auth.basic(options.username, options.password);
        }
        return neo4j.driver(options.uri, auth, options.config);
      },
    };

    return {
      module: Neo4jModule,
      providers: [driverProvider, Neo4jService],
      exports: [Neo4jService, 'NEO4J_DRIVER'],
    };
  }
}
