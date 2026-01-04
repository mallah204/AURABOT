import fs from 'fs';
import path from 'path';
import { ApiOptions } from '../types';
import { logger } from './utils/logger';
import { loadEnvConfig, type EnvConfig } from './config/env';

interface OwnerNoPrefixConfig {
  all?: boolean;
  list?: string[];
}

interface BotConfig {
  bot: {
    prefix: string;
    name: string;
  };
  paths: {
    appstate: string;
    commands: string;
    events?: string;
  };
  api: ApiOptions;
  externalApi?: {
    url: string;
    key: string;
  };
  logger: {
    level: string;
    enableColors: boolean;
    enableTimestamp: boolean;
  };
  permissions: {
    owner: string;
    admins: string[];
  };
  adminOnly?: boolean;
  adminBox?: boolean | Record<string, boolean>;
  antiINBOX?: boolean;
  ownerNoPrefix?: boolean | string[] | OwnerNoPrefixConfig;
  github?: {
    owner: string;
    repo: string;
  };
}

const CONFIG_PATH = path.resolve(__dirname, '../config.json');

// Try to load from .env first, fallback to config.json
const loadConfig = (): BotConfig => {
  // Check if .env exists or USE_ENV is set
  const envPath = path.resolve(__dirname, '../.env');
  const useEnv = process.env.USE_ENV === 'true' || fs.existsSync(envPath);

  if (useEnv) {
    try {
      const env = loadEnvConfig();
      const config: BotConfig = {
        bot: {
          prefix: env.BOT_PREFIX,
          name: env.BOT_NAME
        },
        paths: {
          appstate: env.APPSTATE_PATH,
          commands: env.COMMANDS_DIR,
          events: env.EVENTS_DIR
        },
        api: {
          forceLogin: env.API_FORCE_LOGIN,
          listenEvents: env.API_LISTEN_EVENTS,
          logLevel: env.API_LOG_LEVEL,
          selfListen: env.API_SELF_LISTEN
        },
        externalApi: env.EXTERNAL_API_URL ? {
          url: env.EXTERNAL_API_URL,
          key: env.EXTERNAL_API_KEY || ''
        } : undefined,
        logger: {
          level: env.LOG_LEVEL,
          enableColors: env.LOG_ENABLE_COLORS,
          enableTimestamp: env.LOG_ENABLE_TIMESTAMP
        },
        permissions: {
          owner: env.OWNER_ID,
          admins: env.ADMIN_IDS
        },
        adminOnly: env.ADMIN_ONLY,
        adminBox: env.ADMIN_BOX,
        antiINBOX: env.ANTI_INBOX,
        ownerNoPrefix: env.OWNER_NO_PREFIX,
        github: {
          owner: env.GITHUB_OWNER,
          repo: env.GITHUB_REPO
        }
      };
      logger.info('✅ Đã load config từ .env');
      return config;
    } catch (error) {
      logger.warn('⚠️ Lỗi load .env, fallback về config.json:', error);
    }
  }

  // Fallback to config.json
  if (!fs.existsSync(CONFIG_PATH)) {
    logger.error(`❌ Không tìm thấy file config.json tại: ${CONFIG_PATH}`);
    logger.error('Vui lòng tạo file config.json hoặc .env trước khi chạy bot!');
    throw new Error(`Config file not found: ${CONFIG_PATH}`);
  }

  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configData);
    logger.info('✅ Đã load config từ file config.json');
    return config;
  } catch (error) {
    logger.error('❌ Lỗi đọc config file:', error);
    throw new Error(`Failed to load config: ${error}`);
  }
};

const botConfig = loadConfig();

export const PREFIX = botConfig.bot.prefix;
export const BOT_NAME = botConfig.bot.name;
export const APPSTATE_PATH = path.resolve(__dirname, '..', botConfig.paths.appstate);
export const COMMANDS_DIR = path.resolve(__dirname, '..', botConfig.paths.commands);
export const EVENTS_DIR = path.resolve(__dirname, '..', botConfig.paths.events || './scripts/events');
export const config: ApiOptions = botConfig.api;
export const OWNER_ID = botConfig.permissions.owner;
export const ADMIN_IDS = botConfig.permissions.admins || [];
export const EXTERNAL_API_URL = botConfig.externalApi?.url || '';
export const EXTERNAL_API_KEY = botConfig.externalApi?.key || '';

export const isOwner = (userID: string | number): boolean => {
  if (!OWNER_ID) {
    logger.warn('⚠️ Chưa có owner ID trong config!');
    return false;
  }
  // Chuyển đổi cả hai về string để so sánh chính xác
  return String(OWNER_ID) === String(userID);
};

export const isAdmin = (userID: string | number): boolean => {
  if (isOwner(userID)) {
    return true;
  }
  // Chuyển đổi userID về string và kiểm tra trong ADMIN_IDS
  const userIDStr = String(userID);
  return ADMIN_IDS.some(adminID => String(adminID) === userIDStr);
};

export { botConfig };
export type { BotConfig };
