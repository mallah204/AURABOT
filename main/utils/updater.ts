import AdmZip from 'adm-zip';
import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';
import * as _ from 'lodash';
import path from 'path';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

interface GitHubRelease {
  tag_name: string;
  name: string;
  prerelease: boolean;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

interface UpdateConfig {
  owner: string;
  repo: string;
  channel?: 'main' | 'beta';
  tempDir?: string;
}

interface VersionInfo {
  version: string;
  files?: Record<string, any>;
  deleteFiles?: Record<string, string>;
  reinstallDependencies?: boolean;
}

/**
 * Kiểm tra xem repo có bẩn không (có thay đổi chưa commit)
 */
export const checkRepoClean = async (): Promise<{ clean: boolean; message: string }> => {
  try {
    const { stdout } = await execAsync('git status --porcelain');
    const hasChanges = stdout.trim().length > 0;

    if (hasChanges) {
      return {
        clean: false,
        message: `⚠️ Repo có thay đổi chưa commit:\n${stdout.trim().substring(0, 500)}`
      };
    }

    return { clean: true, message: '✅ Repo sạch' };
  } catch (error) {
    // Không phải git repo hoặc git chưa được cài
    return { clean: true, message: '⚠️ Không phải git repo hoặc git chưa được cài' };
  }
};

/**
 * Kiểm tra last commit để tránh update quá nhanh (< 5 phút)
 */
export const checkLastCommit = async (
  owner: string,
  repo: string
): Promise<{ canUpdate: boolean; message: string }> => {
  try {
    const { data: lastCommit } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits/main`,
      { timeout: 10000 }
    );

    const lastCommitDate = new Date(lastCommit.commit.committer.date);
    const timeDiff = new Date().getTime() - lastCommitDate.getTime();
    const minWaitTime = 5 * 60 * 1000; // 5 phút

    if (timeDiff < minWaitTime) {
      const minutes = Math.floor((minWaitTime - timeDiff) / 1000 / 60);
      const seconds = Math.floor(((minWaitTime - timeDiff) / 1000) % 60);
      return {
        canUpdate: false,
        message: `⏰ Vừa có commit mới! Vui lòng đợi ${minutes} phút ${seconds} giây nữa để tránh update quá nhanh.`
      };
    }

    return { canUpdate: true, message: '✅ Có thể update' };
  } catch (error) {
    // Nếu không check được, cho phép update
    return { canUpdate: true, message: '⚠️ Không thể check last commit, tiếp tục update...' };
  }
};

/**
 * Lấy thông tin release mới nhất từ GitHub
 */
export const getLatestRelease = async (
  owner: string,
  repo: string,
  channel: 'main' | 'beta' = 'main'
): Promise<{ success: boolean; release?: GitHubRelease; message: string }> => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const response = await axios.get<GitHubRelease[]>(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AURABOT-Updater'
      },
      timeout: 10000
    });

    const releases = response.data;

    if (releases.length === 0) {
      return {
        success: false,
        message: '❌ Không tìm thấy release nào'
      };
    }

    // Lọc theo channel
    let targetRelease: GitHubRelease | undefined;

    if (channel === 'beta') {
      // Beta: lấy release có prerelease = true hoặc tag chứa "beta"
      targetRelease = releases.find(r =>
        r.prerelease || r.tag_name.toLowerCase().includes('beta')
      );
    } else {
      // Main: lấy release stable (prerelease = false)
      targetRelease = releases.find(r => !r.prerelease);
    }

    // Nếu không tìm thấy theo channel, lấy release mới nhất
    if (!targetRelease) {
      targetRelease = releases[0];
    }

    return {
      success: true,
      release: targetRelease,
      message: `✅ Tìm thấy release: ${targetRelease.tag_name}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Lỗi khi lấy release:', error);
    return {
      success: false,
      message: `❌ Lỗi khi lấy release: ${message}`
    };
  }
};

/**
 * So sánh version hiện tại với version mới
 */
export const compareVersions = (currentVersion: string, newVersion: string): boolean => {
  // Loại bỏ "v" prefix nếu có
  const cleanCurrent = currentVersion.replace(/^v/i, '');
  const cleanNew = newVersion.replace(/^v/i, '');

  // So sánh đơn giản (có thể cải thiện với semver)
  return cleanCurrent !== cleanNew;
};

/**
 * Tải file từ URL
 */
export const downloadFile = async (
  url: string,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      timeout: 300000, // 5 phút
      headers: {
        'User-Agent': 'AURABOT-Updater'
      }
    });

    const totalSize = parseInt(response.headers['content-length'] || '0', 10);
    let downloadedSize = 0;

    const writer = fs.createWriteStream(outputPath);

    response.data.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length;
      if (onProgress && totalSize > 0) {
        const progress = Math.round((downloadedSize / totalSize) * 100);
        onProgress(progress);
      }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        resolve({
          success: true,
          message: '✅ Tải xuống thành công'
        });
      });

      writer.on('error', (error) => {
        reject({
          success: false,
          message: `❌ Lỗi khi ghi file: ${error.message}`
        });
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `❌ Lỗi khi tải file: ${message}`
    };
  }
};

