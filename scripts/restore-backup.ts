/**
 * Script restore backup - Khôi phục về version cũ
 * Usage: ts-node scripts/restore-backup.ts [version]
 * Example: ts-node scripts/restore-backup.ts 1.0.0
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { logger } from '../main/utils/logger';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

function recursiveReadDirAndRestore(backupPath: string, restorePath: string): void {
  if (!fs.existsSync(backupPath)) return;

  const stat = fs.statSync(backupPath);

  if (stat.isDirectory()) {
    if (!fs.existsSync(restorePath)) {
      fs.mkdirSync(restorePath, { recursive: true });
    }

    const entries = fs.readdirSync(backupPath);
    for (const entry of entries) {
      recursiveReadDirAndRestore(
        path.join(backupPath, entry),
        path.join(restorePath, entry)
      );
    }
  } else {
    // Tạo folder nếu chưa có
    const dir = path.dirname(restorePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.copyFileSync(backupPath, restorePath);
  }
}

(async () => {
  let versionBackup: string;

  if (process.argv.length < 3) {
    versionBackup = await question('Input version backup: ');
  } else {
    versionBackup = process.argv[2];
  }

  if (!versionBackup) {
    logger.error('❌ Please input version backup');
    process.exit(1);
  }

  // Remove backup_ prefix nếu có
  versionBackup = versionBackup.replace(/^backup_/, '');
  versionBackup = `backup_${versionBackup}`;

  const rootDir = path.resolve(__dirname, '..');
  const backupFolder = path.join(rootDir, 'backups', versionBackup);

  if (!fs.existsSync(backupFolder)) {
    logger.error(`❌ Backup folder không tồn tại: ${backupFolder}`);
    process.exit(1);
  }

  logger.info(`🔄 Đang restore backup: ${versionBackup}...`);

  const files = fs.readdirSync(backupFolder);
  for (const file of files) {
    const backupPath = path.join(backupFolder, file);
    const restorePath = path.join(rootDir, file);
    recursiveReadDirAndRestore(backupPath, restorePath);
  }

  // Cập nhật version trong package.json
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = versionBackup.replace('backup_', '');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  logger.info(`✅ Restore backup ${versionBackup} thành công!`);
  logger.info(`📌 Version hiện tại: ${packageJson.version}`);
  logger.info('💡 Khởi động lại bot để áp dụng thay đổi.');

  rl.close();
})();
