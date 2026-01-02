import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "thread-icon",
    version: "1.0.0",
    type: "log:thread-icon",
    description: "Thông báo khi icon nhóm được thay đổi",
    category: "Events"
  },

  onLoad: async () => {
    // Khởi tạo khi load event handler
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, Users, Threads } = params as IEventRunParams;
    try {
      const settings = await Threads.getSettings(event.threadID);

      if (!settings.iconChangeNotify) return; // Chỉ chạy nếu bật thông báo

      const logMessageData = event.logMessageData as any;
      if (!logMessageData) return;

      const authorID = logMessageData.author;

      if (!authorID) return;

      try {
        const userInfo = await api.getUserInfo(authorID);
        const userName = userInfo[authorID]?.name || "Ai đó";

        const message = `🖼️ ${userName} đã thay đổi icon nhóm!`;

        await api.sendMessage(message, event.threadID);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin user trong thread-icon event:", error);
      }
    } catch (error) {
      console.error("Lỗi trong thread-icon event:", error);
    }
  }
};

export = command;
