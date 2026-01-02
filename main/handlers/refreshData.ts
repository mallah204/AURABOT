import type { IFCAU_API, IFCAU_User } from '@dongdev/fca-unofficial';
import type { ThreadEventType } from '../../types';
import { Threads } from '../database/controllers/threadController';
import { Users } from '../database/controllers/userController';
import Thread from '../database/models/Thread';
import User from '../database/models/User';
import { logger } from '../utils/logger';

interface IdObject {
  id?: string;
  userFbId?: string | number;
  user_id?: string | number;
  [key: string]: unknown;
}

function toIdObj(v: unknown): { id: string } {
  if (typeof v === "object" && v !== null) {
    const obj = v as IdObject;
    const id = obj.id || obj.userFbId || obj.user_id || obj;
    return { id: String(id) };
  }
  return { id: String(v) };
}

function normalizeList(arr: unknown[]): Array<{ id: string }> {
  if (!Array.isArray(arr)) return [];
  const map = new Map<string, { id: string }>();
  for (const x of arr) {
    const obj = toIdObj(x);
    map.set(obj.id, obj);
  }
  return Array.from(map.values());
}

interface UserInfo {
  name?: string;
  gender?: string;
  [key: string]: unknown;
}

interface ThreadInfo {
  threadName?: string;
  adminIDs?: Array<{ id: string }>;
  userInfo?: Array<{ id?: string;[key: string]: unknown }>;
  participantIDs?: string[];
  approvalMode?: boolean;
  emoji?: string;
  threadTheme?: { id?: string; accessibility_label?: string };
  color?: string;
  nicknames?: Record<string, string>;
  messageCount?: Record<string, unknown>;
  [key: string]: unknown;
}

async function getUserInfoWithRetry(
  api: IFCAU_API,
  id: string,
  maxRetries: number = 3
): Promise<UserInfo | undefined> {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < maxRetries; i++) {
    try {
      const userInfoResult: Record<string, IFCAU_User> = await new Promise((resolve) => {
        api.getUserInfo(id, (err: Error | null, ret: Record<string, IFCAU_User> | null) => {
          if (err) {
            return resolve({});
          }
          resolve((ret || {}) as Record<string, IFCAU_User>);
        });
      });

      const u = userInfoResult[id];
      if (u && typeof u === "object" && "name" in u && u.name) {
        return {
          ...u,
          name: u.name,
          gender: u.gender ? String(u.gender) : undefined
        } as UserInfo;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`Retry ${i + 1} get info ${id}: ${message}`);
    }
    await delay(1000);
  }
  return undefined;
}

