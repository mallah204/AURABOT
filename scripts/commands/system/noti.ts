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

      // Khi bật, tự động bật các event riêng lẻ nếu chưa được set
      if (newStatus) {
        const eventsToEnable = ['welcome', 'goodbye', 'adminNotify', 'nameChangeNotify', 'iconChangeNotify', 'nicknameNotify', 'approvalNotify'];
        let hasChanges = false;

        for (const eventName of eventsToEnable) {
          // Chỉ bật nếu chưa được set (undefined) hoặc đang là false
          if (settings[eventName] === false || settings[eventName] === undefined) {
            settings[eventName] = true;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await Threads.setSettings(threadID, settings);
        }
      }

      const statusText = newStatus ? '✅ BẬT' : '❌ TẮT';
      const emoji = newStatus ? '🔔' : '🔕';

      let message = `${emoji} Đã ${newStatus ? 'bật' : 'tắt'} thông báo lệnh sự kiện!\n\n` +
        `Trạng thái hiện tại: ${statusText}\n`;

      if (newStatus) {
        message += `\n✅ Đã tự động bật tất cả các sự kiện:\n` +
          `• Welcome (chào mừng)\n` +
          `• Goodbye (tạm biệt)\n` +
          `• Admin-change (thay đổi admin)\n` +
          `• Và các sự kiện khác\n\n` +
          `💡 Dùng !event <tên> <on|off> để tắt từng sự kiện riêng lẻ nếu cần.`;
      } else {
        message += `\n⚠️ Tất cả thông báo sự kiện đã bị tắt trong nhóm này.`;
      }

      await send(message);
    } catch (error) {
      console.error("Lỗi trong lệnh noti:", error);
      await send("❌ Có lỗi xảy ra khi thay đổi cài đặt!");
    }
  }
};

export = command;
