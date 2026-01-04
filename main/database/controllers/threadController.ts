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
  },

  // Warn system
  addWarn: async (threadID: string, userID: string, reason?: string): Promise<{ warns: number; maxWarns: number }> => {
    const info = await Threads.getInfoData(threadID);
    const warns = (info.warns as Record<string, number>) || {};
    warns[userID] = (warns[userID] || 0) + 1;

    const warnHistory = (info.warnHistory as Record<string, Array<{ reason?: string; timestamp: number }>>) || {};
    if (!warnHistory[userID]) warnHistory[userID] = [];
    warnHistory[userID].push({
      reason,
      timestamp: Date.now()
    });

    await Threads.updateInfo(threadID, { warns, warnHistory });

    const maxWarns = (await Threads.getSettings(threadID)).maxWarns || 3;
    return { warns: warns[userID], maxWarns };
  },

  getWarns: async (threadID: string, userID: string): Promise<number> => {
    const info = await Threads.getInfoData(threadID);
    const warns = (info.warns as Record<string, number>) || {};
    return warns[userID] || 0;
  },

  clearWarns: async (threadID: string, userID: string): Promise<void> => {
    const info = await Threads.getInfoData(threadID);
    const warns = (info.warns as Record<string, number>) || {};
    const warnHistory = (info.warnHistory as Record<string, any[]>) || {};
    delete warns[userID];
    delete warnHistory[userID];
    await Threads.updateInfo(threadID, { warns, warnHistory });
  },

  // Anti-out: Store previous members
  getPreviousMembers: async (threadID: string): Promise<string[]> => {
    const info = await Threads.getInfoData(threadID);
    return (info.previousMembers as string[]) || [];
  },

  setPreviousMembers: async (threadID: string, members: string[]): Promise<void> => {
    await Threads.updateInfo(threadID, { previousMembers: members });
  },

  // Anti-change-info: Store previous name/icon
  getPreviousName: async (threadID: string): Promise<string | null> => {
    const thread = await Threads.getData(threadID);
    return thread.name || null;
  },

  getPreviousIcon: async (threadID: string): Promise<string | null> => {
    const info = await Threads.getInfoData(threadID);
    return (info.previousIcon as string) || null;
  },

  setPreviousIcon: async (threadID: string, icon: string): Promise<void> => {
    await Threads.updateInfo(threadID, { previousIcon: icon });
  }
};
