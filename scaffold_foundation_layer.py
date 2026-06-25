import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"
apps_dir = os.path.join(base_dir, "apps")
services_dir = os.path.join(base_dir, "services", "platform-services")
infra_dir = os.path.join(base_dir, "infra", "local")

services_to_create = [
    {
        "name": "bff-gateway",
        "pkg_name": "@nexus/bff-gateway",
        "port": 4001,
        "path": os.path.join(apps_dir, "bff-gateway")
    },
    {
        "name": "realtime-gateway",
        "pkg_name": "@nexus/realtime-gateway",
        "port": 4002,
        "path": os.path.join(apps_dir, "realtime-gateway")
    },
    {
        "name": "notification-service",
        "pkg_name": "@nexus/notification-service",
        "port": 4105,
        "path": os.path.join(services_dir, "notification-service")
    },
    {
        "name": "media-file-service",
        "pkg_name": "@nexus/media-file-service",
        "port": 4107,
        "path": os.path.join(services_dir, "media-file-service")
    },
    {
        "name": "audit-observability-service",
        "pkg_name": "@nexus/audit-observability-service",
        "port": 4109,
        "path": os.path.join(services_dir, "audit-observability-service")
    }
]

def generate_package_json(pkg_name):
    return {
      "name": pkg_name,
      "version": "0.1.0",
      "private": True,
      "scripts": {
        "build": "nest build",
        "format": 'prettier --write "src/**/*.ts"',
        "start": "nest start",
        "dev": "nest start --watch",
        "start:debug": "nest start --debug --watch",
        "start:prod": "node dist/main",
        "lint": 'eslint "{src,apps,libs,test}/**/*.ts" --fix',
        "test": "jest"
      },
      "dependencies": {
        "@nestjs/common": "^10.0.0",
        "@nestjs/core": "^10.0.0",
        "@nestjs/platform-express": "^10.0.0",
        "reflect-metadata": "^0.2.0",
        "rxjs": "^7.8.1",
        "@nexus/shared-types": "workspace:*",
        "@nexus/api-contracts": "workspace:*"
      },
      "devDependencies": {
        "@nestjs/cli": "^10.0.0",
        "@nestjs/schematics": "^10.0.0",
        "@types/express": "^4.17.17",
        "@types/node": "^20.3.1",
        "typescript": "^5.1.3",
        "@nexus/tsconfig": "workspace:*",
        "@nexus/eslint-config": "workspace:*"
      },
      "jest": {
        "moduleFileExtensions": ["js", "json", "ts"],
        "rootDir": "src",
        "testRegex": ".*\\\\.spec\\\\.ts$",
        "transform": {
          "^.+\\\\.(t|j)s$": "ts-jest"
        },
        "collectCoverageFrom": ["**/*.(t|j)s"],
        "coverageDirectory": "../coverage",
        "testEnvironment": "node"
      }
    }

def generate_tsconfig():
    return {
      "extends": "@nexus/tsconfig/tsconfig.json",
      "compilerOptions": {
        "outDir": "./dist",
        "baseUrl": "./"
      },
      "include": ["src/**/*"]
    }

def generate_nest_cli():
    return {
      "$schema": "https://json.schemastore.org/nest-cli",
      "collection": "@nestjs/schematics",
      "sourceRoot": "src",
      "compilerOptions": {
        "deleteOutDir": True
      }
    }

def generate_main_ts(port):
    return f"""import {{ NestFactory }} from '@nestjs/core';
import {{ AppModule }} from './app.module';

async function bootstrap() {{
  const app = await NestFactory.create(AppModule);
  await app.listen({port});
  console.log(`Application is running on: ${{await app.getUrl()}}`);
}}
bootstrap();
"""

def generate_app_module():
    return """import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
"""

for srv in services_to_create:
    path = srv["path"]
    os.makedirs(os.path.join(path, "src"), exist_ok=True)
    
    with open(os.path.join(path, "package.json"), "w") as f:
        json.dump(generate_package_json(srv["pkg_name"]), f, indent=2)
        
    with open(os.path.join(path, "tsconfig.json"), "w") as f:
        json.dump(generate_tsconfig(), f, indent=2)
        
    with open(os.path.join(path, "nest-cli.json"), "w") as f:
        json.dump(generate_nest_cli(), f, indent=2)
        
    with open(os.path.join(path, "src", "main.ts"), "w") as f:
        f.write(generate_main_ts(srv["port"]))
        
    with open(os.path.join(path, "src", "app.module.ts"), "w") as f:
        f.write(generate_app_module())

# Generate docker-compose
os.makedirs(infra_dir, exist_ok=True)
docker_compose = """version: '3.8'

services:
  nexus_postgresql:
    image: postgres:15
    container_name: nexus_postgresql
    environment:
      POSTGRES_USER: nexus
      POSTGRES_PASSWORD: password
      POSTGRES_DB: nexus_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nexus_redis_cache:
    image: redis:7
    container_name: nexus_redis_cache
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nexus_neo4j_graph_db:
    image: neo4j:5
    container_name: nexus_neo4j_graph_db
    environment:
      NEO4J_AUTH: neo4j/password
    ports:
      - "7474:7474" # HTTP
      - "7687:7687" # Bolt
    volumes:
      - neo4j_data:/data

  nexus_zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: nexus_zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  nexus_kafka_event_stream:
    image: confluentinc/cp-kafka:7.4.0
    container_name: nexus_kafka_event_stream
    depends_on:
      - nexus_zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: nexus_zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

volumes:
  postgres_data:
  redis_data:
  neo4j_data:
"""

with open(os.path.join(infra_dir, "docker-compose.yml"), "w") as f:
    f.write(docker_compose)

print("Scaffolded all services and infrastructure!")
