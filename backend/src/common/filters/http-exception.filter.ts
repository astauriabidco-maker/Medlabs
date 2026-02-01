import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * GlobalHttpExceptionFilter
 * 
 * Ensures consistent error responses across the API.
 * Key behavior: Prisma "not found" errors → 404 (not 500)
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('HttpException');

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';

        // Handle HttpException (NestJS standard)
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                message = (exceptionResponse as any).message || message;
                error = (exceptionResponse as any).error || error;
            }
        }
        // Handle Prisma errors
        else if (this.isPrismaError(exception)) {
            const prismaError = exception as any;

            // P2025: Record not found
            if (prismaError.code === 'P2025') {
                status = HttpStatus.NOT_FOUND;
                message = 'Resource not found';
                error = 'Not Found';
            }
            // P2002: Unique constraint violation
            else if (prismaError.code === 'P2002') {
                status = HttpStatus.CONFLICT;
                message = 'Resource already exists';
                error = 'Conflict';
            }
            // P2003: Foreign key constraint failed
            else if (prismaError.code === 'P2003') {
                status = HttpStatus.BAD_REQUEST;
                message = 'Referenced resource not found';
                error = 'Bad Request';
            }
        }
        // Handle generic errors
        else if (exception instanceof Error) {
            message = exception.message;

            // Log full stack for debugging
            this.logger.error(`${request.method} ${request.url}`, exception.stack);
        }

        // Log non-500 errors at warn level, 500s at error level
        if (status >= 500) {
            this.logger.error(`[${status}] ${request.method} ${request.url}: ${message}`);
        } else if (status >= 400) {
            this.logger.warn(`[${status}] ${request.method} ${request.url}: ${message}`);
        }

        // Send response
        response.status(status).json({
            statusCode: status,
            error,
            message,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Check if error is a Prisma error
     */
    private isPrismaError(error: unknown): boolean {
        return (
            error !== null &&
            typeof error === 'object' &&
            'code' in error &&
            typeof (error as any).code === 'string' &&
            (error as any).code.startsWith('P')
        );
    }
}