export async function refreshDataHandler(
  api: IFCAU_API,
  event: ThreadEventType
): Promise<void> {
  const { threadID, logMessageType, logMessageData } = event;

  if (!threadID || !logMessageType || !logMessageData) return;

  try {
    const thread = await Threads.getInfo(threadID);
    if (!thread) return;

    const info = (thread.info ?? {}) as ThreadInfo;

    const up = async () => {
      await Threads.updateInfo(threadID, info);
    };

    switch (logMessageType) {
      case "log:thread-name": {
        if (logMessageData) {
          info.threadName = logMessageData.name as string | undefined;
          if (info.threadName) {
            thread.name = info.threadName;
            await thread.save();
          }
          logger.success?.(`Đổi tên nhóm ${threadID} -> ${info.threadName}`);
          await up();
        }
        break;
      }

      case "log:thread-admins": {
        if (!logMessageData) break;
        const logData = logMessageData as any;
        const listRaw =
          logData.ADMIN_LIST ||
          logData.admins ||
          logData.admin_ids ||
          logData.adminsList ||
          logData.ADMIN_IDS;

        if (Array.isArray(listRaw) && listRaw.length) {
          info.adminIDs = normalizeList(listRaw as unknown[]);
          logger.success?.(`Đồng bộ QTV nhóm "${info.threadName || threadID}" (${info.adminIDs.length})`);
          await up();
          break;
        }

        const add =
          logData.ADMIN_EVENT === "add_admin" || logData.action === "add";
        const target = String(
          logData.TARGET_ID ||
          logData.target_id ||
          logData.userFbId ||
          logData.id ||
          ""
        );

        info.adminIDs = normalizeList((info.adminIDs || []) as unknown[]);

        if (target) {
          if (add) {
            if (!info.adminIDs.some((a) => a.id === target)) {
              info.adminIDs.push({ id: target });
            }
          } else {
            info.adminIDs = info.adminIDs.filter((a) => a.id !== target);
          }

          const user = await Users.getInfo(target);
          const name = user?.name || target;
          logger.success?.(
            `Nhóm "${info.threadName || threadID}" ${add ? "thêm" : "xóa"} QTV: ${name} (${target})`
          );
          await up();
        }
        break;
      }

      case "log:subscribe": {
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        const addedParticipants = (event?.logMessageData?.addedParticipants as Array<{ userFbId?: string | number; fullName?: string } | unknown>) || [];
        const added = Array.isArray(addedParticipants) ? addedParticipants : [];
        const done = new Set<string>();

        info.userInfo = Array.isArray(info.userInfo) ? info.userInfo : [];

        for (const p of added) {
          const participant = p as { userFbId?: string | number; fullName?: string };
          const uid = String(participant.userFbId);
          if (done.has(uid)) continue;

          done.add(uid);

          try {
            let u = await Users.getInfo(uid);
            let ui = u?.info as UserInfo | undefined;

            if (!u || !ui?.name) {
              const retriedUi = await getUserInfoWithRetry(api, uid);
              if (retriedUi) {
                ui = retriedUi;
              }
            }

            if (!ui || !ui.name) {
              logger.error?.(`Cannot get info for user ${uid}`);
              continue;
            }

            const merge = { id: uid, ...ui };
            const i = info.userInfo.findIndex((x: { id?: string } | unknown) => {
              const obj = x as { id?: string };
              return obj?.id === uid;
            });

            if (i !== -1) {
              info.userInfo[i] = { ...(info.userInfo[i] as Record<string, unknown>), ...merge };
            } else {
              info.userInfo.push(merge);
            }

            if (!u) {
              const gender = (ui.gender as string) || "UNKNOWN";
              const newUser = await Users.getData(uid, ui.name || participant.fullName || "Undefined User", gender);
              newUser.info = ui;
              await newUser.save();
              logger.success?.(`Created new user: ${ui.name || participant.fullName || "Undefined User"} (${uid})`);
            } else {
              const updatedInfo = { ...(u.info as Record<string, unknown> || {}), ...ui };
              u.info = updatedInfo;
              if (u.name !== ui.name && ui.name) {
                u.name = ui.name;
              }
              if (u.gender !== ui.gender && ui.gender) {
                u.gender = ui.gender as string;
              }
              await u.save();
            }

            logger.info?.(`User ${participant.fullName || ui.name || uid} joined [${info.threadName || "Unknown"}]`);
            await delay(300);
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logger.error?.(`Process user ${uid} failed: ${message}`);
          } finally {
            done.delete(uid);
          }
        }

        await up();
        break;
      }

      case "log:unsubscribe": {
        if (!logMessageData) break;
        const uid = String(logMessageData.leftParticipantFbId);
        const user = await Users.getInfo(uid);
        const name = user?.name || uid;

        if (uid === String(api.getCurrentUserID())) {
          await Thread.destroy({ where: { threadID } });
          logger.success?.(`Bot rời nhóm ${info.threadName || threadID}, đã xoá dữ liệu`);
          return;
        }

        info.participantIDs = Array.isArray(info.participantIDs)
          ? (info.participantIDs as string[]).filter((id) => id !== uid)
          : [];
        info.userInfo = Array.isArray(info.userInfo)
          ? info.userInfo.filter((u) => {
            const obj = u as { id?: string };
            return obj?.id !== uid;
          })
          : [];

        await up();

        const allThreads = await Thread.findAll();
        const still = allThreads.some(
          (t) => {
            const threadInfo = (t.info as ThreadInfo | undefined);
            return (
              t.threadID !== threadID &&
              (threadInfo?.userInfo || []).some((u: { id?: string }) => u?.id === uid)
            );
          }
        );

        const mc = info.messageCount as Record<string, unknown> | undefined;

        if (mc) {
          for (const k of ["total", "week", "day", "month"]) {
            if (Array.isArray(mc[k])) {
              const arr = mc[k] as Array<{ id?: string }>;
              mc[k] = arr.filter((x: { id?: string }) => x.id !== uid);
            }
          }
          info.messageCount = mc;
          await up();
          logger.success?.(
            `Đã xoá thống kê của ${name} (${uid}) khỏi nhóm ${info.threadName || "Unknown"}`
          );
        }

        if (still) {
          const ud = await Users.getInfo(uid);
          if (ud && ud.info) {
            const joinedThreads = (ud.info as Record<string, unknown>).joinedThreads as Record<string, unknown> | undefined;
            if (joinedThreads) {
              const jt = Object.fromEntries(
                Object.entries(joinedThreads).filter(([id]) => id !== threadID)
              );
              ud.info = { ...(ud.info as Record<string, unknown>), joinedThreads: jt };
              await ud.save();
            }
          }
          logger.success?.(
            `Đã xoá thời gian tham gia của ${name} (${uid}) tại nhóm ${info.threadName || threadID}`
          );
          logger.success?.(`User ${name} (${uid}) rời nhóm ${info.threadName || "Unknown"}, vẫn còn ở nhóm khác`);
        } else {
          await User.destroy({ where: { uid } });
          logger.success?.(`User ${name} (${uid}) rời tất cả nhóm, đã xoá dữ liệu người dùng`);
        }

        break;
      }

      case "log:thread-approval-mode": {
        if (!logMessageData) break;
        const mode = logMessageData.APPROVAL_MODE === "1";
        info.approvalMode = mode;
        logger.success?.(`Phê duyệt nhóm [${info.threadName || threadID}]: ${mode ? "Bật" : "Tắt"}`);
        await up();
        break;
      }

      case "log:thread-color": {
        if (!logMessageData) break;
        const accessibility_label = logMessageData.accessibility_label as string | undefined;
        const theme_emoji = logMessageData.theme_emoji as string | undefined;
        const theme_color = logMessageData.theme_color as string | undefined;
        const theme_id = logMessageData.theme_id as string | undefined;
        info.emoji = theme_emoji;
        info.threadTheme = { id: theme_id, accessibility_label };
        info.color = theme_color;
        logger.success?.(
          `Cập nhật chủ đề [${info.threadName || threadID}]: ${accessibility_label}, emoji: ${theme_emoji}, color: ${theme_color}`
        );
        await up();
        break;
      }

      case "log:user-nickname": {
        if (!logMessageData) break;
        const participant_id = logMessageData.participant_id as string | undefined;
        const nickname = logMessageData.nickname as string | undefined;
        info.nicknames = info.nicknames ?? {};

        if (nickname === "" && participant_id) {
          delete info.nicknames[participant_id];
          logger.success?.(`Xoá biệt danh ${participant_id} trong ${info.threadName || threadID}`);
        } else if (participant_id && nickname !== undefined) {
          info.nicknames[participant_id] = nickname;
          logger.success?.(`Cập nhật biệt danh ${participant_id} -> "${nickname}" trong ${info.threadName || threadID}`);
        }

        await up();
        break;
      }

      case "log:thread-icon": {
        if (!logMessageData) break;
        const logData = logMessageData as any;
        const emoji = (logData.thread_quick_reaction_emoji ?? logData.thread_icon) as string | undefined;
        info.emoji = emoji;
        logger.success?.(`Biểu tượng nhóm [${info.threadName || threadID}] -> ${emoji}`);
        await up();
        break;
      }

      default:
        return;
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error
      ? (e.stack || e.message)
      : JSON.stringify(e);
    logger.error?.(`Lỗi cập nhật threadData: ${errorMessage}`);
  }
}
