/**
 * Sentry Instrumentation for NestJS
 * This file must be imported FIRST before any other imports in main.ts
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Only initialize Sentry if DSN is provided
if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,

        // Performance monitoring
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0, // 20% in prod, 100% in dev
        profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0.5, // 10% in prod

        integrations: [
            nodeProfilingIntegration(),
        ],

        // Filter sensitive data
        beforeSend(event) {
            // Remove sensitive headers
            if (event.request?.headers) {
                delete event.request.headers['authorization'];
                delete event.request.headers['cookie'];
            }
            return event;
        },

        // Ignore common non-critical errors
        ignoreErrors: [
            'NotFoundException',
            'UnauthorizedException',
            /^401/,
            /^404/,
        ],
    });

    console.log('[Sentry] Initialized for environment:', ENVIRONMENT);
} else {
    console.log('[Sentry] DSN not configured - monitoring disabled');
}

export { Sentry };
