import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "goodbye",
    version: "1.0.0",
    type: "log:unsubscribe",
    description: "Tạm biệt thành viên rời nhóm",
    category: "Events"
  },

  onLoad: async () => {
    // Khởi tạo khi load event handler
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, Users, Threads } = params as IEventRunParams;

    try {
      const settings = await Threads.getSettings(event.threadID);

      if (!settings.goodbye) return; // Chỉ chạy nếu bật goodbye

      const logMessageData = event.logMessageData;
      if (!logMessageData || !logMessageData.leftParticipantFbId) return;

      const userID = logMessageData.leftParticipantFbId;

      // Bỏ qua nếu là bot
      if (userID === api.getCurrentUserID()) return;

      try {
        const userInfo = await api.getUserInfo(userID);
        const userName = userInfo[userID]?.name || "Ai đó";
        const threadInfo = await api.getThreadInfo(event.threadID);
        const threadName = threadInfo.threadName || "nhóm này";

        const goodbyeMessage = `👋 Tạm biệt ${userName}! Cảm ơn bạn đã là một phần của ${threadName}.\n\n` +
          `Chúc bạn may mắn trên hành trình tiếp theo! 💙`;

        await api.sendMessage(goodbyeMessage, event.threadID);
      } catch (error) {
        console.error(`Lỗi khi gửi tin nhắn tạm biệt cho ${userID}:`, error);
      }
    } catch (error) {
      console.error("Lỗi trong goodbye event:", error);
    }
  }
};

export = command;
