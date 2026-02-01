import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    UnauthorizedException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import type { BookAppointmentDto } from './appointments.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import type { AppointmentStatus } from '@prisma/client';

@Controller('appointments')
export class AppointmentsController {
    constructor(private appointmentsService: AppointmentsService) { }

    // ==================== PUBLIC ENDPOINTS ====================

    /**
     * Book a new appointment (public)
     * POST /api/appointments/book
     */
    @Post('book')
    async bookAppointment(@Body() dto: BookAppointmentDto) {
        return this.appointmentsService.bookAppointment(dto);
    }

    /**
     * Get available time slots (public)
     * GET /api/appointments/availability/:tenantId?date=YYYY-MM-DD
     */
    @Get('availability/:tenantId')
    async getAvailableSlots(
        @Param('tenantId') tenantId: string,
        @Query('date') date: string
    ) {
        return this.appointmentsService.getAvailableSlots(tenantId, date);
    }

    /**
     * Get tenant booking settings by slug (public)
     * GET /api/appointments/settings/:slug
     */
    @Get('settings/:slug')
    async getTenantBookingSettings(@Param('slug') slug: string) {
        return this.appointmentsService.getTenantBookingSettings(slug);
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Get appointments for admin dashboard
     * GET /api/appointments?startDate=X&endDate=Y&status=PENDING
     */
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN', 'TECHNICIAN')
    async getAppointments(
        @Request() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('status') status?: AppointmentStatus
    ) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        return this.appointmentsService.getAppointments(tenantId, {
            startDate,
            endDate,
            status,
        });
    }

    /**
     * Update appointment status (confirm/cancel)
     * PATCH /api/appointments/:id/status
     */
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN', 'TECHNICIAN')
    async updateStatus(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { status: AppointmentStatus }
    ) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        return this.appointmentsService.updateStatus(
            tenantId,
            id,
            body.status,
            req.user.userId
        );
    }

    /**
     * Get single appointment details
     * GET /api/appointments/:id
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'VIEWER')
    async getAppointment(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        const appointments = await this.appointmentsService.getAppointments(tenantId, {});
        const appointment = appointments.find((a: any) => a.id === id);

        if (!appointment) {
            throw new UnauthorizedException('Appointment not found');
        }

        return appointment;
    }

    // ==================== BLOCKED SLOTS (Closures/Holidays) ====================

    /**
     * Get all blocked slots for admin
     * GET /api/appointments/blocked-slots
     */
    @Get('blocked-slots')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN', 'TECHNICIAN')
    async getBlockedSlots(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        return this.appointmentsService.getBlockedSlots(tenantId);
    }

    /**
     * Create a blocked slot
     * POST /api/appointments/blocked-slots
     */
    @Post('blocked-slots')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN')
    async createBlockedSlot(
        @Request() req: any,
        @Body() body: { date: string; allDay?: boolean; startTime?: string; endTime?: string; reason?: string }
    ) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        return this.appointmentsService.createBlockedSlot(tenantId, body);
    }

    /**
     * Delete a blocked slot
     * DELETE /api/appointments/blocked-slots/:id
     */
    @Delete('blocked-slots/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN')
    async deleteBlockedSlot(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        return this.appointmentsService.deleteBlockedSlot(tenantId, id);
    }

    // ==================== HISTORY & CALENDAR SYNC ====================

    /**
     * Get appointment history/audit trail
     * GET /api/appointments/:id/history
     */
    @Get(':id/history')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN', 'TECHNICIAN')
    async getAppointmentHistory(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        return this.appointmentsService.getAppointmentHistory(tenantId, id);
    }

    /**
     * Get calendar sync links for an appointment
     * GET /api/appointments/:id/calendar-links
     */
    @Get(':id/calendar-links')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('LAB_ADMIN', 'TECHNICIAN')
    async getCalendarLinks(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User not associated with a tenant');

        const appointments = await this.appointmentsService.getAppointments(tenantId, {});
        const appointment = appointments.find((a: any) => a.id === id);

        if (!appointment) {
            throw new UnauthorizedException('Appointment not found');
        }

        // Use the tenant from the appointment (already loaded via include)
        const tenant = appointment.tenant;

        return {
            ical: `/api/appointments/${id}/ical?tenantId=${tenantId}`,
            google: this.appointmentsService.getGoogleCalendarLink(appointment, tenant),
            outlook: this.appointmentsService.getOutlookCalendarLink(appointment, tenant),
        };
    }

    /**
     * Download iCal file for an appointment
     * GET /api/appointments/:id/ical
     */
    @Get(':id/ical')
    async downloadIcal(@Param('id') id: string, @Query('tenantId') tenantId: string) {
        // This is a public endpoint so patients can download from their confirmation email
        if (!tenantId) {
            throw new UnauthorizedException('tenantId is required');
        }

        const appointments = await this.appointmentsService.getAppointments(tenantId, {});
        const appointment = appointments.find((a: any) => a.id === id);

        if (!appointment) {
            throw new UnauthorizedException('Appointment not found');
        }

        // Use the tenant from the appointment (already loaded via include)
        const tenant = appointment.tenant;
        const icalContent = this.appointmentsService.generateICalEvent(appointment, tenant);

        return {
            content: icalContent,
            filename: `rdv-${appointment.id}.ics`,
            contentType: 'text/calendar',
        };
    }
}
