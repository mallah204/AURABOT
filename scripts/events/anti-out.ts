import { ICommand, IEventRunParams } from '@types';
import { logger } from '@main/utils/logger';

const command: ICommand = {
  config: {
    name: 'anti-out',
    version: '1.0.0',
    type: 'log:unsubscribe',
    description: 'Tự động add lại thành viên out (nếu bot có quyền)',
    category: 'Events'
  },

  run: async (params: IEventRunParams) => {
    const { api, event, Threads } = params;

    try {
      const settings = await Threads.getSettings(event.threadID);

      // Check if anti-out is enabled
      if (settings.antiOut !== true) return;

      const logMessageData = event.logMessageData as any;
      if (!logMessageData || !logMessageData.leftParticipantFbId) return;

      const leftUserID = logMessageData.leftParticipantFbId;

      // Get previous members to track
      const previousMembers = await Threads.getPreviousMembers(event.threadID);

      // Add user back if they were in the group before
      if (previousMembers.includes(leftUserID)) {
        try {
          await api.addUserToGroup(leftUserID, event.threadID);
          logger.info(`✅ Đã tự động add lại user ${leftUserID} vào nhóm ${event.threadID}`);
        } catch (error: any) {
          logger.warn(`⚠️ Không thể add lại user ${leftUserID}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Lỗi trong anti-out event:', error);
    }
  }
};

export = command;
