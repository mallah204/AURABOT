import type { IFCAU_API } from '@dongdev/fca-unofficial';
import { logger } from './logger';

interface QueuedMessage {
  message: string;
  threadID: string;
  messageID?: string;
  type: 'send' | 'reply';
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processing: boolean = false;
  private delayMs: number;
  private api: IFCAU_API | null = null;

  constructor(delayMs: number = 300) {
    this.delayMs = delayMs;
  }

  setAPI(api: IFCAU_API): void {
    this.api = api;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !this.api) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        if (item.type === 'reply' && item.messageID) {
          await new Promise<void>((resolve, reject) => {
            this.api!.sendMessage(
              item.message,
              item.threadID,
              (err) => {
                if (err) reject(err);
                else resolve();
              },
              item.messageID
            );
          });
        } else {
          await new Promise<void>((resolve, reject) => {
            this.api!.sendMessage(item.message, item.threadID, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        item.resolve();
      } catch (error) {
        logger.error('Lỗi khi gửi message từ queue:', error);
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }

      // Delay giữa các message để tránh spam
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }

    this.processing = false;
  }

  async enqueue(
    message: string,
    threadID: string,
    messageID?: string,
    type: 'send' | 'reply' = 'send'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        message,
        threadID,
        messageID,
        type,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Remove messages older than 30 seconds
      const now = Date.now();
      this.queue = this.queue.filter(item => now - item.timestamp < 30000);

      this.processQueue();
    });
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

export const messageQueue = new MessageQueue(300); // 300ms delay between messages
