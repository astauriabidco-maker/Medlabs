import { PATH_METADATA } from '@nestjs/common/constants';
import { AppointmentsController } from './appointments.controller';

describe('AppointmentsController route order', () => {
  it('declares specific appointment routes before the generic :id route', () => {
    const routeNames = Object.getOwnPropertyNames(
      AppointmentsController.prototype,
    ).filter((name) => name !== 'constructor');
    const genericRouteIndex = routeNames.indexOf('getAppointment');

    expect(genericRouteIndex).toBeGreaterThan(-1);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AppointmentsController.prototype.getAppointment,
      ),
    ).toBe(':id');

    for (const routeName of [
      'updateStatus',
      'getBlockedSlots',
      'createBlockedSlot',
      'deleteBlockedSlot',
      'getAppointmentHistory',
      'getCalendarLinks',
      'downloadIcal',
    ]) {
      expect(routeNames.indexOf(routeName)).toBeGreaterThan(-1);
      expect(routeNames.indexOf(routeName)).toBeLessThan(genericRouteIndex);
    }
  });
});
