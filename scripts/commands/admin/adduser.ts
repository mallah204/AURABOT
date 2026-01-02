import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: "adduser",
    version: "1.0.0",
    author: "Donix",
    description: "Thêm người dùng vào nhóm",
    category: "Admin",
    usages: "!adduser <userID>",
    role: 1 // Admin nhóm
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, args, send } = params as IRunParams;

    if (!event.isGroup) {
      await send("Lệnh này chỉ dùng trong nhóm!");
      return;
    }

    if (args.length === 0) {
      await send("Vui lòng nhập userID cần thêm!");
      return;
    }

    const userID = args[0];

    try {
      api.addUserToGroup(userID, event.threadID, async (err?: Error) => {
        if (err) {
          await send(`❌ Lỗi khi thêm: ${err.message}`);
        } else {
          await send(`✅ Đã thêm người dùng ${userID} vào nhóm!`);
        }
      });
    } catch (error) {
      await send("❌ Có lỗi xảy ra khi thêm người dùng!");
    }
  }
};

export = command;
