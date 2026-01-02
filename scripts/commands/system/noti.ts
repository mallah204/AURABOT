import { ICommand, IEventRunParams, IRunParams } from '@types';
import { Threads } from '@main/database/controllers/threadController';

const command: ICommand = {
  config: {
    name: "noti",
    version: "1.0.0",
    author: "Donix",
    description: "Bật/tắt thông báo lệnh sự kiện trong nhóm",
    category: "System",
    role: 1 // Yêu cầu Admin nhóm
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, send } = params as IRunParams;
    const { threadID, isGroup } = event;

    if (!isGroup) {
      await send("❌ Lệnh này chỉ dùng được trong nhóm!");
      return;
    }

    try {
      const settings = await Threads.getSettings(threadID);
      const currentStatus = settings.eventNotifications !== false; // Mặc định là true

      // Toggle trạng thái
      const newStatus = !currentStatus;
      await Threads.updateSetting(threadID, 'eventNotifications', newStatus);

      const statusText = newStatus ? '✅ BẬT' : '❌ TẮT';
      const emoji = newStatus ? '🔔' : '🔕';

      await send(
        `${emoji} Đã ${newStatus ? 'bật' : 'tắt'} thông báo lệnh sự kiện!\n\n` +
        `Trạng thái hiện tại: ${statusText}\n` +
        `Các thông báo sự kiện (welcome, goodbye, admin-change, v.v.) sẽ ${newStatus ? 'được' : 'không được'} gửi trong nhóm này.`
      );
    } catch (error) {
      console.error("Lỗi trong lệnh noti:", error);
      await send("❌ Có lỗi xảy ra khi thay đổi cài đặt!");
    }
  }
};

export = command;
