import type { IFCAU_API } from '@dongdev/fca-unofficial';
import type { MessageEventType } from '../../types';
import { messageQueue } from './messageQueue';

export interface MessageHelper {
  send: (message: string, threadID?: string) => Promise<void>;
  reply: (message: string, messageID?: string) => Promise<void>;
  react: (emoji: string, messageID?: string) => Promise<void>;
}

export const createMessageHelper = (
  api: IFCAU_API,
  event: MessageEventType
): MessageHelper => {
  const threadID = event.threadID;
  const messageID = event.messageID;

  // Initialize message queue with API
  messageQueue.setAPI(api);

  return {
    send: async (message: string, targetThreadID?: string): Promise<void> => {
      const targetID = targetThreadID || threadID;
      // Use message queue to prevent spam
      return messageQueue.enqueue(message, targetID, undefined, 'send');
    },

    reply: async (message: string, targetMessageID?: string): Promise<void> => {
      const targetID = targetMessageID || messageID;
      // Use message queue to prevent spam
      return messageQueue.enqueue(message, threadID, targetID, 'reply');
    },

    react: async (emoji: string, targetMessageID?: string): Promise<void> => {
      const targetID = targetMessageID || messageID;
      // Reactions don't need queue, but we'll keep it simple
      return new Promise((resolve, reject) => {
        api.setMessageReaction(emoji, targetID, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  };
};
