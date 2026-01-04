import { ICommand, IRunParams, isEventRunParams } from '@types';

const command: ICommand = {
  config: {
    name: 'gamble',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Cờ bạc - Tài xỉu và Bầu cua',
    category: 'Fun',
    usages: '!gamble [taixiu|baucua] <số tiền>',
    aliases: ['coban']
  },

  run: async (params: IRunParams | any) => {
    if (isEventRunParams(params)) return;
    const typedParams = params as IRunParams;
    const { api, event, args, Users, send } = typedParams;
    const game = args[0]?.toLowerCase() || 'taixiu';
    const amount = parseInt(args[1]);

    if (!amount || amount <= 0) {
      await send('❌ Vui lòng nhập số tiền cược hợp lệ!\n📝 Cú pháp: !gamble taixiu <số tiền>');
      return;
    }

    try {
      const user = await Users.getData(event.senderID);
      if (user.money < amount) {
        await send('❌ Bạn không đủ tiền để cược!');
        return;
      }

      if (game === 'taixiu' || game === 'tx') {
        // Tài xỉu: 3 xúc xắc, tổng 4-10 = Xỉu, 11-17 = Tài
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const dice3 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2 + dice3;
        const result = total >= 11 ? 'Tài' : 'Xỉu';

        // User chọn Tài hoặc Xỉu (mặc định Tài nếu không chỉ định)
        const userChoice = args[2]?.toLowerCase() || 'tài';
        const isWin = (userChoice === 'tài' && result === 'Tài') ||
          (userChoice === 'xỉu' && result === 'Xỉu');

        if (isWin) {
          const winAmount = Math.floor(amount * 1.8); // 80% profit
          await Users.addMoney(event.senderID, winAmount - amount);
          await send(
            `🎲 Kết quả Tài Xỉu:\n\n` +
            `🎯 Xúc xắc: ${dice1} + ${dice2} + ${dice3} = ${total}\n` +
            `📊 Kết quả: ${result}\n` +
            `✅ Bạn thắng ${winAmount}$!\n` +
            `💰 Số dư: ${user.money + winAmount - amount}$`
          );
        } else {
          await Users.decreaseMoney(event.senderID, amount);
          await send(
            `🎲 Kết quả Tài Xỉu:\n\n` +
            `🎯 Xúc xắc: ${dice1} + ${dice2} + ${dice3} = ${total}\n` +
            `📊 Kết quả: ${result}\n` +
            `❌ Bạn thua ${amount}$!\n` +
            `💰 Số dư: ${user.money - amount}$`
          );
        }
      } else if (game === 'baucua' || game === 'bc') {
        // Bầu cua: 3 xúc xắc với 6 mặt (Bầu, Cua, Tôm, Cá, Nai, Gà)
        const faces = ['🦀', '🦐', '🐟', '🦌', '🐔', '🍈'];
        const faceNames = ['Cua', 'Tôm', 'Cá', 'Nai', 'Gà', 'Bầu'];
        const dice1 = Math.floor(Math.random() * 6);
        const dice2 = Math.floor(Math.random() * 6);
        const dice3 = Math.floor(Math.random() * 6);

        const results = [dice1, dice2, dice3];
        const resultFaces = results.map(i => faces[i]);
        const resultNames = results.map(i => faceNames[i]);

        // User chọn mặt (mặc định Cua)
        const userChoice = args[2]?.toLowerCase() || 'cua';
        const choiceIndex = faceNames.findIndex(name =>
          name.toLowerCase() === userChoice ||
          faces.find(f => f === userChoice)
        );

        if (choiceIndex === -1) {
          await send('❌ Mặt không hợp lệ! Các mặt: Cua, Tôm, Cá, Nai, Gà, Bầu');
          return;
        }

        const winCount = results.filter(i => i === choiceIndex).length;
        if (winCount > 0) {
          const winAmount = Math.floor(amount * (1 + winCount * 0.5)); // 50% per match
          await Users.addMoney(event.senderID, winAmount - amount);
          await send(
            `🎲 Kết quả Bầu Cua:\n\n` +
            `🎯 Kết quả: ${resultFaces.join(' ')}\n` +
            `📊 ${resultNames.join(' - ')}\n` +
            `✅ Bạn chọn ${faceNames[choiceIndex]} và thắng ${winCount} lần!\n` +
            `💰 Nhận được: ${winAmount}$\n` +
            `💵 Số dư: ${user.money + winAmount - amount}$`
          );
        } else {
          await Users.decreaseMoney(event.senderID, amount);
          await send(
            `🎲 Kết quả Bầu Cua:\n\n` +
            `🎯 Kết quả: ${resultFaces.join(' ')}\n` +
            `📊 ${resultNames.join(' - ')}\n` +
            `❌ Bạn chọn ${faceNames[choiceIndex]} nhưng không trúng!\n` +
            `💸 Mất: ${amount}$\n` +
            `💰 Số dư: ${user.money - amount}$`
          );
        }
      } else {
        await send('❌ Game không hợp lệ! Các game: taixiu, baucua');
      }
    } catch (error) {
      await send('❌ Có lỗi xảy ra!');
    }
  }
};

export = command;
