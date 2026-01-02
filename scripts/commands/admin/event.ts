import { ICommand, IEventRunParams, IRunParams } from '@types';
import { Threads } from '@main/database/controllers/threadController';

const command: ICommand = {
  config: {
    name: "event",
    version: "1.0.0",
    author: "Donix",
    description: "Bật/tắt các sự kiện trong nhóm (welcome, goodbye)",
    category: "Admin",
    usages: "!event <welcome|goodbye> <on|off>",
    role: 1
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, args, send } = params as IRunParams;

    if (!event.isGroup) {
      await send("❌ Lệnh này chỉ dùng trong nhóm!");
      return;
    }

    // Hệ thống đã tự động kiểm tra role qua hasPermission trong handler
    // Owner (3), Admin bot (2) và Admin nhóm (1) đều có thể dùng lệnh này

    if (args.length < 2) {
      await send(
        "📋 Cách dùng:\n" +
        "• !event welcome on - Bật chào mừng thành viên mới\n" +
        "• !event welcome off - Tắt chào mừng thành viên mới\n" +
        "• !event goodbye on - Bật thông báo rời nhóm\n" +
        "• !event goodbye off - Tắt thông báo rời nhóm\n\n" +
        "💡 Ví dụ: !event welcome on"
      );
      return;
    }

    const eventType = args[0]?.toLowerCase();
    const action = args[1]?.toLowerCase();

    if (!['welcome', 'goodbye'].includes(eventType)) {
      await send("❌ Loại sự kiện không hợp lệ! Chỉ hỗ trợ: welcome, goodbye");
      return;
    }

    if (!['on', 'off'].includes(action)) {
      await send("❌ Hành động không hợp lệ! Chỉ hỗ trợ: on, off");
      return;
    }

    try {
      const settings = await Threads.getSettings(event.threadID);
      const isEnabled = action === 'on';

      settings[eventType] = isEnabled;
      await Threads.setSettings(event.threadID, settings);

      const status = isEnabled ? '✅ Bật' : '❌ Tắt';
      const eventName = eventType === 'welcome' ? 'Chào mừng thành viên mới' : 'Thông báo rời nhóm';

      await send(`${status} ${eventName}!`);
    } catch (error) {
      await send("❌ Có lỗi xảy ra khi cập nhật cài đặt!");
      console.error("Lỗi trong event command:", error);
    }
  }
};

export = command;
