"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const core_infra_1 = require("@nexus/core-infra");
const app_controller_1 = require("./app.controller");
const auth_kafka_controller_1 = require("./kafka/auth-kafka.controller");
const user_entity_1 = require("./entities/user.entity");
const mfa_config_entity_1 = require("./entities/mfa-config.entity");
const passkey_entity_1 = require("./entities/passkey.entity");
const oauth_profile_entity_1 = require("./entities/oauth-profile.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const user_device_entity_1 = require("./entities/user-device.entity");
const keys_module_1 = require("./keys/keys.module");
const mfa_module_1 = require("./mfa/mfa.module");
const passkey_module_1 = require("./passkey/passkey.module");
const oauth_module_1 = require("./oauth/oauth.module");
const auth_core_module_1 = require("./auth-core.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            keys_module_1.KeysModule,
            auth_core_module_1.AuthCoreModule,
            mfa_module_1.MfaModule,
            passkey_module_1.PasskeyModule,
            oauth_module_1.OAuthModule,
            core_infra_1.PostgresModule.forRoot({
                type: 'postgres',
                host: process.env.POSTGRES_HOST || 'localhost',
                port: parseInt(process.env.POSTGRES_PORT || '5434', 10),
                username: process.env.POSTGRES_USER || 'nexus',
                password: process.env.POSTGRES_PASSWORD || 'password',
                database: process.env.POSTGRES_DB || 'nexus_db',
                autoLoadEntities: true,
                synchronize: true, // Only for development/MVP!
            }),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, mfa_config_entity_1.MfaConfig, passkey_entity_1.Passkey, oauth_profile_entity_1.OAuthProfile, refresh_token_entity_1.RefreshToken, user_device_entity_1.UserDevice]),
            jwt_1.JwtModule.register({
                global: true,
            }),
            core_infra_1.RedisModule.forRoot({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
            }),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 10,
                }]),
        ],
        controllers: [app_controller_1.AppController, auth_kafka_controller_1.AuthKafkaController],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
