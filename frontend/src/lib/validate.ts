import {
    getPasswordCriteria,
    getPasswordError,
    PASSWORD_CRITERIA_LABELS,
    type PasswordContext,
    type PasswordCriteria,
} from './passwordPolicy';

const ALIAS_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;

export function isValidDestination(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function isValidAlias(value: string): boolean {
    return ALIAS_PATTERN.test(value);
}

/**
 * Returns the first unmet password rule as a human-readable string, or null.
 * Drop-in replacement for the old regex-based check.
 */
export function passwordIssue(value: string, context?: PasswordContext): string | null {
    return getPasswordError(value, context);
}

export type { PasswordContext, PasswordCriteria };
// Re-export the full API so other components can use it directly
export { getPasswordCriteria, getPasswordError, PASSWORD_CRITERIA_LABELS };
