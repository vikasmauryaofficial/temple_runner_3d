/**
 * Economy, Shop, and Progression Manager.
 * Handles coin currency, persistent upgrades, skin unlocks, and local storage.
 */

const STORAGE_KEY = 'temple_runner_save_v1';

export const SKINS = [
  { id: 'explorer', name: 'Relic Explorer', price: 0, unlocked: true, color: 0x9e7b45, jacket: 0x5c4028, pants: 0x3d3224 },
  { id: 'golden', name: 'Golden Idol', price: 250, unlocked: false, color: 0xffd700, jacket: 0xd4af37, pants: 0xb8860b },
  { id: 'ninja', name: 'Shadow Ninja', price: 500, unlocked: false, color: 0x111111, jacket: 0x222222, pants: 0x0a0a0a, accent: 0xe60000 },
  { id: 'cyber', name: 'Cyber Nomad', price: 1000, unlocked: false, color: 0x00f0ff, jacket: 0x1a1a2e, pants: 0x16213e, accent: 0xff007f }
];

export const UPGRADES = {
  jetpack: {
    name: 'Jetpack Fuel',
    icon: '🚀',
    baseVal: 7, // seconds
    stepVal: 1.5,
    maxLevel: 5,
    costs: [100, 250, 500, 1000, 2000]
  },
  magnet: {
    name: 'Coin Magnet',
    icon: '🧲',
    baseVal: 8, // seconds
    stepVal: 2.0,
    maxLevel: 5,
    costs: [80, 200, 450, 900, 1800]
  },
  shield: {
    name: 'Totem Shield',
    icon: '🛡️',
    baseVal: 1, // hits absorbed
    stepVal: 1,
    maxLevel: 3,
    costs: [150, 400, 800]
  },
  boost: {
    name: 'Relic Rush',
    icon: '⚡',
    baseVal: 5, // seconds
    stepVal: 1.0,
    maxLevel: 5,
    costs: [120, 300, 600, 1200, 2500]
  }
};

class ShopManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
    return {
      coins: 0,
      highScore: 0,
      selectedSkin: 'explorer',
      unlockedSkins: ['explorer'],
      upgradeLevels: {
        jetpack: 1,
        magnet: 1,
        shield: 1,
        boost: 1
      }
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }

  getCoins() {
    return this.data.coins;
  }

  addCoins(amount) {
    this.data.coins += amount;
    this.save();
    return this.data.coins;
  }

  getHighScore() {
    return this.data.highScore;
  }

  checkHighScore(score) {
    if (score > this.data.highScore) {
      this.data.highScore = score;
      this.save();
      return true;
    }
    return false;
  }

  getUpgradeLevel(type) {
    return this.data.upgradeLevels[type] || 1;
  }

  getUpgradeValue(type) {
    const config = UPGRADES[type];
    const lvl = this.getUpgradeLevel(type);
    return config.baseVal + (lvl - 1) * config.stepVal;
  }

  getUpgradeCost(type) {
    const config = UPGRADES[type];
    const lvl = this.getUpgradeLevel(type);
    if (lvl >= config.maxLevel) return null;
    return config.costs[lvl - 1];
  }

  purchaseUpgrade(type) {
    const cost = this.getUpgradeCost(type);
    if (cost === null || this.data.coins < cost) return false;

    this.data.coins -= cost;
    this.data.upgradeLevels[type] += 1;
    this.save();
    return true;
  }

  getSelectedSkin() {
    return this.data.selectedSkin;
  }

  isSkinUnlocked(skinId) {
    return this.data.unlockedSkins.includes(skinId);
  }

  selectSkin(skinId) {
    if (this.isSkinUnlocked(skinId)) {
      this.data.selectedSkin = skinId;
      this.save();
      return true;
    }
    return false;
  }

  purchaseSkin(skinId) {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin || this.isSkinUnlocked(skinId) || this.data.coins < skin.price) {
      return false;
    }
    this.data.coins -= skin.price;
    this.data.unlockedSkins.push(skinId);
    this.data.selectedSkin = skinId;
    this.save();
    return true;
  }

  getSkinConfig(skinId = null) {
    const id = skinId || this.data.selectedSkin;
    return SKINS.find(s => s.id === id) || SKINS[0];
  }
}

export const shop = new ShopManager();