/**
 * Giải nén file zip
 */
export const extractZip = async (
  zipPath: string,
  extractTo: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!fs.existsSync(zipPath)) {
      return {
        success: false,
        message: '❌ File zip không tồn tại'
      };
    }

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractTo, true); // true = overwrite

    return {
      success: true,
      message: '✅ Giải nén thành công'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `❌ Lỗi khi giải nén: ${message}`
    };
  }
};

/**
 * Tự động tạo folder nếu chưa tồn tại
 */
const checkAndAutoCreateFolder = (folderPath: string): void => {
  const normalizedPath = path.normalize(folderPath);
  const splitPath = normalizedPath.split(path.sep);
  let currentPath = '';

  for (const segment of splitPath) {
    if (segment) {
      currentPath = path.join(currentPath, segment);
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
      }
    }
  }
};

/**
 * Merge config.json thông minh (giống GoatBot-V2)
 */
const mergeConfig = (
  currentConfig: any,
  updateConfig: Record<string, any>
): any => {
  const merged = _.cloneDeep(currentConfig);

  for (const key in updateConfig) {
    const value = updateConfig[key];

    // Nếu value bắt đầu với "DEFAULT_", lấy giá trị từ key đó
    if (typeof value === 'string' && value.startsWith('DEFAULT_')) {
      const keyOfDefault = value.replace('DEFAULT_', '');
      _.set(merged, key, _.get(merged, keyOfDefault));
    } else {
      // Merge thông minh: nếu là object, merge deep; nếu không, replace
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const currentValue = _.get(merged, key);
        if (typeof currentValue === 'object' && !Array.isArray(currentValue) && currentValue !== null) {
          _.set(merged, key, _.merge({}, currentValue, value));
        } else {
          _.set(merged, key, value);
        }
      } else {
        _.set(merged, key, value);
      }
    }
  }

  return merged;
};

/**
 * Kiểm tra file có skip update không
 */
const shouldSkipFile = (filePath: string): boolean => {
  if (!fs.existsSync(filePath)) return false;

  const contentsSkip = ['DO NOT UPDATE', 'SKIP UPDATE', 'DO NOT UPDATE THIS FILE'];
  const firstLine = fs.readFileSync(filePath, 'utf-8').trim().split(/\r?\n|\r/)[0];

  return contentsSkip.some(skipText => firstLine.includes(skipText));
};

/**
 * Copy file với auto create folder
 */
const copyFileSafe = (src: string, dest: string): void => {
  checkAndAutoCreateFolder(path.dirname(dest));
  fs.copyFileSync(src, dest);
};

/**
 * Write file với auto create folder
 */
const writeFileSafe = (filePath: string, data: string | Buffer): void => {
  checkAndAutoCreateFolder(path.dirname(filePath));
  fs.writeFileSync(filePath, data);
};

/**
 * Atomic replace: thay thế thư mục một cách an toàn với backup
 */
