import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "welcome",
    version: "1.0.0",
    type: "log:subscribe",
    description: "Chào mừng thành viên mới vào nhóm",
    category: "Events"
  },

  onLoad: async () => {
    // Khởi tạo khi load event handler
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, Users, Threads } = params as IEventRunParams;

    try {
      const settings = await Threads.getSettings(event.threadID);

      if (!settings.welcome) return; // Chỉ chạy nếu bật welcome

      const logMessageData = event.logMessageData;
      if (!logMessageData || !logMessageData.addedParticipants) return;

      const addedParticipants = logMessageData.addedParticipants;
      const threadInfo = await api.getThreadInfo(event.threadID);

      for (const participant of addedParticipants) {
        const userID = participant.userFbId || (participant as any).id;
        if (!userID) continue;

        // Bỏ qua nếu là bot
        if (userID === api.getCurrentUserID()) continue;

        try {
          const userInfo = await api.getUserInfo(userID);
          const userName = userInfo[userID]?.name || "Bạn";
          const threadName = threadInfo.threadName || "nhóm này";

          const welcomeMessage = `🎉 Chào mừng ${userName} đã tham gia ${threadName}!\n\n` +
            `Chúc bạn có những trải nghiệm tuyệt vời tại đây! 💙`;

          await api.sendMessage(welcomeMessage, event.threadID);
        } catch (error) {
          console.error(`Lỗi khi gửi tin nhắn chào mừng cho ${userID}:`, error);
        }
      }
    } catch (error) {
      console.error("Lỗi trong welcome event:", error);
    }
  }
};

export = command;
