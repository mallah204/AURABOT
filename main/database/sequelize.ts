import path from 'path';
import { Sequelize } from 'sequelize';

const DB_PATH = path.resolve(__dirname, '../../storage/sqlite/database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false,
  define: {
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  retry: {
    max: 3
  }
});

export default sequelize;
