import Thread from '../models/Thread';

// Helper function to retry database operations on SQLITE_BUSY errors
async function retryOnBusy<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isBusyError = error?.code === 'SQLITE_BUSY' ||
        error?.parent?.code === 'SQLITE_BUSY' ||
        error?.original?.code === 'SQLITE_BUSY';

      if (isBusyError && attempt < maxRetries) {
        const waitTime = delay * attempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export const Threads = {
  getData: async (threadID: string, name?: string, prefix?: string, rankup?: boolean): Promise<Thread> => {
    const [thread, created] = await retryOnBusy(async () => {
      return await Thread.findOrCreate({
        where: { threadID },
        defaults: {
          threadID,
          name: name || "Nhóm chưa đặt tên",
          prefix: prefix || "!",
          rankup: rankup || false
        }
      });
    });

    let updated = false;
    if (name && thread.name !== name) {
      thread.name = name;
      updated = true;
    }
    if (prefix && thread.prefix !== prefix) {
      thread.prefix = prefix;
      updated = true;
    }
    if (rankup !== undefined && thread.rankup !== rankup) {
      thread.rankup = rankup;
      updated = true;
    }
    if (updated) {
      await retryOnBusy(async () => {
        await thread.save();
      });
    }

    return thread;
  },

  getSettings: async (threadID: string): Promise<Record<string, any>> => {
    const thread = await Threads.getData(threadID);
    if (!thread.settings) return {};
    try {
      return JSON.parse(thread.settings);
    } catch {
      return {};
    }
  },

  setSettings: async (threadID: string, settings: Record<string, any>): Promise<void> => {
    const thread = await Threads.getData(threadID);
    thread.settings = JSON.stringify(settings);
    await retryOnBusy(async () => {
      await thread.save();
    });
  },

  updateSetting: async (threadID: string, key: string, value: any): Promise<void> => {
    const settings = await Threads.getSettings(threadID);
    settings[key] = value;
    await Threads.setSettings(threadID, settings);
  },

  getInfo: async (threadID: string): Promise<Thread | null> => {
    return await retryOnBusy(async () => {
      return await Thread.findByPk(threadID);
    });
  },

  updateInfo: async (threadID: string, info: Record<string, unknown>): Promise<void> => {
    const thread = await Threads.getData(threadID);
    thread.info = { ...(thread.info || {}), ...info };
    await retryOnBusy(async () => {
      await thread.save();
    });
  },

  getInfoData: async (threadID: string): Promise<Record<string, unknown>> => {
    const thread = await Threads.getData(threadID);
    return (thread.info as Record<string, unknown>) || {};
  }
};
