export function validateDestination(destination: string): void {
    let parsed: URL;
    try {
        parsed = new URL(destination);
    } catch {
        throw new Error('INVALID_DESTINATION');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('UNSUPPORTED_PROTOCOL');
    }
}
