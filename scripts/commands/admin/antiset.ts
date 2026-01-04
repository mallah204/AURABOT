import { ICommand, IRunParams, isEventRunParams } from '@types';
import { hasPermission } from '@main/utils/permissions';

const command: ICommand = {
  config: {
    name: 'antiset',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Bật/tắt các tính năng Anti (anti-out, anti-change-info)',
    category: 'Admin',
    usages: '!antiset [anti-out|anti-change-info] [on|off]',
    role: 1, // Admin nhóm
    aliases: ['anticonfig']
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

    const feature = args[0]?.toLowerCase();
    const action = args[1]?.toLowerCase();

    if (!feature || !action) {
      await send(
        '⚙️ Cấu hình Anti Features\n\n' +
        '📝 Cú pháp: !antiset [feature] [on|off]\n\n' +
        '🔧 Các tính năng:\n' +
        '• anti-out - Tự động add lại thành viên out\n' +
        '• anti-change-info - Chặn đổi tên/icon nhóm\n\n' +
        '📌 Ví dụ: !antiset anti-out on'
      );
      return;
    }

    const validFeatures = ['anti-out', 'anti-change-info'];
    if (!validFeatures.includes(feature)) {
      await send('❌ Tính năng không hợp lệ! Các tính năng: anti-out, anti-change-info');
      return;
    }

    const isOn = action === 'on' || action === 'true' || action === '1';
    const settingKey = feature === 'anti-out' ? 'antiOut' : 'antiChangeInfo';

    try {
      await Threads.updateSetting(event.threadID, settingKey, isOn);
      await send(
        `✅ Đã ${isOn ? 'bật' : 'tắt'} ${feature}!\n\n` +
        `📌 Trạng thái: ${isOn ? '🟢 Bật' : '🔴 Tắt'}`
      );
    } catch (error) {
      await send('❌ Có lỗi xảy ra!');
    }
  }
};

export = command;
