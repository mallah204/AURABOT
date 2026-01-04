import { ICommand, IRunParams, isEventRunParams } from '@types';
import { askAI } from '@main/utils/ai';

const command: ICommand = {
  config: {
    name: 'ask',
    version: '1.0.0',
    author: 'AURABOT',
    description: 'Hỏi AI (Gemini) bất cứ điều gì',
    category: 'Fun',
    usages: '!ask <câu hỏi>',
    aliases: ['ai', 'hỏi', 'gemini']
  },

  run: async (params: IRunParams | any) => {
    if (isEventRunParams(params)) return;
    const typedParams = params as IRunParams;
    const { api, event, args, send } = typedParams;

    if (!args[0]) {
      await send('❌ Vui lòng nhập câu hỏi!\n📝 Cú pháp: !ask <câu hỏi>\n\n💡 Ví dụ: !ask Thời tiết hôm nay thế nào?');
      return;
    }

    const question = args.join(' ');

    try {
      await send('🤔 Đang suy nghĩ...');
      const response = await askAI(question);
      await send(`🤖 AI: ${response}`);
    } catch (error) {
      await send('❌ Có lỗi xảy ra khi gọi AI!');
    }
  }
};

export = command;
