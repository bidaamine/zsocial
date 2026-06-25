import { Module, DynamicModule, Global } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Global()
@Module({})
export class PostgresModule {
  static forRoot(options: TypeOrmModuleOptions): DynamicModule {
    return {
      module: PostgresModule,
      imports: [TypeOrmModule.forRoot(options)],
      exports: [TypeOrmModule],
    };
  }
}
