import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "approval-mode",
    version: "1.0.0",
    type: "log:thread-approval-mode",
    description: "Thông báo khi chế độ phê duyệt thành viên thay đổi",
    category: "Events"
  },

  onLoad: async () => {
    // Khởi tạo khi load event handler
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, Users, Threads } = params as IEventRunParams;

    try {
      const settings = await Threads.getSettings(event.threadID);

      if (!settings.approvalNotify) return; // Chỉ chạy nếu bật thông báo

      const logMessageData = event.logMessageData as any;
      if (!logMessageData) return;

      const approvalMode = logMessageData.approval_mode || logMessageData.APPROVAL_MODE;
      const authorID = logMessageData.admin || logMessageData.ADMIN_ID;

      if (!authorID) return;

      try {
        const userInfo = await api.getUserInfo(authorID);
        const userName = userInfo[authorID]?.name || "Ai đó";

        let message = "";

        if (approvalMode === 1) {
          message = `🔒 ${userName} đã bật chế độ phê duyệt thành viên. Giờ cần admin phê duyệt trước khi vào nhóm.`;
        } else {
          message = `🔓 ${userName} đã tắt chế độ phê duyệt thành viên. Mọi người có thể tham gia tự do.`;
        }

        await api.sendMessage(message, event.threadID);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin user trong approval-mode event:", error);
      }
    } catch (error) {
      console.error("Lỗi trong approval-mode event:", error);
    }
  }
};

export = command;
