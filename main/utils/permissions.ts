import type { IFCAU_API, IFCAU_Thread } from '@dongdev/fca-unofficial';
import type { CommandRole, MessageEventType } from '../../types';
import { isAdmin, isOwner } from '../config';

const groupAdminCache = new Map<string, { admins: string[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

export const isGroupAdmin = async (
  api: IFCAU_API,
  userID: string,
  threadID: string
): Promise<boolean> => {
  try {
    const userIDStr = String(userID);
    const cached = groupAdminCache.get(threadID);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.admins.some(adminID => String(adminID) === userIDStr);
    }

    const threadInfo: IFCAU_Thread | null = await new Promise((resolve) => {
      api.getThreadInfo(threadID, (err: Error | null, info: IFCAU_Thread | null) => {
        if (err) {
          return resolve(null);
        }
        resolve(info);
      });
    });

    if (threadInfo) {
      const adminIDs = threadInfo.adminIDs || [];

      groupAdminCache.set(threadID, {
        admins: adminIDs,
        timestamp: Date.now()
      });

      return adminIDs.some(adminID => String(adminID) === userIDStr);
    }

    return false;
  } catch (error) {
    return false;
  }
};

export const getUserRole = async (
  api: IFCAU_API,
  userID: string | number,
  event: MessageEventType
): Promise<CommandRole> => {
  // Kiểm tra Owner trước (level 3 - cao nhất)
  if (isOwner(userID)) {
    return 3;
  }

  // Kiểm tra Admin bot (level 2)
  if (isAdmin(userID)) {
    return 2;
  }

  // Kiểm tra Admin nhóm (level 1)
  if (event.isGroup) {
    const userIDStr = String(userID);
    const isGroupAdminUser = await isGroupAdmin(api, userIDStr, event.threadID);
    if (isGroupAdminUser) {
      return 1;
    }
  }

  // User thường (level 0)
  return 0;
};

export const hasPermission = async (
  api: IFCAU_API,
  userID: string | number,
  event: MessageEventType,
  requiredRole: CommandRole
): Promise<boolean> => {
  const userRole = await getUserRole(api, userID, event);
  // Owner (3) có thể dùng lệnh 3-0, Admin bot (2) dùng 2-0, Admin nhóm (1) dùng 1-0, User (0) chỉ dùng 0
  return userRole >= requiredRole;
};

export const clearGroupAdminCache = (threadID: string): void => {
  groupAdminCache.delete(threadID);
};

export const clearAllGroupAdminCache = (): void => {
  groupAdminCache.clear();
};
