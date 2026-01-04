import type { IFCAU_API } from '@dongdev/fca-unofficial';
import { ICommand, ThreadEventType } from '../../types';
import { client } from '../client';
import { Threads } from '../database/controllers/threadController';
import { Users } from '../database/controllers/userController';
import { logger } from '../utils/logger';
import { refreshDataHandler } from './refreshData';

export const handleEvent = async (
  api: IFCAU_API,
  event: ThreadEventType
): Promise<void> => {
  // Kiểm tra cài đặt thông báo sự kiện
  try {
    const settings = await Threads.getSettings(event.threadID);
    // Nếu eventNotifications bị tắt (false), bỏ qua tất cả event commands
    // Mặc định là true (undefined hoặc không có = bật)
    if (settings.eventNotifications === false) {
      return;
    }
  } catch (error) {
    // Nếu có lỗi khi lấy settings, vẫn tiếp tục xử lý (mặc định bật)
    logger.debug("Không thể lấy settings cho event, tiếp tục xử lý:", error);
  }

  const processedCommands = new Set<ICommand>();

  // Xử lý commands có type (event handlers mới)
  for (const command of [...client.commands.values(), ...client.noprefix.values()]) {
    if (command.config.type && !processedCommands.has(command)) {
      const eventTypes = Array.isArray(command.config.type)
        ? command.config.type
        : [command.config.type];

      // Kiểm tra xem event type có match không
      if (event.logMessageType && eventTypes.includes(event.logMessageType)) {
        processedCommands.add(command);
        try {
          await command.run({
            api,
            event,
            config: command.config,
            Users,
            Threads
          });
        } catch (error) {
          logger.error(`Lỗi run trong event command ${command.config.name}:`, error);
        }
      }
    }
  }

  // Xử lý commands có handleEvent (backward compatibility)
  for (const command of [...client.commands.values(), ...client.noprefix.values()]) {
    if (command.handleEvent && !processedCommands.has(command)) {
      processedCommands.add(command);
      try {
        await command.handleEvent({
          api,
          event,
          config: command.config,
          Users,
          Threads
        });
      } catch (error) {
        logger.error(`Lỗi handleEvent trong command ${command.config.name}:`, error);
      }
    }
  }
};

export const onEvent = async (
  api: IFCAU_API,
  event: ThreadEventType
): Promise<void> => {
  // Tự động refresh data sau mỗi sự kiện
  await refreshDataHandler(api, event);
};
