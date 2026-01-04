import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

// Schema validation cho environment variables
const envSchema = z.object({
  // Bot Configuration
  BOT_PREFIX: z.string().default('!'),
  BOT_NAME: z.string().default('AURABOT'),

  // Paths
  APPSTATE_PATH: z.string().default('./appstate.json'),
  COMMANDS_DIR: z.string().default('./scripts/commands'),
  EVENTS_DIR: z.string().default('./scripts/events'),

  // API Configuration
  API_FORCE_LOGIN: z.string().transform((val: string) => val === 'true').default('true'),
  API_LISTEN_EVENTS: z.string().transform((val: string) => val === 'true').default('true'),
  API_LOG_LEVEL: z.string().transform((val: string) => {
    // Map 'silly' to 'verbose' for backward compatibility
    if (val === 'silly') return 'verbose' as const;
    // Validate and return valid log levels
    if (['error', 'warn', 'info', 'verbose', 'silent'].includes(val)) {
      return val as 'error' | 'warn' | 'info' | 'verbose' | 'silent';
    }
    return 'error' as const;
  }).default('error'),
  API_SELF_LISTEN: z.string().transform((val: string) => val === 'true').default('false'),

  // External API
  EXTERNAL_API_URL: z.string().url().optional().default(''),
  EXTERNAL_API_KEY: z.string().optional().default(''),

  // Logger Configuration
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'success']).default('info'),
  LOG_ENABLE_COLORS: z.string().transform((val: string) => val === 'true').default('true'),
  LOG_ENABLE_TIMESTAMP: z.string().transform((val: string) => val === 'true').default('true'),

  // Permissions
  OWNER_ID: z.string().min(1, 'OWNER_ID is required'),
  ADMIN_IDS: z.string().transform((val: string) => {
    if (!val || val.trim() === '') return [];
    return val.split(',').map((id: string) => id.trim()).filter(Boolean);
  }).default(''),

  // Bot Settings
  ADMIN_ONLY: z.string().transform((val: string) => val === 'true').default('false'),
  ADMIN_BOX: z.string().transform((val: string) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    try {
      return JSON.parse(val);
    } catch {
      return false;
    }
  }).default('false'),
  ANTI_INBOX: z.string().transform((val: string) => val === 'true').default('false'),
  OWNER_NO_PREFIX: z.string().transform((val: string) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    try {
      return JSON.parse(val);
    } catch {
      return false;
    }
  }).default('false'),

  // GitHub
  GITHUB_OWNER: z.string().optional().default('dongp06'),
  GITHUB_REPO: z.string().optional().default('AURABOT'),

  // AI Configuration
  GEMINI_API_KEY: z.string().optional().default(''),

  // Database
  DB_PATH: z.string().default('./storage/sqlite/database.sqlite'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let envConfig: EnvConfig | null = null;

export const loadEnvConfig = (): EnvConfig => {
  if (envConfig) return envConfig;

  // Load .env file if exists
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    logger.info('✅ Đã load .env file');
  } else {
    logger.warn('⚠️ Không tìm thấy .env file, sử dụng environment variables hoặc config.json');
  }

  try {
    envConfig = envSchema.parse(process.env);
    logger.success('✅ Đã validate environment variables');
    return envConfig;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Lỗi validation environment variables:');
      error.errors.forEach((err: z.ZodIssue) => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
};
