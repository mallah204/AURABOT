import { startBot } from './bot';
import { botConfig } from './config';
import { initCookies } from './cookie';
import type { LogLevel } from './utils/logger';
// Use Winston logger if available, fallback to simple logger
let logger: any;
try {
  logger = require('./utils/loggerWinston').default;
} catch (e) {
  logger = require('./utils/logger').logger;
  logger.setConfig({
    level: botConfig.logger.level as LogLevel,
    enableColors: botConfig.logger.enableColors,
    enableTimestamp: botConfig.logger.enableTimestamp
  });
}

// Initialize global cookies
initCookies();

// Global Error Handler - Cải tiến cho LTS
let isShuttingDown = false;

const gracefulShutdown = async (signal: string, error?: Error | unknown): Promise<void> => {
  if (isShuttingDown) {
    logger.warn('⚠️ Đang trong quá trình shutdown, bỏ qua signal:', signal);
    return;
  }

  isShuttingDown = true;
  logger.warn(`⚠️ Nhận signal ${signal}, bắt đầu graceful shutdown...`);

  try {
    // Close database connections
    try {
      const { sequelize } = await import('./database');
      await sequelize.close();
      logger.info('✅ Đã đóng kết nối database');
    } catch (err) {
      logger.error('❌ Lỗi khi đóng database:', err);
    }

    // Clear message queue
    try {
      const { messageQueue } = await import('./utils/messageQueue');
      messageQueue.clear();
      logger.info('✅ Đã clear message queue');
    } catch (err) {
      // Ignore if messageQueue not initialized
    }

    logger.info('✅ Graceful shutdown hoàn tất');
    process.exit(error ? 1 : 0);
  } catch (err) {
    logger.error('❌ Lỗi trong quá trình shutdown:', err);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('❌ Uncaught Exception:', error);
  logger.error('Stack:', error.stack);

  // Log to file if available (will be implemented with Winston)
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);

  // Don't exit immediately, try graceful shutdown
  gracefulShutdown('uncaughtException', error).catch(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('❌ Unhandled Rejection tại promise:', promise);
  logger.error('Reason:', reason);

  if (reason instanceof Error) {
    logger.error('Stack:', reason.stack);
  }

  console.error('Unhandled Rejection:', reason);

  // Log but don't exit for unhandled rejections (less critical)
  // Only exit if it's a critical error
  if (reason instanceof Error && reason.message.includes('ECONNREFUSED')) {
    logger.error('❌ Critical connection error, shutting down...');
    gracefulShutdown('unhandledRejection', reason).catch(() => {
      process.exit(1);
    });
  }
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle warnings
process.on('warning', (warning: Error) => {
  logger.warn('⚠️ Process Warning:', warning.name);
  logger.warn('Message:', warning.message);
  logger.warn('Stack:', warning.stack);
});

const showBanner = (): void => {
};

const main = async (): Promise<void> => {
  try {
    showBanner();
    logger.info('🔄 Đang kết nối database...');
    const { connectDB } = await import('./database/index');
    await connectDB();
    logger.info('🔄 Đang khởi động bot...');
    await startBot();
    logger.info('✅ Bot đã được khởi động, đang đợi login...');
  } catch (error) {
    console.error('ERROR:', error);
    logger.error('Lỗi khởi động bot:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
      logger.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
};

main();
