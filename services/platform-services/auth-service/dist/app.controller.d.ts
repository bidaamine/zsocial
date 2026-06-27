import { AuthService } from './auth.service';
import { UserArchetype } from './entities/user.entity';
export declare class AppController {
    private readonly authService;
    constructor(authService: AuthService);
    getHealth(): string;
    register(body: {
        email: string;
        password?: string;
        passwordHash?: string;
        archetype?: UserArchetype;
    }): Promise<{
        success: boolean;
        message: string;
        verificationToken: string;
    }>;
    verifyEmail(token: string): Promise<{
        success: boolean;
        message: string;
    }>;
    login(body: {
        email?: string;
        password?: string;
        deviceFingerprint?: string;
    }, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            archetype: UserArchetype;
            roles: string[];
        };
    } | {
        mfaRequired: boolean;
        userId: string;
    }>;
    refresh(refreshToken: string, deviceFingerprint: string, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            archetype: UserArchetype;
            roles: string[];
        };
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    getSessions(req: any): Promise<import("./entities/refresh-token.entity").RefreshToken[]>;
    revokeSession(req: any, sessionId: string): Promise<import("./entities/refresh-token.entity").RefreshToken>;
    revokeOtherSessions(req: any, currentRefreshToken: string): Promise<{
        success: boolean;
    }>;
    getDevices(req: any): Promise<import("./entities/user-device.entity").UserDevice[]>;
    toggleDeviceTrust(req: any, deviceId: string, isTrusted: boolean): Promise<import("./entities/user-device.entity").UserDevice>;
    getStatus(req: any): Promise<{
        valid: boolean;
        payload?: undefined;
    } | {
        valid: boolean;
        payload: any;
    }>;
    getJwks(): {
        keys: {
            kty: any;
            use: string;
            alg: string;
            kid: string;
            n: any;
            e: any;
        }[];
    };
    getPublicKey(): string;
}
//# sourceMappingURL=app.controller.d.ts.map