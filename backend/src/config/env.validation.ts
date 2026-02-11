/**
 * Environment Validation for Production Safety
 * Throws hard errors at startup if critical env vars are missing or insecure.
 */

export function validateEnvironment(): void {
    const errors: string[] = [];

    // 1. Check NODE_ENV
    if (!process.env.NODE_ENV) {
        console.warn('⚠️ NODE_ENV is not set. Defaulting to "development".');
    }

    // 2. Validate JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        errors.push('JWT_SECRET is required but not set.');
    } else if (jwtSecret.length < 32) {
        errors.push(`JWT_SECRET must be at least 32 characters. Current length: ${jwtSecret.length}`);
    }

    // 2b. Validate PATIENT_JWT_SECRET (used for patient document access)
    const patientSecret = process.env.PATIENT_JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
        if (!patientSecret) {
            errors.push('PATIENT_JWT_SECRET is required in production.');
        } else if (patientSecret.length < 32) {
            errors.push(`PATIENT_JWT_SECRET must be at least 32 characters. Current length: ${patientSecret.length}`);
        }
    }

    // 3. Validate DATABASE_URL in production
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.DATABASE_URL) {
            errors.push('DATABASE_URL is required in production.');
        }

        if (!process.env.FRONTEND_URL) {
            errors.push('FRONTEND_URL is required in production for CORS.');
        }
    }

    // 4. Validate SMS Provider credentials in production
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.MSG91_AUTH_KEY && !process.env.SMS_PROVIDER_KEY) {
            console.warn('⚠️ No SMS provider configured. SMS notifications will fail.');
        }
    }

    // Throw if any critical errors
    if (errors.length > 0) {
        console.error('\n🚨 ENVIRONMENT VALIDATION FAILED:\n');
        errors.forEach((err, i) => console.error(`   ${i + 1}. ${err}`));
        console.error('\n');
        throw new Error('Application cannot start due to environment validation errors.');
    }

    console.log('✅ Environment validation passed.');
}
