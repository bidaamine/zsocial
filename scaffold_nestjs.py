import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"

def scaffold_nestjs_app(app_path, name, port, is_api_gateway=False):
    os.makedirs(os.path.join(app_path, "src"), exist_ok=True)
    
    # package.json
    pkg = {
      "name": f"@nexus/{name}",
      "version": "0.1.0",
      "private": True,
      "scripts": {
        "build": "nest build",
        "format": 'prettier --write "src/**/*.ts"',
        "start": "nest start",
        "dev": "nest start --watch",
        "start:debug": "nest start --debug --watch",
        "start:prod": "node dist/main",
        "lint": 'eslint "{src,apps,libs,test}/**/*.ts" --fix'
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
      }
    }
    with open(os.path.join(app_path, "package.json"), "w") as f:
        json.dump(pkg, f, indent=2)

    # tsconfig.json
    tsconfig = {
      "extends": "@nexus/tsconfig/base.json",
      "compilerOptions": {
        "outDir": "./dist",
        "baseUrl": "./",
        "experimentalDecorators": True,
        "emitDecoratorMetadata": True
      },
      "exclude": ["node_modules", "dist"]
    }
    with open(os.path.join(app_path, "tsconfig.json"), "w") as f:
        json.dump(tsconfig, f, indent=2)

    # nest-cli.json
    nest_cli = {
      "$schema": "https://json.schemastore.org/nest-cli",
      "collection": "@nestjs/schematics",
      "sourceRoot": "src",
      "compilerOptions": {
        "deleteOutDir": True
      }
    }
    with open(os.path.join(app_path, "nest-cli.json"), "w") as f:
        json.dump(nest_cli, f, indent=2)

    # src/main.ts
    with open(os.path.join(app_path, "src", "main.ts"), "w") as f:
        f.write(f"""import {{ NestFactory }} from '@nestjs/core';
import {{ AppModule }} from './app.module';

async function bootstrap() {{
  const app = await NestFactory.create(AppModule);
  await app.listen({port});
  console.log(`Application is running on: ${{await app.getUrl()}}`);
}}
bootstrap();
""")

    # src/app.controller.ts
    controller_name = "ApiGatewayController" if is_api_gateway else "AuthController"
    with open(os.path.join(app_path, "src", "app.controller.ts"), "w") as f:
        f.write(f"""import {{ Controller, Get }} from '@nestjs/common';

@Controller()
export class AppController {{
  @Get('health')
  getHealth(): string {{
    return '{name} is healthy and operational.';
  }}
}}
""")

    # src/app.module.ts
    with open(os.path.join(app_path, "src", "app.module.ts"), "w") as f:
        f.write(f"""import {{ Module }} from '@nestjs/common';
import {{ AppController }} from './app.controller';

@Module({{
  imports: [],
  controllers: [AppController],
  providers: [],
}})
export class AppModule {{}}
""")

# 1. API Gateway
api_gateway_path = os.path.join(base_dir, "apps", "api")
scaffold_nestjs_app(api_gateway_path, "api", 4000, True)
print("Scaffolded API Gateway")

# 2. Identity Service
auth_service_path = os.path.join(base_dir, "services", "platform-services", "auth-service")
scaffold_nestjs_app(auth_service_path, "auth-service", 4100, False)
print("Scaffolded Identity Service")
