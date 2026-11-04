/**
 * SYNCORA Platform Release 18: Centralized Environment Variable Validation
 * Validates public and server-side environment variables using Zod schemas.
 * Ensures strict security: key lengths, URL formats, and secret hygiene.
 */

import { z } from 'zod';

// Helper validator for 32-byte encryption key (64 hex characters or 32 UTF-8 characters)
const encryptionKeySchema = z.string().refine(
  (val) => {
    const trimmed = val.trim();
    if (trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed)) return true;
    if (Buffer.from(trimmed, 'utf8').length === 32) return true;
    return false;
  },
  {
    message: 'Must be a 32-byte key: either 64-character hex or 32-character UTF-8 string',
  }
);

/**
 * Public client-side schema (accessible in browser and server)
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/**
 * Server-only schema (MUST NEVER be bundled into client builds)
 */
export const serverEnvSchema = publicEnvSchema
  .extend({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Core Supabase service role key
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Core AES-256 encryption key for credentials & tokens
    SYNCORA_ENCRYPTION_KEY: encryptionKeySchema.optional(),

    SYNCORA_PREVIOUS_ENCRYPTION_KEYS: z.string().optional(),

    // Cron authentication secret (protects /api/ai/cron)
    CRON_SECRET: z.string().optional(),

    // Integrations & Webhooks (Optional depending on active integrations)
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),

    SLACK_CLIENT_ID: z.string().optional(),
    SLACK_CLIENT_SECRET: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // AI Configuration
    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    AI_PROVIDER: z.string().optional(),
    AI_MODEL: z.string().optional(),
    AI_EMBEDDING_MODEL: z.string().optional(),
    AI_TIMEOUT_MS: z.coerce.number().positive().optional(),
    AI_MAX_STEPS: z.coerce.number().positive().optional(),
    AI_MAX_TOOL_CALLS: z.coerce.number().positive().optional(),
    AI_MAX_OUTPUT_TOKENS: z.coerce.number().positive().optional(),
    AI_AUTONOMY_KILL_SWITCH: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.SUPABASE_SERVICE_ROLE_KEY || data.SUPABASE_SERVICE_ROLE_KEY.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_SERVICE_ROLE_KEY'],
          message: 'SUPABASE_SERVICE_ROLE_KEY is required and must be at least 16 characters in production',
        });
      }
      if (!data.SYNCORA_ENCRYPTION_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SYNCORA_ENCRYPTION_KEY'],
          message: 'SYNCORA_ENCRYPTION_KEY is required in production',
        });
      }
      if (!data.CRON_SECRET || data.CRON_SECRET.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CRON_SECRET'],
          message: 'CRON_SECRET is required and must be at least 16 characters in production',
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Validates an environment object against the server schema.
 * Throws a formatted error without exposing secret values.
 */
export function validateServerEnv(envToValidate: Record<string, string | undefined> = process.env): {
  success: boolean;
  data?: ServerEnv;
  errors?: Record<string, string[]>;
} {
  const result = serverEnvSchema.safeParse(envToValidate);
  if (!result.success) {
    const formattedErrors = result.error.flatten().fieldErrors;
    return {
      success: false,
      errors: formattedErrors,
    };
  }
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validates public environment variables.
 */
export function validatePublicEnv(envToValidate: Record<string, string | undefined> = process.env): {
  success: boolean;
  data?: PublicEnv;
  errors?: Record<string, string[]>;
} {
  const result = publicEnvSchema.safeParse(envToValidate);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }
  return {
    success: true,
    data: result.data,
  };
}
