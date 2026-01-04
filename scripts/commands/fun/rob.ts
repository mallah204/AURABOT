import { ICommand, IRunParams, isEventRunParams } from '@types';

const ROB_COOLDOWN = 30 * 60 * 1000; // 30 minutes
const JAIL_TIME = 5 * 60 * 1000; // 5 minutes

const command: ICommand = {
  config: {
    name: 'rob',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Ăn trộm tiền của người khác (có thể bị bắt vào tù)',
    category: 'Fun',
    usages: '!rob [@tag hoặc uid]',
    aliases: ['trộm', 'cướp']
  },

  run: async (params: IRunParams | any) => {
    if (isEventRunParams(params)) return;
    const typedParams = params as IRunParams;
    const { api, event, args, Users, send } = typedParams;

    // Check if user is in jail
    const jailCheck = await Users.checkJail(event.senderID);
    if (jailCheck.inJail) {
      const minutes = Math.ceil((jailCheck.timeLeft || 0) / 60000);
      await send(`🔒 Bạn đang trong tù! Còn ${minutes} phút nữa mới được ra.`);
      return;
    }

    // Check cooldown
    const user = await Users.getData(event.senderID);
    const lastRob = user.lastRob || 0;
    const timeLeft = ROB_COOLDOWN - (Date.now() - lastRob);

    if (timeLeft > 0) {
      const minutes = Math.ceil(timeLeft / 60000);
      await send(`⏳ Bạn cần đợi ${minutes} phút nữa mới có thể trộm tiếp!`);
      return;
    }

    // Get target
    let targetUID = event.senderID;
    if (args[0]) {
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetUID = Object.keys(event.mentions)[0];
      } else {
        targetUID = args[0];
      }
    }

    if (targetUID === event.senderID) {
      await send('❌ Bạn không thể trộm chính mình!');
      return;
    }

    try {
      const target = await Users.getData(targetUID);

      if (!target.money || target.money < 100) {
        await send('❌ Người này không có tiền để trộm! (Cần ít nhất 100$)');
        return;
      }

      // 40% chance to succeed
      const success = Math.random() < 0.4;

      if (success) {
        // Success: steal 10-30% of target's money
        const stealPercent = Math.random() * 0.2 + 0.1; // 10-30%
        const stolenAmount = Math.floor(target.money * stealPercent);
        const minSteal = Math.min(stolenAmount, Math.floor(user.money * 0.5)); // Max 50% of robber's money

        await Users.decreaseMoney(targetUID, minSteal);
        await Users.addMoney(event.senderID, minSteal);
        await Users.setLastRob(event.senderID);

        await send(
          `✅ Trộm thành công!\n\n` +
          `💰 Trộm được: ${minSteal}$\n` +
          `💵 Số dư mới: ${user.money + minSteal}$`
        );
      } else {
        // Failed: 30% chance to go to jail
        const goToJail = Math.random() < 0.3;

        if (goToJail) {
          await Users.setJail(event.senderID, 5); // 5 minutes
          await send(
            `🔒 Bạn bị bắt vào tù!\n\n` +
            `⏰ Thời gian: 5 phút\n` +
            `💸 Bị phạt: ${Math.floor(user.money * 0.1)}$`
          );
          await Users.decreaseMoney(event.senderID, Math.floor(user.money * 0.1));
        } else {
          await Users.setLastRob(event.senderID);
          await send('❌ Trộm thất bại! Bạn bị phát hiện nhưng may mắn không bị bắt.');
        }
      }
    } catch (error) {
      await send('❌ Có lỗi xảy ra!');
    }
  }
};

export = command;
