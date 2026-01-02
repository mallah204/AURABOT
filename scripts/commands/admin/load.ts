import { loadSingleCommand, loadMultipleCommands, loadCommands } from '@main/loader';
import { client } from '@main/client';
import { IRunParams, IEventRunParams, ICommand } from '@types';

const command: ICommand = {
  config: {
    name: "load",
    version: "1.0.0",
    author: "Donix",
    description: "Tải lại lệnh (theo tên hoặc all)",
    category: "System",
    usages: "!load <tên lệnh> hoặc !load all",
    role: 2 // Admin bot
  },

  run: async (params: IRunParams | IEventRunParams) => {
    const { api, event, args, send } = params as IRunParams;

    if (args.length === 0) {
      await send(
        "Vui lòng nhập tên lệnh cần tải lại!\n" +
        "• !load <tên lệnh> - Tải lại 1 lệnh\n" +
        "• !load <tên1> <tên2> ... - Tải lại nhiều lệnh\n" +
        "• !load all - Tải lại tất cả lệnh\n" +
        "Ví dụ: !load ping hoặc !load ping help hoặc !load all"
      );
      return;
    }

    const target = args[0].toLowerCase();

    if (target === "all") {
      client.commands.clear();
      client.noprefix.clear();
      await loadCommands();
      await send("✅ Đã tải lại tất cả lệnh");
    } else if (args.length === 1) {
      const result = await loadSingleCommand(target);
      await send(result.message);
    } else {
      const commandNames = args.map(arg => arg.toLowerCase());
      const result = await loadMultipleCommands(commandNames);
      await send(result.message);
    }
  }
};

export = command;
