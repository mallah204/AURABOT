import { botConfig, isAdmin } from '@main/config';
import { logger } from '@main/utils/logger';
import { checkRepoClean, getLatestRelease, updateBot } from '@main/utils/updater';
import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "update",
    version: "1.0.0",
    author: "DongDev",
    description: "Cập nhật bot từ GitHub Release (chỉ admin)",
    category: "Admin",
    usages: "!update [check|beta|main]",
    role: 2 // Admin bot
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, args, send } = params as IRunParams;
    const { threadID, senderID } = event;

    // Chỉ admin mới được dùng
    if (!isAdmin(senderID)) {
      await send("❌ Chỉ admin mới được dùng lệnh này!");
      return;
    }

    // Lấy config GitHub từ config.json
    const githubConfig = (botConfig as any).github;
    if (!githubConfig || !githubConfig.owner || !githubConfig.repo) {
      await send(
        "❌ Chưa cấu hình GitHub repo!\n" +
        "Vui lòng thêm vào config.json:\n" +
        "{\n" +
        '  "github": {\n' +
        '    "owner": "username",\n' +
        '    "repo": "repo-name"\n' +
        "  }\n" +
        "}"
      );
      return;
    }

    const action = args[0]?.toLowerCase() || 'check';
    const channel = args[0]?.toLowerCase() === 'beta' ? 'beta' : 'main';

    try {
      if (action === 'check') {
        // Chỉ kiểm tra release mới nhất
        await send("🔍 Đang kiểm tra release mới nhất...");

        const repoCheck = await checkRepoClean();
        if (!repoCheck.clean) {
          await send(`⚠️ ${repoCheck.message}\n\nKhông thể cập nhật khi repo có thay đổi chưa commit!`);
          return;
        }

        const releaseResult = await getLatestRelease(
          githubConfig.owner,
          githubConfig.repo,
          channel
        );

        if (!releaseResult.success || !releaseResult.release) {
          await send(releaseResult.message);
          return;
        }

        const release = releaseResult.release;
        const packageJson = require('../../../package.json');
        const currentVersion = packageJson.version || '0.0.0';

        let message = `📦 Release mới nhất:\n`;
        message += `• Tag: ${release.tag_name}\n`;
        message += `• Tên: ${release.name || 'N/A'}\n`;
        message += `• Channel: ${release.prerelease ? 'Beta' : 'Stable'}\n`;
        message += `• Ngày: ${new Date(release.published_at).toLocaleString('vi-VN')}\n`;
        message += `\n📌 Version hiện tại: ${currentVersion}\n`;

        if (release.tag_name.replace(/^v/i, '') === currentVersion) {
          message += `\n✅ Đã ở phiên bản mới nhất!`;
        } else {
          message += `\n🔄 Có phiên bản mới! Dùng !update để cập nhật.`;
        }

        await send(message);
        return;
      }

      if (action === 'beta' || action === 'main') {
        // Thực hiện cập nhật
        await send(
          `🔄 Đang bắt đầu cập nhật từ channel: ${channel.toUpperCase()}...\n` +
          `⏳ Quá trình này có thể mất vài phút, vui lòng đợi...`
        );

        const progressMessages: string[] = [];
        const sendProgress = (msg: string) => {
          progressMessages.push(msg);
          logger.info(`[Update Progress] ${msg}`);
        };

        const result = await updateBot(
          {
            owner: githubConfig.owner,
            repo: githubConfig.repo,
            channel: channel
          },
          sendProgress
        );

        if (result.success) {
          await send(
            `✅ ${result.message}\n\n` +
            `📋 Log cập nhật:\n${progressMessages.slice(-5).join('\n')}`
          );
        } else {
          await send(
            `❌ ${result.message}\n\n` +
            `📋 Log:\n${progressMessages.slice(-5).join('\n')}`
          );
        }
        return;
      }

      // Action không hợp lệ
      await send(
        "📖 Cách sử dụng:\n" +
        "• !update check - Kiểm tra release mới nhất\n" +
        "• !update main - Cập nhật từ channel stable\n" +
        "• !update beta - Cập nhật từ channel beta\n\n" +
        "⚠️ Lưu ý: Bot sẽ tự động khởi động lại sau khi cập nhật!"
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Lỗi update command:', error);
      await send(`❌ Lỗi: ${errorMsg}`);
    }
  }
};

export = command;