export const atomicReplace = async (
  sourceDir: string,
  targetDir: string,
  protectedFiles: string[] = [],
  backupDir?: string
): Promise<{ success: boolean; message: string; backupPath?: string }> => {
  try {
    const rootDir = path.resolve(__dirname, '../..');
    const sourcePath = path.resolve(sourceDir);
    const targetPath = path.resolve(rootDir, targetDir);

    // Tạo backup folder
    const currentVersion = require(path.join(rootDir, 'package.json')).version || 'unknown';
    const backupsPath = path.join(rootDir, 'backups');
    checkAndAutoCreateFolder(backupsPath);

    const folderBackup = backupDir || path.join(backupsPath, `backup_${currentVersion}_${Date.now()}`);
    checkAndAutoCreateFolder(folderBackup);

    // Kiểm tra source có tồn tại không
    if (!fs.existsSync(sourcePath)) {
      return {
        success: false,
        message: '❌ Thư mục source không tồn tại'
      };
    }

    // Copy protected files từ target sang backup trước
    if (fs.existsSync(targetPath)) {
      for (const protectedFile of protectedFiles) {
        const targetFile = path.join(targetPath, protectedFile);
        if (fs.existsSync(targetFile)) {
          const backupFile = path.join(folderBackup, protectedFile);
          copyFileSafe(targetFile, backupFile);
        }
      }
    }

    // Copy files từ source sang target, bỏ qua protected files và node_modules
    const excludeItems = ['node_modules', '.git', ...protectedFiles];

    const copyItems = (src: string, dest: string): void => {
      if (!fs.existsSync(src)) return;

      const stat = fs.statSync(src);

      if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          if (excludeItems.includes(entry)) continue;

          const srcPath = path.join(src, entry);
          const destPath = path.join(dest, entry);
          copyItems(srcPath, destPath);
        }
      } else {
        // Backup file cũ nếu tồn tại
        if (fs.existsSync(dest)) {
          const relativePath = path.relative(rootDir, dest);
          const backupFile = path.join(folderBackup, relativePath);
          copyFileSafe(dest, backupFile);
        }

        // Copy file mới
        copyFileSafe(src, dest);
      }
    };

    copyItems(sourcePath, targetPath);

    // Restore protected files từ backup
    for (const protectedFile of protectedFiles) {
      const backupFile = path.join(folderBackup, protectedFile);
      const targetFile = path.join(targetPath, protectedFile);

      if (fs.existsSync(backupFile)) {
        const stat = fs.statSync(backupFile);
        if (stat.isDirectory()) {
          // Nếu là folder, xóa và copy lại
          if (fs.existsSync(targetFile)) {
            fs.rmSync(targetFile, { recursive: true, force: true });
          }
          copyItems(backupFile, targetFile);
        } else {
          copyFileSafe(backupFile, targetFile);
        }
        logger.info(`Đã giữ lại file: ${protectedFile}`);
      }
    }

    return {
      success: true,
      message: '✅ Atomic replace thành công',
      backupPath: folderBackup
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Lỗi atomic replace:', error);
    return {
      success: false,
      message: `❌ Lỗi atomic replace: ${message}`
    };
  }
};

/**
 * Restart bot process
 * Exit với code 2 để index.ts tự động restart
 */
export const restartBot = (): void => {
  logger.info('🔄 Đang khởi động lại bot...');

  // Exit với code 2 để index.ts tự động restart (giống GoatBot-V2)
  setTimeout(() => {
    process.exit(2);
  }, 2000);
};

/**
 * Hàm chính để cập nhật bot
 */
