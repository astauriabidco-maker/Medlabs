
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, createParamDecorator, Inject, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

// --- Decorators ---
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

// --- Guards ---

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(@Optional() @Inject(Reflector) private reflector?: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // Check if route is marked as public (only if reflector is available)
        if (this.reflector) {
            const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
            if (isPublic) {
                return true;
            }
        }
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!roles) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Check if user has one of the required roles
        return roles.includes(user.role);
    }
}
