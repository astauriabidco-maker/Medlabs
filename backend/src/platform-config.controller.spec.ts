import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { PlatformConfigController } from './platform-config.controller';

describe('PlatformConfigController security metadata', () => {
  type RouteHandler = 'getConfig' | 'saveConfig' | 'testSms' | 'testEmail';

  const routeHandlers = Object.getOwnPropertyNames(
    PlatformConfigController.prototype,
  ).filter(
    (handler) =>
      handler !== 'constructor' &&
      Reflect.hasMetadata(
        PATH_METADATA,
        PlatformConfigController.prototype[handler as RouteHandler],
      ),
  ) as RouteHandler[];

  it('uses JWT and roles guards for admin config routes', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PlatformConfigController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('restricts every handler to SUPER_ADMIN', () => {
    expect(routeHandlers).toEqual([
      'getConfig',
      'saveConfig',
      'testSms',
      'testEmail',
    ]);

    for (const handler of routeHandlers) {
      expect(
        Reflect.getMetadata(
          'roles',
          PlatformConfigController.prototype[handler],
        ),
      ).toEqual(['SUPER_ADMIN']);
    }
  });
});
