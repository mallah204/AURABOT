import { ICommand, IRunParams, isEventRunParams } from '@types';
import { hasPermission } from '@main/utils/permissions';

const command: ICommand = {
  config: {
    name: 'unwarn',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Xóa cảnh báo của thành viên',
    category: 'Admin',
    usages: '!unwarn [@tag hoặc uid]',
    role: 1, // Admin nhóm
    aliases: ['xóa cảnh báo']
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
      await send('❌ Vui lòng tag hoặc nhập UID người cần xóa cảnh báo!\n📝 Cú pháp: !unwarn [@tag hoặc uid]');
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

    try {
      const warns = await Threads.getWarns(event.threadID, targetUID);

      if (warns === 0) {
        await send('✅ Người này chưa có cảnh báo nào!');
        return;
      }

      await Threads.clearWarns(event.threadID, targetUID);

      // Get user info
      let userName = targetUID;
      try {
        const userInfo = await api.getUserInfo(targetUID);
        userName = userInfo[targetUID]?.name || targetUID;
      } catch (e) {
        // Ignore
      }

      await send(`✅ Đã xóa tất cả cảnh báo của ${userName}!`);
    } catch (error) {
      await send('❌ Có lỗi xảy ra!');
    }
  }
};

export = command;
