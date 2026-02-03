import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OcrConfigService } from './ocr-config.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@ApiTags('OCR')
@Controller('ocr-config')
export class OcrConfigController {
    constructor(private readonly ocrConfigService: OcrConfigService) { }

    /**
     * PUBLIC: Get active keywords for PDF extractor
     * No authentication required - used by frontend PDF parser
     */
    @Get('keywords')
    async getActiveKeywords() {
        return this.ocrConfigService.findActive();
    }

    /**
     * SUPER_ADMIN: Get all keywords for admin panel
     */
    @Get('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async getAllKeywords() {
        return this.ocrConfigService.findAll();
    }

    /**
     * SUPER_ADMIN: Create a new keyword
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async createKeyword(
        @Body() body: { keyword: string; category?: string }
    ) {
        return this.ocrConfigService.create(body.keyword, body.category);
    }

    /**
     * SUPER_ADMIN: Update a keyword
     */
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async updateKeyword(
        @Param('id') id: string,
        @Body() body: { keyword?: string; category?: string; isActive?: boolean }
    ) {
        return this.ocrConfigService.update(id, body);
    }

    /**
     * SUPER_ADMIN: Delete a keyword
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteKeyword(@Param('id') id: string) {
        await this.ocrConfigService.delete(id);
    }

    /**
     * SUPER_ADMIN: Seed default keywords
     */
    @Post('seed')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async seedDefaults() {
        return this.ocrConfigService.seedDefaults();
    }
}
