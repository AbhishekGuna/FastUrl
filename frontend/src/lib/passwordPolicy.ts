// Ported from UniConnect — converted to TypeScript with FastUrl-specific word list
// trimmed (removed campus/event/uniconnect entries, kept universal ones)

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
/** bcrypt hard-caps at 72 bytes; enforce the same limit */
export const BCRYPT_MAX_BYTES = 72;

const COMMON_PASSWORD_BASES = new Set([
    'password',
    'passw',
    'pass',
    'qwerty',
    'qwertyui',
    'asdf',
    'asdfgh',
    'zxcvbn',
    'welcome',
    'admin',
    'administrator',
    'root',
    'letmein',
    'iloveyou',
    'monkey',
    'dragon',
    'football',
    'baseball',
    'sunshine',
    'princess',
    'shadow',
    'master',
    'superman',
    'batman',
    'trustno',
    'whatever',
    'login',
    'test',
    'testing',
    'demo',
    'guest',
    'changeme',
    'secret',
    'default',
    'temp',
    'abc',
    'abcd',
    'abcdef',
    'abcdefg',
    'hello',
    'freedom',
    'starwars',
    'computer',
    'internet',
    'fasturl',
    'shorturl',
    'link',
    'links',
    'url',
    'urls',
]);

const KEYBOARD_ROWS = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '01234567890',
    'abcdefghijklmnopqrstuvwxyz',
];

function stripOuterNonLetters(value: string): string {
    return value.replace(/^[^a-z]+/, '').replace(/[^a-z]+$/, '');
}

function undoLeetSpeak(value: string): string {
    return value
        .replace(/[@4]/g, 'a')
        .replace(/3/g, 'e')
        .replace(/[1!|]/g, 'i')
        .replace(/0/g, 'o')
        .replace(/[5$]/g, 's')
        .replace(/7/g, 't');
}

export function isCommonPassword(password: string): boolean {
    const normalized = password.toLowerCase();
    const candidates = new Set<string>();

    for (const variant of [normalized, stripOuterNonLetters(normalized)]) {
        const leetFree = undoLeetSpeak(variant);
        candidates.add(variant);
        candidates.add(stripOuterNonLetters(variant));
        candidates.add(leetFree);
        candidates.add(stripOuterNonLetters(leetFree));
    }

    return [...candidates].some((c) => COMMON_PASSWORD_BASES.has(c));
}

export function containsSequentialRun(password: string, runLength = 5): boolean {
    const normalized = password.toLowerCase();
    for (const row of KEYBOARD_ROWS) {
        const reversed = [...row].reverse().join('');
        for (let i = 0; i + runLength <= row.length; i += 1) {
            if (normalized.includes(row.slice(i, i + runLength))) return true;
            if (normalized.includes(reversed.slice(i, i + runLength))) return true;
        }
    }
    return false;
}

export interface PasswordContext {
    email?: string;
    name?: string;
}

export function containsPersonalInfo(password: string, context: PasswordContext = {}): boolean {
    const normalized = password.toLowerCase();
    const personalValues = [context.email, context.name].filter(Boolean) as string[];

    return personalValues.some((value) => {
        const raw = String(value).toLowerCase().trim();
        const candidates = raw.includes('@') ? [raw.split('@')[0]] : [raw];
        return candidates
            .flatMap((candidate) => [candidate, ...candidate.split(/[\s._-]+/)])
            .filter((part) => part.length >= 4)
            .some((part) => normalized.includes(part));
    });
}

export interface PasswordCriteria {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
    noSpacePadding: boolean;
    notCommon: boolean;
}

export function getPasswordCriteria(
    password = '',
    context: PasswordContext = {},
): PasswordCriteria {
    const value = password ?? '';
    const byteLength = new TextEncoder().encode(value).length;

    return {
        length:
            value.length >= PASSWORD_MIN_LENGTH &&
            value.length <= PASSWORD_MAX_LENGTH &&
            byteLength <= BCRYPT_MAX_BYTES,
        upper: /[A-Z]/.test(value),
        lower: /[a-z]/.test(value),
        number: /\d/.test(value),
        special: /[^A-Za-z0-9]/.test(value),
        noSpacePadding: value.length > 0 && value === value.trim(),
        notCommon:
            value.length > 0 &&
            !isCommonPassword(value) &&
            !containsSequentialRun(value) &&
            !/(.)\\1{3,}/.test(value) &&
            !containsPersonalInfo(value, context),
    };
}

export const PASSWORD_CRITERIA_LABELS: Record<keyof PasswordCriteria, string> = {
    length: `Between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    upper: 'One uppercase letter (A–Z)',
    lower: 'One lowercase letter (a–z)',
    number: 'One number (0–9)',
    special: 'One special character (!@#$%^&*)',
    noSpacePadding: 'No spaces at the start or end',
    notCommon: 'Not a common or guessable password',
};

export function isStrongPassword(password: string, context: PasswordContext = {}): boolean {
    return Object.values(getPasswordCriteria(password, context)).every(Boolean);
}

/**
 * Returns the first unmet rule as a human-readable string, or null if the
 * password passes every check.
 */
export function getPasswordError(password: string, context: PasswordContext = {}): string | null {
    const c = getPasswordCriteria(password, context);

    if (!c.length)
        return `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`;
    if (!c.noSpacePadding) return 'Password must not start or end with a space';
    if (!c.upper) return 'Password must contain at least one uppercase letter (A–Z)';
    if (!c.lower) return 'Password must contain at least one lowercase letter (a–z)';
    if (!c.number) return 'Password must contain at least one number (0–9)';
    if (!c.special) return 'Password must contain at least one special character (!@#$%^&*)';
    if (!c.notCommon)
        return 'Password is too easy to guess — avoid common words, sequences, and your name or email';

    return null;
}
