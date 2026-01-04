import type { MessageEventType } from '../../types';
import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  cooldownMs?: number;
}

interface UserRateLimit {
  count: number;
  resetAt: number;
  lastRequest: number;
}

class RateLimiter {
  private userLimits: Map<string, UserRateLimit> = new Map();
  private globalCooldown: Map<string, number> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.userLimits.entries()) {
      if (limit.resetAt < now) {
        this.userLimits.delete(key);
      }
    }
    for (const [key, cooldown] of this.globalCooldown.entries()) {
      if (cooldown < now) {
        this.globalCooldown.delete(key);
      }
    }
  }

  check(userID: string, commandName?: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const key = commandName ? `${userID}:${commandName}` : userID;

    // Check global cooldown
    if (this.config.cooldownMs) {
      const cooldownKey = commandName ? `${userID}:${commandName}` : userID;
      const cooldownEnd = this.globalCooldown.get(cooldownKey) || 0;
      if (cooldownEnd > now) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: cooldownEnd
        };
      }
    }

    let limit = this.userLimits.get(key);

    if (!limit || limit.resetAt < now) {
      limit = {
        count: 0,
        resetAt: now + this.config.windowMs,
        lastRequest: now
      };
      this.userLimits.set(key, limit);
    }

    if (limit.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: limit.resetAt
      };
    }

    limit.count++;
    limit.lastRequest = now;

    // Set cooldown if configured
    if (this.config.cooldownMs) {
      const cooldownKey = commandName ? `${userID}:${commandName}` : userID;
      this.globalCooldown.set(cooldownKey, now + this.config.cooldownMs);
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - limit.count,
      resetAt: limit.resetAt
    };
  }

  reset(userID: string, commandName?: string): void {
    const key = commandName ? `${userID}:${commandName}` : userID;
    this.userLimits.delete(key);
    const cooldownKey = commandName ? `${userID}:${commandName}` : userID;
    this.globalCooldown.delete(cooldownKey);
  }
}

// Global rate limiter: 10 requests per 10 seconds
export const globalRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 10000,
  cooldownMs: 500 // 500ms cooldown between requests
});

// Command-specific rate limiter: 3 requests per 5 seconds per command
export const commandRateLimiter = new RateLimiter({
  maxRequests: 3,
  windowMs: 5000,
  cooldownMs: 200
});

export const checkRateLimit = (event: MessageEventType, commandName?: string): { allowed: boolean; reason?: string } => {
  const userID = String(event.senderID);

  // Check global rate limit
  const globalCheck = globalRateLimiter.check(userID);
  if (!globalCheck.allowed) {
    const waitSeconds = Math.ceil((globalCheck.resetAt - Date.now()) / 1000);
    return {
      allowed: false,
      reason: `⏳ Bạn đang spam quá nhanh! Vui lòng đợi ${waitSeconds} giây.`
    };
  }

  // Check command-specific rate limit
  if (commandName) {
    const commandCheck = commandRateLimiter.check(userID, commandName);
    if (!commandCheck.allowed) {
      const waitSeconds = Math.ceil((commandCheck.resetAt - Date.now()) / 1000);
      return {
        allowed: false,
        reason: `⏳ Lệnh ${commandName} đang trong cooldown! Vui lòng đợi ${waitSeconds} giây.`
      };
    }
  }

  return { allowed: true };
};
