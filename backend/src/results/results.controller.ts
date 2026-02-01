import { Controller, Post, Get, Patch, Delete, UseGuards, UseInterceptors, UploadedFile, Body, Query, Param } from '@nestjs/common';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard, Roles, User } from '../auth/guards';
import { UserRole } from '@prisma/client';

@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultsController {
    constructor(private readonly resultsService: ResultsService) { }

    @Get()
    @Roles('TECHNICIAN', 'LAB_ADMIN', 'SUPER_ADMIN')
    findAll(
        @User() user: any,
        @Query('search') search?: string,
        @Query('page') page?: number,
    ) {
        return this.resultsService.findAll(user.tenantId, search, page);
    }

    @Get(':id/preview')
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    getPreviewUrl(@User() user: any, @Param('id') id: string) {
        return this.resultsService.getPreviewUrl(user.tenantId, id);
    }

    @Patch(':id/resend')
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    resend(
        @User() user: any,
        @Param('id') id: string,
        @Body('phone') phone: string,
    ) {
        return this.resultsService.resendResult(user.tenantId, id, phone, user.id);
    }

    @Post()
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    @UseInterceptors(FileInterceptor('file'))
    create(
        @User() user: any,
        @Body() createResultDto: CreateResultDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        // Force tenantId from authenticated user
        const tenantId = user.tenantId;
        return this.resultsService.create(createResultDto, file, tenantId, user.id);
    }

    @Post(':id/resend-code')
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    resendCode(@User() user: any, @Param('id') id: string) {
        return this.resultsService.resendAccessCode(user.tenantId, id);
    }

    @Delete(':id')
    @Roles('LAB_ADMIN', 'SUPER_ADMIN')
    remove(@User() user: any, @Param('id') id: string) {
        return this.resultsService.remove(user.tenantId, id);
    }
}
