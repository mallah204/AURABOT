import path from 'path';
import fs from 'fs';
import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

// Sử dụng DB_PATH từ env nếu có, nếu không thì dùng default
let dbPath = process.env.DB_PATH || './storage/sqlite/database.sqlite';
// Nếu là relative path, resolve từ project root
if (!path.isAbsolute(dbPath)) {
  dbPath = path.resolve(__dirname, '../..', dbPath);
}

const DB_PATH = dbPath;
const DB_DIR = path.dirname(DB_PATH);

// Cảnh báo nếu database nằm trong OneDrive
if (DB_PATH.toLowerCase().includes('onedrive')) {
  logger.warn('⚠️ CẢNH BÁO: Database nằm trong OneDrive folder!');
  logger.warn('⚠️ OneDrive có thể lock file và gây lỗi. Nên di chuyển database ra ngoài OneDrive.');
}

// Đảm bảo thư mục database tồn tại
if (!fs.existsSync(DB_DIR)) {
  logger.info(`📁 Đang tạo thư mục database: ${DB_DIR}`);
  fs.mkdirSync(DB_DIR, { recursive: true });
  logger.info('✅ Đã tạo thư mục database');
}

// Kiểm tra và tạo database file nếu chưa tồn tại
if (!fs.existsSync(DB_PATH)) {
  logger.info('📄 Database file chưa tồn tại, sẽ được tạo tự động');
  // Tạo file rỗng để SQLite có thể khởi tạo
  fs.writeFileSync(DB_PATH, '');
}

logger.info(`💾 Database path: ${DB_PATH}`);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: (msg) => {
    // Chỉ log errors và warnings
    if (msg.includes('error') || msg.includes('Error') || msg.includes('warning')) {
      logger.warn(`[SQL] ${msg}`);
    }
  },
  define: {
    freezeTableName: true
  },
  dialectOptions: {
    // Kích hoạt WAL mode để tăng hiệu năng đọc/ghi song song
    mode: 'WAL' as any
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 3
  }
});

export default sequelize;
