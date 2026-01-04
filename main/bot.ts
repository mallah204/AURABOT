import type { IFCAU_API } from '@dongdev/fca-unofficial';
import login from '@dongdev/fca-unofficial';
import fs from 'fs';
import { APPSTATE_PATH, config, EVENTS_DIR } from './config';
import { handleEvent } from './handlers';
import { loadCommands } from './loader';
import { logger } from './utils/logger';

export const startBot = async (): Promise<void> => {
  logger.info('📦 Đang load commands...');
  await loadCommands();
  logger.info('📦 Đang load events...');
  await loadCommands(EVENTS_DIR);
  logger.info('✅ Đã load commands và events');

  if (!fs.existsSync(APPSTATE_PATH)) {
    logger.error(`❌ Thiếu file appstate.json tại: ${APPSTATE_PATH}`);
    throw new Error(`Appstate file not found: ${APPSTATE_PATH}`);
  }

  logger.info('🔐 Đang đọc appstate.json...');
  const appState = JSON.parse(fs.readFileSync(APPSTATE_PATH, 'utf8'));
  logger.info('🔐 Đang thực hiện login...');

  return new Promise<void>((resolve, reject) => {
    const loginTimeout = setTimeout(() => {
      logger.error('⏱️ Login timeout sau 60 giây');
      reject(new Error('Login timeout'));
    }, 60000); // 60 seconds timeout

    login({ appState }, (err: Error | null, api: IFCAU_API | null) => {
      clearTimeout(loginTimeout);

      if (err) {
        console.error("❌ Login lỗi:", err);
        logger.error("Login lỗi:", err);
        reject(err);
        return;
      }

      if (!api) {
        logger.error("❌ API không được trả về từ login");
        reject(new Error('API is null'));
        return;
      }

      logger.success('✅ Login thành công!');

      try {
        fs.writeFileSync(APPSTATE_PATH, JSON.stringify(api.getAppState(), null, 2));
        logger.info('✅ Đã lưu appstate mới');
      } catch (writeErr) {
        logger.warn('⚠️ Không thể lưu appstate:', writeErr);
      }

      api.setOptions(config);
      logger.info('✅ Đã set API options');

      logger.info('👂 Đang lắng nghe events...');
      api.listenMqtt(async (err, event) => {
        if (err) {
          logger.error("Lỗi listenMqtt:", err);
          return;
        }
        await handleEvent(api, event);
      });

      logger.success('✅ Bot đã sẵn sàng!');
      resolve();
    });
  });
};
