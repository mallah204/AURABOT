import { ICommand, IEventRunParams, IRunParams } from '@types';

const command: ICommand = {
    config: {
        name: "nickname-change",
        version: "1.0.0",
        type: "log:user-nickname",
        description: "Thông báo khi nickname thành viên được thay đổi",
        category: "Events"
    },

    onLoad: async () => {},
    run: async (params: IRunParams | IEventRunParams) => {
        const { api, event, Users, Threads } = params as IEventRunParams;

        try {
            const settings = await Threads.getSettings(event.threadID);

            if (!settings.nicknameNotify) return; // Chỉ chạy nếu bật thông báo

            const logMessageData = event.logMessageData;
            if (!logMessageData) return;

            const participantID = logMessageData.participant_id;
            const nickname = logMessageData.nickname;
            const authorID = logMessageData.author;

            if (!participantID || !authorID) return;

            try {
                const [participantInfo, authorInfo] = await Promise.all([
                    api.getUserInfo(participantID),
                    api.getUserInfo(authorID)
                ]);

                const participantName = participantInfo[participantID]?.name || "Ai đó";
                const authorName = authorInfo[authorID]?.name || "Ai đó";

                let message = "";

                if (nickname) {
                    message = `🏷️ ${authorName} đã đổi nickname của ${participantName} thành: "${nickname}"`;
                } else {
                    message = `🏷️ ${authorName} đã xóa nickname của ${participantName}`;
                }

                await api.sendMessage(message, event.threadID);
            } catch (error) {
                console.error("Lỗi khi lấy thông tin user trong nickname-change event:", error);
            }
        } catch (error) {
            console.error("Lỗi trong nickname-change event:", error);
        }
    }
};

export = command;
