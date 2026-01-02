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

export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();

    // Set SQLite busy timeout to 30 seconds (30000ms)
    // This tells SQLite to wait up to 30 seconds for the database to become available
    await sequelize.query('PRAGMA busy_timeout = 30000');

    await sequelize.sync({ alter: true });
    await loadCache();
  } catch (error) {
    logger.error('❌ Không thể kết nối Database:', error);
    throw error;
  }
};

export default sequelize;
export { sequelize };
