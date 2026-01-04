import { logger } from '../utils/logger';
import Thread from './models/Thread';
import User from './models/User';
import sequelize from './sequelize';

const loadCache = async (): Promise<void> => {
  try {
    const { client } = await import('../client');

    const users = await User.findAll({ attributes: ['uid'] });
    users.forEach(user => {
      client.data.users.add(user.uid);
    });

    const threads = await Thread.findAll({ attributes: ['threadID'] });
    threads.forEach(thread => {
      client.data.threads.add(thread.threadID);
    });

  } catch (error) {
    logger.warn('⚠️ Không thể load cache từ database:', error);
  }
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: ${operation} mất quá ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
};

export const connectDB = async (): Promise<void> => {
  try {
    logger.info('🔌 Đang test kết nối database...');

    // Thử test connection bằng một query đơn giản trước
    try {
      await withTimeout(sequelize.query('SELECT 1'), 10000, 'Test connection');
      logger.info('✅ Test connection thành công');
    } catch (testError) {
      logger.warn('⚠️ Test connection thất bại, thử authenticate...');
      // Nếu test query thất bại, thử authenticate
      try {
        await withTimeout(sequelize.authenticate(), 15000, 'Database authenticate');
        logger.info('✅ Database authenticate thành công');
      } catch (authError) {
        logger.error('❌ Lỗi authenticate:', authError);
        // Thử lại một lần nữa với timeout dài hơn
        logger.info('🔄 Đang thử lại authenticate...');
        await withTimeout(sequelize.authenticate(), 30000, 'Database authenticate retry');
        logger.info('✅ Database authenticate thành công (lần 2)');
      }
    }

    logger.info('⚙️ Đang cấu hình SQLite...');
    // Set SQLite busy timeout to 30 seconds (30000ms)
    // This tells SQLite to wait up to 30 seconds for the database to become available
    await sequelize.query('PRAGMA busy_timeout = 30000');

    // Enable WAL mode for better concurrency
    await sequelize.query('PRAGMA journal_mode = WAL');
    await sequelize.query('PRAGMA synchronous = NORMAL');
    await sequelize.query('PRAGMA cache_size = -64000'); // 64MB cache
    logger.info('✅ Đã cấu hình SQLite');

    logger.info('🔄 Đang sync database models...');
    await withTimeout(sequelize.sync({ alter: true }), 60000, 'Database sync');
    logger.info('✅ Đã sync models');

    logger.info('📦 Đang load cache...');
    await withTimeout(loadCache(), 10000, 'Load cache');
    logger.success('✅ Database đã kết nối với WAL mode');
  } catch (error) {
    logger.error('❌ Không thể kết nối Database:', error);
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export default sequelize;
export { sequelize };
