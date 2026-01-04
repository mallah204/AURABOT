import { ICommand, IRunParams, isEventRunParams } from '@types';
import { hasPermission } from '@main/utils/permissions';

const command: ICommand = {
  config: {
    name: 'warn',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Cảnh báo thành viên (3 warn = auto kick)',
    category: 'Admin',
    usages: '!warn [@tag hoặc uid] [lý do]',
    role: 1, // Admin nhóm
    aliases: ['cảnh báo', 'warning']
  },

  run: async (params: IRunParams | any) => {
    if (isEventRunParams(params)) return;
    const typedParams = params as IRunParams;
    const { api, event, args, Threads, send } = typedParams;

    // Check permission
    const hasAccess = await hasPermission(api, event.senderID, event, 1);
    if (!hasAccess) {
      await send('❌ Bạn không có quyền sử dụng lệnh này!');
      return;
    }

    if (!args[0]) {
      await send('❌ Vui lòng tag hoặc nhập UID người cần cảnh báo!\n📝 Cú pháp: !warn [@tag hoặc uid] [lý do]');
      return;
    }

    // Get target
    let targetUID = '';
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetUID = Object.keys(event.mentions)[0];
    } else {
      targetUID = args[0];
    }

    if (!targetUID) {
      await send('❌ Không tìm thấy người dùng!');
      return;
    }

    const reason = args.slice(1).join(' ') || 'Không có lý do';

    try {
      const result = await Threads.addWarn(event.threadID, targetUID, reason);

      // Get user info
      let userName = targetUID;
      try {
        const userInfo = await api.getUserInfo(targetUID);
        userName = userInfo[targetUID]?.name || targetUID;
      } catch (e) {
        // Ignore
      }

      await send(
        `⚠️ Đã cảnh báo ${userName}!\n\n` +
        `📝 Lý do: ${reason}\n` +
        `🔢 Số lần cảnh báo: ${result.warns}/${result.maxWarns}\n` +
        (result.warns >= result.maxWarns
          ? `🔴 Đã đạt giới hạn! Sẽ tự động kick nếu vi phạm thêm.\n`
          : `⚠️ Còn ${result.maxWarns - result.warns} lần nữa sẽ bị kick.`)
      );

      // Auto kick if max warns reached
      if (result.warns >= result.maxWarns) {
        try {
          await api.removeUserFromGroup(targetUID, event.threadID);
          await send(`🔴 Đã tự động kick ${userName} do đạt ${result.maxWarns} cảnh báo!`);
          await Threads.clearWarns(event.threadID, targetUID);
        } catch (error: any) {
          await send(`⚠️ Không thể kick ${userName}. Bot có thể không có quyền.`);
        }
      }
    } catch (error) {
      await send('❌ Có lỗi xảy ra!');
    }
  }
};

export = command;
