/**
 * Production Logger - Structured JSON logging
 * Outputs structured logs for aggregation systems (CloudWatch, Datadog, ELK)
 */
import { LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context?: string;
    message: string;
    data?: Record<string, unknown>;
    trace?: string;
}

export class ProductionLogger implements LoggerService {
    private readonly isProduction = process.env.NODE_ENV === 'production';

    private formatLog(level: LogLevel, message: unknown, context?: string, trace?: string): string {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message: typeof message === 'string' ? message : JSON.stringify(message),
        };

        if (context) entry.context = context;
        if (trace) entry.trace = trace;

        // In production: JSON output for log aggregators
        if (this.isProduction) {
            return JSON.stringify(entry);
        }

        // In development: human-readable format
        const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
        const ctx = context ? `[${context}]` : '';
        return `${prefix} ${ctx} ${entry.message}`;
    }

    log(message: unknown, context?: string) {
        console.log(this.formatLog('info', message, context));
    }

    error(message: unknown, trace?: string, context?: string) {
        console.error(this.formatLog('error', message, context, trace));
    }

    warn(message: unknown, context?: string) {
        console.warn(this.formatLog('warn', message, context));
    }

    debug(message: unknown, context?: string) {
        if (!this.isProduction) {
            console.debug(this.formatLog('debug', message, context));
        }
    }

    verbose(message: unknown, context?: string) {
        if (!this.isProduction) {
            console.log(this.formatLog('debug', message, context));
        }
    }
}

/**
 * Request logging middleware data
 */
export interface RequestLogData {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    userAgent?: string;
    userId?: string;
    tenantId?: string;
}

export function logRequest(data: RequestLogData): void {
    const logger = new ProductionLogger();
    const message = `${data.method} ${data.url} ${data.statusCode} ${data.duration}ms`;

    if (data.statusCode >= 500) {
        logger.error(message, undefined, 'HTTP');
    } else if (data.statusCode >= 400) {
        logger.warn(message, 'HTTP');
    } else {
        logger.log(message, 'HTTP');
    }
}
