import { checkRateLimit, globalRateLimiter } from '../rateLimit';
import { MessageEventType } from '../../../../types';

describe('Rate Limiter', () => {
  const mockEvent: MessageEventType = {
    type: 'message',
    senderID: '123456',
    threadID: '789012',
    body: 'test',
    messageID: 'msg123',
    isGroup: false
  } as MessageEventType;

  beforeEach(() => {
    // Reset rate limiter state
    (globalRateLimiter as any).userLimits.clear();
    (globalRateLimiter as any).globalCooldown.clear();
  });

  test('should allow first request', () => {
    const result = checkRateLimit(mockEvent);
    expect(result.allowed).toBe(true);
  });

  test('should block after too many requests', () => {
    // Make 10 requests (max allowed)
    for (let i = 0; i < 10; i++) {
      checkRateLimit(mockEvent);
    }

    // 11th request should be blocked
    const result = checkRateLimit(mockEvent);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('spam');
  });

  test('should allow after cooldown period', async () => {
    // Make requests to trigger cooldown
    for (let i = 0; i < 5; i++) {
      checkRateLimit(mockEvent);
    }

    // Wait for cooldown (500ms)
    await new Promise(resolve => setTimeout(resolve, 600));

    // Should be allowed again
    const result = checkRateLimit(mockEvent);
    expect(result.allowed).toBe(true);
  });
});
