/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { z, ZodError } from 'zod';
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    PORT: z
      .string()
      .default('3000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive()),

    // Secret / critical values — কোনো fallback নেই, মিসিং হলে crash করবে
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required and cannot be empty'),

    DATABASE_URL: z
      .string()
      .url('DATABASE_URL must be a valid connection string'),

    FRONTEND_URL: z
      .string()
      .url('FRONTEND_URL must be a valid URL')
      .refine(
        (value) => !value.includes('*'),
        'FRONTEND_URL cannot contain a wildcard',
      )
      .default('http://localhost:3000'),
    CORS_ORIGINS: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value ||
          value
            .split(',')
            .every(
              (origin) =>
                !origin.includes('*') &&
                z.string().url().safeParse(origin.trim()).success,
            ),
        'CORS_ORIGINS must be a comma-separated list of explicit URLs without wildcards',
      ),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    REFRESH_TOKEN_TTL_MS: z
      .string()
      .default('1209600000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive()),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),

    THROTTLE_TTL: z
      .string()
      .default('60000')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive()),

    THROTTLE_LIMIT: z
      .string()
      .default('100')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive()),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    APP_URL: z.string().url().default('http://localhost:4000'),
    TOKEN_EXPIRATION: z.string().default('3600'),
  })
  .superRefine((env, context) => {
    const secure =
      env.COOKIE_SECURE === undefined
        ? env.NODE_ENV === 'production'
        : env.COOKIE_SECURE === 'true';
    if (env.NODE_ENV === 'production' && !secure) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true in production',
      });
    }
    if (env.COOKIE_SAME_SITE === 'none' && !secure) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none',
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const zodError: ZodError = result.error;

    const formattedErrors = zodError.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `❌ Invalid environment configuration:\n${formattedErrors}`,
    );
  }

  return result.data;
}
