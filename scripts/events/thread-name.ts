import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "thread-name",
    version: "1.0.0",
    type: "log:thread-name",
    description: "Thông báo khi tên nhóm được thay đổi",
    category: "Events"
  },

  onLoad: async () => {
    // Khởi tạo khi load event handler
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, Users, Threads } = params as IEventRunParams;

    try {
      const settings = await Threads.getSettings(event.threadID);

      if (!settings.nameChangeNotify) return; // Chỉ chạy nếu bật thông báo

      const logMessageData = event.logMessageData as any;
      if (!logMessageData) return;

      const name = logMessageData.name;
      const authorID = logMessageData.author;

      if (!name || !authorID) return;

      try {
        const userInfo = await api.getUserInfo(authorID);
        const userName = userInfo[authorID]?.name || "Ai đó";

        const message = `📝 ${userName} đã đổi tên nhóm thành: "${name}"`;

        await api.sendMessage(message, event.threadID);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin user trong thread-name event:", error);
      }
    } catch (error) {
      console.error("Lỗi trong thread-name event:", error);
    }
  }
};

export = command;
