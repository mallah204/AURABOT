import User from '../models/User';

export const Users = {
  getData: async (uid: string, name?: string, gender?: string): Promise<User> => {
    const [user, created] = await User.findOrCreate({
      where: { uid },
      defaults: {
        uid,
        name: name || "Người dùng Facebook",
        gender: gender || "Unknown",
        money: 0,
        exp: 0
      }
    });

    let updated = false;
    if (name && user.name !== name) {
      user.name = name;
      updated = true;
    }
    if (gender && user.gender !== gender) {
      user.gender = gender;
      updated = true;
    }
    if (updated) {
      await user.save();
    }

    return user;
  },

  addMoney: async (uid: string, amount: number): Promise<number> => {
    const user = await Users.getData(uid);
    user.money += amount;
    await user.save();
    return user.money;
  },

  decreaseMoney: async (uid: string, amount: number): Promise<boolean> => {
    const user = await Users.getData(uid);
    if (user.money < amount) return false;
    user.money -= amount;
    await user.save();
    return true;
  },

  addExp: async (uid: string, amount: number): Promise<number> => {
    const user = await Users.getData(uid);
    user.exp += amount;
    await user.save();
    return user.exp;
  },

  getInfo: async (uid: string): Promise<User | null> => {
    return await User.findByPk(uid);
  },

  getTopMoney: async (limit: number = 10): Promise<User[]> => {
    return await User.findAll({
      order: [['money', 'DESC']],
      limit
    });
  },

  getTopExp: async (limit: number = 10): Promise<User[]> => {
    return await User.findAll({
      order: [['exp', 'DESC']],
      limit
    });
  },

  // Banking methods
  deposit: async (uid: string, amount: number): Promise<{ success: boolean; message: string; bank?: number; money?: number }> => {
    const user = await Users.getData(uid);
    if (user.money < amount) {
      return { success: false, message: '❌ Bạn không đủ tiền!' };
    }
    user.money -= amount;
    user.bank = (user.bank || 0) + amount;
    await user.save();
    return { success: true, message: '✅ Gửi tiết kiệm thành công!', bank: user.bank, money: user.money };
  },

  withdraw: async (uid: string, amount: number): Promise<{ success: boolean; message: string; bank?: number; money?: number }> => {
    const user = await Users.getData(uid);
    if ((user.bank || 0) < amount) {
      return { success: false, message: '❌ Số dư ngân hàng không đủ!' };
    }
    user.bank = (user.bank || 0) - amount;
    user.money += amount;
    await user.save();
    return { success: true, message: '✅ Rút tiền thành công!', bank: user.bank, money: user.money };
  },

  calculateInterest: async (uid: string): Promise<number> => {
    const user = await Users.getData(uid);
    const bankAmount = user.bank || 0;
    // 5% interest per day
    const interest = Math.floor(bankAmount * 0.05);
    if (interest > 0) {
      user.bank = bankAmount + interest;
      await user.save();
    }
    return interest;
  },

  // Rob methods
  setJail: async (uid: string, minutes: number): Promise<void> => {
    const user = await Users.getData(uid);
    user.inJail = true;
    user.jailUntil = Date.now() + (minutes * 60 * 1000);
    await user.save();
  },

  checkJail: async (uid: string): Promise<{ inJail: boolean; timeLeft?: number }> => {
    const user = await Users.getData(uid);
    if (!user.inJail || !user.jailUntil) {
      return { inJail: false };
    }
    if (Date.now() >= user.jailUntil) {
      user.inJail = false;
      user.jailUntil = 0;
      await user.save();
      return { inJail: false };
    }
    return { inJail: true, timeLeft: user.jailUntil - Date.now() };
  },

  setLastRob: async (uid: string): Promise<void> => {
    const user = await Users.getData(uid);
    user.lastRob = Date.now();
    await user.save();
  }
};
