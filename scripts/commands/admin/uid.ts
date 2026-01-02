import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
    config: {
        name: "uid",
        hasPrefix: true,
        description: "Lấy UID người dùng",
        category: "Admin"
    },

    run: async (params: IRunParams | IEventRunParams) => {
        const { api, event } = params as IRunParams;
        api.sendMessage(`UID của bạn: ${event.senderID}`, event.threadID);
    }
};

export = command;
