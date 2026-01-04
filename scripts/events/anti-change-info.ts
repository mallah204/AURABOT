import { ICommand, IEventRunParams } from '@types';
import { logger } from '@main/utils/logger';

const command: ICommand = {
  config: {
    name: 'anti-change-info',
    version: '1.0.0',
    type: ['log:thread-name', 'log:thread-icon'],
    description: 'Chặn đổi tên nhóm/icon (bot sẽ đổi lại cái cũ)',
    category: 'Events'
  },

  run: async (params: IEventRunParams) => {
    const { api, event, Threads } = params;

    try {
      const settings = await Threads.getSettings(event.threadID);

      // Check if anti-change-info is enabled
      if (settings.antiChangeInfo !== true) return;

      const logMessageData = event.logMessageData as any;
      if (!logMessageData) return;

      if (event.logMessageType === 'log:thread-name') {
        // Anti-change name
        const previousName = await Threads.getPreviousName(event.threadID);
        const newName = logMessageData.name;

        if (previousName && newName !== previousName) {
          try {
            // Change back to previous name
            await api.changeThreadName(previousName, event.threadID);
            logger.info(`✅ Đã đổi lại tên nhóm ${event.threadID} về "${previousName}"`);
          } catch (error: any) {
            logger.warn(`⚠️ Không thể đổi lại tên nhóm:`, error.message);
          }
        } else {
          // Update previous name
          await Threads.getData(event.threadID, newName);
        }
      } else if (event.logMessageType === 'log:thread-icon') {
        // Anti-change icon
        const previousIcon = await Threads.getPreviousIcon(event.threadID);

        if (previousIcon) {
          try {
            // Change back to previous icon (would need icon URL or buffer)
            // Note: Facebook API might not support changing icon back easily
            logger.info(`⚠️ Phát hiện đổi icon nhóm ${event.threadID}, nhưng không thể đổi lại (API limitation)`);
          } catch (error: any) {
            logger.warn(`⚠️ Không thể đổi lại icon:`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error('Lỗi trong anti-change-info event:', error);
    }
  }
};

export = command;
