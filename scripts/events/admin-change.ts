import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "admin-change",
    version: "1.0.0",
    type: "log:thread-admins",
    description: "Thông báo khi có thay đổi admin trong nhóm",
    category: "Events"
  },

  onLoad: async () => {
    // Khởi tạo khi load event handler
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, Users, Threads } = params as IEventRunParams;

    try {
      const settings = await Threads.getSettings(event.threadID);

      if (!settings.adminNotify) return; // Chỉ chạy nếu bật thông báo admin

      const logMessageData = event.logMessageData as any;
      if (!logMessageData) return;

      // Cấu trúc logMessageData có thể khác nhau, xử lý linh hoạt
      const targetID = logMessageData.TARGET_ID || logMessageData.targetID;
      const actorID = logMessageData.ACTOR_ID || logMessageData.actorID || logMessageData.author;
      const eventType = logMessageData.ADMIN_EVENT || logMessageData.eventType || logMessageData.type;

      if (!targetID || !actorID) return;

      try {
        const [targetInfo, actorInfo] = await Promise.all([
          api.getUserInfo(targetID),
          api.getUserInfo(actorID)
        ]);

        const targetName = targetInfo[targetID]?.name || "Ai đó";
        const actorName = actorInfo[actorID]?.name || "Ai đó";

        const isAdd = eventType === "add_admin" || String(eventType).includes("add");
        let message = "";

        // Kiểm tra loại thay đổi admin
        if (isAdd) {
          message = `👑 ${targetName} đã được ${actorName} thêm làm quản trị viên của nhóm!`;
        } else {
          message = `🔻 ${targetName} đã bị ${actorName} gỡ khỏi quyền quản trị viên.`;
        }

        if (message) {
          await api.sendMessage(message, event.threadID);
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin user trong admin-change event:", error);
      }
    } catch (error) {
      console.error("Lỗi trong admin-change event:", error);
    }
  }
};

export = command;
