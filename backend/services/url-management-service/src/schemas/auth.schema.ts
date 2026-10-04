import { z } from 'zod';

export const AuthLoginSchema = z
    .object({
        password: z
            .string()
            .min(8, { message: 'Password must be at least 8 characters' })
            .max(64, { message: 'Password must be at most 64 characters' })
            .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[\W_]).+$/, {
                message:
                    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            })
            .optional(),
    })
    .passthrough();
// passthrough is used because other auth fields are handled by better-auth
