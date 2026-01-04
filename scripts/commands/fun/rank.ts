import { ICommand, IRunParams, isEventRunParams } from '@types';
import axios from 'axios';
import { createCanvas, loadImage } from 'canvas';

const command: ICommand = {
  config: {
    name: 'rank',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Xem rank card với EXP và level',
    category: 'Fun',
    usages: '!rank [@tag hoặc uid]',
    aliases: ['level', 'card']
  },

  run: async (params: IRunParams | any) => {
    if (isEventRunParams(params)) return;
    const typedParams = params as IRunParams;
    const { api, event, args, Users, send } = typedParams;

    let targetUID = event.senderID;
    if (args[0] && event.mentions && Object.keys(event.mentions).length > 0) {
      targetUID = Object.keys(event.mentions)[0];
    } else if (args[0]) {
      targetUID = args[0];
    }

    try {
      const user = await Users.getData(targetUID);

      // Calculate level from EXP (100 EXP per level, exponential growth)
      const calculateLevel = (exp: number): number => {
        let level = 1;
        let requiredExp = 100;
        let currentExp = exp;

        while (currentExp >= requiredExp) {
          currentExp -= requiredExp;
          level++;
          requiredExp = Math.floor(requiredExp * 1.5); // Exponential growth
        }

        return level;
      };

      const calculateExpForLevel = (level: number): number => {
        let totalExp = 0;
        let requiredExp = 100;
        for (let i = 1; i < level; i++) {
          totalExp += requiredExp;
          requiredExp = Math.floor(requiredExp * 1.5);
        }
        return totalExp;
      };

      const level = calculateLevel(user.exp);
      const currentLevelExp = calculateExpForLevel(level);
      const nextLevelExp = calculateExpForLevel(level + 1);
      const expForCurrentLevel = user.exp - currentLevelExp;
      const expNeededForNext = nextLevelExp - currentLevelExp;
      const progress = (expForCurrentLevel / expNeededForNext) * 100;

      // Get user avatar
      let avatarBuffer: Buffer | null = null;
      try {
        const userInfo = await api.getUserInfo(targetUID);
        const user = userInfo[targetUID];
        // Try different possible property names for avatar
        const avatarURL = (user as any)?.profilePic || (user as any)?.avatarURL || (user as any)?.thumbSrc || '';
        if (avatarURL) {
          const response = await axios.get(avatarURL, { responseType: 'arraybuffer' });
          avatarBuffer = Buffer.from(response.data);
        }
      } catch (e) {
        // Use default avatar
      }

      // Create canvas
      const canvas = createCanvas(800, 300);
      const ctx = canvas.getContext('2d');

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 300);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 300);

      // Avatar circle
      if (avatarBuffer) {
        try {
          const avatar = await loadImage(avatarBuffer);
          ctx.save();
          ctx.beginPath();
          ctx.arc(150, 150, 80, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(avatar, 70, 70, 160, 160);
          ctx.restore();
        } catch (e) {
          // Draw default avatar circle
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(150, 150, 80, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(150, 150, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(user.name || 'Người dùng', 280, 100);

      ctx.font = '24px Arial';
      ctx.fillText(`Level ${level}`, 280, 140);

      // EXP bar background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(280, 180, 480, 30);

      // EXP bar fill
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(280, 180, (480 * progress) / 100, 30);

      // EXP text
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText(`${expForCurrentLevel} / ${expNeededForNext} EXP`, 290, 202);

      // Stats
      ctx.font = '18px Arial';
      ctx.fillText(`💰 Tiền: ${user.money}$`, 280, 240);
      ctx.fillText(`⭐ EXP: ${user.exp}`, 500, 240);

      // Convert to buffer
      const buffer = canvas.toBuffer('image/png');

      // Send image
      await send({
        body: `📊 Rank Card của ${user.name}\n\n` +
          `⭐ Level: ${level}\n` +
          `💵 Tiền: ${user.money}$\n` +
          `📈 EXP: ${user.exp} (${progress.toFixed(1)}% đến level ${level + 1})`,
        attachment: buffer
      });
    } catch (error) {
      await send('❌ Có lỗi xảy ra khi tạo rank card!');
    }
  }
};

export = command;
