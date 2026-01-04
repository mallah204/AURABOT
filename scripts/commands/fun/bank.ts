import { ICommand, IRunParams, isEventRunParams } from '@types';

const command: ICommand = {
  config: {
    name: 'bank',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Ngân hàng - Gửi tiết kiệm và rút tiền',
    category: 'Fun',
    usages: '!bank [deposit|withdraw|balance] <số tiền>',
    aliases: ['nganhang', 'banking']
  },

  run: async (params: IRunParams | any) => {
    if (isEventRunParams(params)) return;
    const typedParams = params as IRunParams;
    const { api, event, args, Users, send } = typedParams;
    const action = args[0]?.toLowerCase() || 'balance';
    const amount = parseInt(args[1]);

    try {
      const user = await Users.getData(event.senderID);

      switch (action) {
        case 'deposit':
        case 'dep':
        case 'gửi': {
          if (!amount || amount <= 0) {
            await send('❌ Vui lòng nhập số tiền hợp lệ!\n📝 Cú pháp: !bank deposit <số tiền>');
            return;
          }
          const result = await Users.deposit(event.senderID, amount);
          await send(
            result.message + '\n\n' +
            `💰 Tiền mặt: ${result.money}$\n` +
            `🏦 Ngân hàng: ${result.bank}$`
          );
          break;
        }

        case 'withdraw':
        case 'rút': {
          if (!amount || amount <= 0) {
            await send('❌ Vui lòng nhập số tiền hợp lệ!\n📝 Cú pháp: !bank withdraw <số tiền>');
            return;
          }
          const result = await Users.withdraw(event.senderID, amount);
          await send(
            result.message + '\n\n' +
            `💰 Tiền mặt: ${result.money}$\n` +
            `🏦 Ngân hàng: ${result.bank}$`
          );
          break;
        }

        case 'balance':
        case 'bal':
        case 'số dư': {
          const bankAmount = user.bank || 0;
          const interest = await Users.calculateInterest(event.senderID);
          await send(
            `🏦 Thông tin ngân hàng:\n\n` +
            `💰 Tiền mặt: ${user.money}$\n` +
            `🏦 Tiền gửi: ${bankAmount}$\n` +
            (interest > 0 ? `💹 Lãi suất hôm nay: +${interest}$ (5%)\n` : '') +
            `📊 Tổng tài sản: ${user.money + (user.bank || 0)}$`
          );
          break;
        }

        default:
          await send(
            '🏦 Hệ thống ngân hàng\n\n' +
            '📝 Các lệnh:\n' +
            '• !bank deposit <số tiền> - Gửi tiết kiệm\n' +
            '• !bank withdraw <số tiền> - Rút tiền\n' +
            '• !bank balance - Xem số dư\n\n' +
            `💰 Tiền mặt: ${user.money}$\n` +
            `🏦 Tiền gửi: ${user.bank || 0}$\n` +
            `💹 Lãi suất: 5%/ngày`
          );
      }
    } catch (error) {
      await send('❌ Có lỗi xảy ra!');
    }
  }
};

export = command;