export const updateBot = async (
  config: UpdateConfig,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; message: string; backupPath?: string }> => {
  const progress = (msg: string) => {
    logger.info(msg);
    if (onProgress) onProgress(msg);
  };

  try {
    // Bước 1: Kiểm tra repo có sạch không
    progress('📋 Đang kiểm tra repo...');
    const repoCheck = await checkRepoClean();
    if (!repoCheck.clean) {
      return {
        success: false,
        message: repoCheck.message
      };
    }

    // Bước 2: Kiểm tra last commit (tránh update quá nhanh)
    progress('⏰ Đang kiểm tra last commit...');
    const commitCheck = await checkLastCommit(config.owner, config.repo);
    if (!commitCheck.canUpdate) {
      return {
        success: false,
        message: commitCheck.message
      };
    }

    // Bước 3: Lấy release mới nhất
    progress('🔍 Đang kiểm tra release mới nhất...');
    const releaseResult = await getLatestRelease(
      config.owner,
      config.repo,
      config.channel || 'main'
    );

    if (!releaseResult.success || !releaseResult.release) {
      return {
        success: false,
        message: releaseResult.message
      };
    }

    const release = releaseResult.release;
    progress(`📦 Tìm thấy release: ${release.tag_name}`);

    // Bước 4: So sánh version
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version || '0.0.0';

    if (!compareVersions(currentVersion, release.tag_name)) {
      return {
        success: false,
        message: `✅ Đã ở phiên bản mới nhất: ${currentVersion}`
      };
    }

    progress(`🔄 Có phiên bản mới: ${release.tag_name} (hiện tại: ${currentVersion})`);

    // Bước 5: Tìm asset zip hoặc tar.gz
    const zipAsset = release.assets.find(a =>
      a.name.endsWith('.zip') || a.name.endsWith('.tar.gz')
    );

    if (!zipAsset) {
      return {
        success: false,
        message: '❌ Không tìm thấy file zip/tar.gz trong release'
      };
    }

    // Bước 6: Tạo thư mục temp
    const tempDir = config.tempDir || path.resolve(__dirname, '../../temp');
    checkAndAutoCreateFolder(tempDir);

    const zipPath = path.join(tempDir, zipAsset.name);
    const extractDir = path.join(tempDir, `extract-${Date.now()}`);

    // Bước 7: Tải file
    progress(`⬇️ Đang tải ${zipAsset.name}...`);
    const downloadResult = await downloadFile(zipAsset.browser_download_url, zipPath, (progressPercent) => {
      progress(`⬇️ Đang tải: ${progressPercent}%`);
    });

    if (!downloadResult.success) {
      return downloadResult;
    }

    // Bước 8: Giải nén
    progress('📂 Đang giải nén...');
    const extractResult = await extractZip(zipPath, extractDir);
    if (!extractResult.success) {
      return extractResult;
    }

    // Bước 9: Tìm thư mục source trong extract
    const extractContents = fs.readdirSync(extractDir);
    let sourceDir = extractDir;

    if (extractContents.length === 1) {
      const firstItem = path.join(extractDir, extractContents[0]);
      if (fs.statSync(firstItem).isDirectory()) {
        sourceDir = firstItem;
      }
    }

    // Bước 10: Atomic replace với backup
    progress('🔄 Đang thay thế files (atomic với backup)...');
    const protectedFiles = ['config.json', 'appstate.json', 'database.sqlite', 'Fca_Database', 'node_modules'];
    const replaceResult = await atomicReplace(
      sourceDir,
      '.',
      protectedFiles
    );

    if (!replaceResult.success) {
      return replaceResult;
    }

    // Bước 11: Xử lý config.json nếu có trong source
    const sourceConfigPath = path.join(sourceDir, 'config.json');
    const targetConfigPath = path.resolve(__dirname, '../../config.json');

    if (fs.existsSync(sourceConfigPath) && fs.existsSync(targetConfigPath)) {
      try {
        const currentConfig = JSON.parse(fs.readFileSync(targetConfigPath, 'utf8'));
        const sourceConfig = JSON.parse(fs.readFileSync(sourceConfigPath, 'utf8'));

        // Merge config thông minh
        const mergedConfig = mergeConfig(currentConfig, sourceConfig);
        writeFileSafe(targetConfigPath, JSON.stringify(mergedConfig, null, 2));
        progress('✅ Đã merge config.json');
      } catch (error) {
        logger.warn('Không thể merge config.json:', error);
      }
    }

    // Bước 12: Xóa file zip và thư mục extract
    try {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.warn('Không thể xóa file temp:', error);
    }

    // Bước 13: Cập nhật version trong package.json
    try {
      packageJson.version = release.tag_name.replace(/^v/i, '');
      writeFileSafe(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      logger.warn('Không thể cập nhật version:', error);
    }

    progress('✅ Cập nhật thành công! Bot sẽ khởi động lại...');

    // Bước 14: Restart
    setTimeout(() => {
      restartBot();
    }, 2000);

    return {
      success: true,
      message: `✅ Đã cập nhật lên ${release.tag_name} thành công! Bot đang khởi động lại...`,
      backupPath: replaceResult.backupPath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Lỗi khi cập nhật:', error);
    return {
      success: false,
      message: `❌ Lỗi khi cập nhật: ${message}`
    };
  }
};
