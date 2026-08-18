const ALIAS_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[\W_]).+$/;

export function isValidDestination(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidAlias(value: string): boolean {
  return ALIAS_PATTERN.test(value);
}

export function passwordIssue(value: string): string | null {
  if (value.length < 8) return "At least 8 characters.";
  if (!PASSWORD_PATTERN.test(value)) {
    return "One uppercase letter, one lowercase letter, one number, one special character.";
  }
  return null;
}
