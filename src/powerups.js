import { shop } from './shop.js';
import { audio } from './audio.js';

export const POWERUP_TYPES = {
  JETPACK: 'jetpack',
  MAGNET: 'magnet',
  SHIELD: 'shield',
  BOOST: 'boost'
};

export class PowerupManager {
  constructor() {
    this.activePowerups = {
      [POWERUP_TYPES.JETPACK]: { active: false, timer: 0, maxTime: 0 },
      [POWERUP_TYPES.MAGNET]: { active: false, timer: 0, maxTime: 0 },
      [POWERUP_TYPES.SHIELD]: { active: false, timer: 0, maxTime: 0, hits: 0 },
      [POWERUP_TYPES.BOOST]: { active: false, timer: 0, maxTime: 0 }
    };
  }

  reset() {
    Object.keys(this.activePowerups).forEach(type => {
      this.activePowerups[type].active = false;
      this.activePowerups[type].timer = 0;
      this.activePowerups[type].maxTime = 0;
      if (type === POWERUP_TYPES.SHIELD) {
        this.activePowerups[type].hits = 0;
      }
    });
    audio.stopJetpackSound();
  }

  activate(type, player) {
    audio.playPowerup();

    if (type === POWERUP_TYPES.JETPACK) {
      const duration = shop.getUpgradeValue('jetpack');
      this.activePowerups[type].active = true;
      this.activePowerups[type].timer = duration;
      this.activePowerups[type].maxTime = duration;
      player.setFlying(true);
      audio.startJetpackSound();
    } else if (type === POWERUP_TYPES.MAGNET) {
      const duration = shop.getUpgradeValue('magnet');
      this.activePowerups[type].active = true;
      this.activePowerups[type].timer = duration;
      this.activePowerups[type].maxTime = duration;
    } else if (type === POWERUP_TYPES.SHIELD) {
      this.activePowerups[type].active = true;
      this.activePowerups[type].hits = 1;
      this.activePowerups[type].timer = 15; // 15s max or until hit
      this.activePowerups[type].maxTime = 15;
    } else if (type === POWERUP_TYPES.BOOST) {
      const duration = shop.getUpgradeValue('boost');
      this.activePowerups[type].active = true;
      this.activePowerups[type].timer = duration;
      this.activePowerups[type].maxTime = duration;
      player.speedMultiplier = 2.0;
      player.invulnerableTimer = duration;
      audio.playBoostSonic();
    }
  }

  update(delta, player, particleSystem) {
    // 1. Jetpack
    const jet = this.activePowerups[POWERUP_TYPES.JETPACK];
    if (jet.active) {
      jet.timer -= delta;
      if (jet.timer <= 0) {
        jet.active = false;
        player.setFlying(false);
        audio.stopJetpackSound();
      }
    }

    // 2. Magnet
    const mag = this.activePowerups[POWERUP_TYPES.MAGNET];
    if (mag.active) {
      mag.timer -= delta;
      if (mag.timer <= 0) {
        mag.active = false;
      }
    }

    // 3. Shield
    const shld = this.activePowerups[POWERUP_TYPES.SHIELD];
    if (shld.active) {
      shld.timer -= delta;
      if (shld.timer <= 0 || shld.hits <= 0) {
        shld.active = false;
      }
    }

    // 4. Boost
    const bst = this.activePowerups[POWERUP_TYPES.BOOST];
    if (bst.active) {
      bst.timer -= delta;
      if (bst.timer <= 0) {
        bst.active = false;
        player.speedMultiplier = 1.0;
      }
    }
  }

  isShieldActive() {
    return this.activePowerups[POWERUP_TYPES.SHIELD].active;
  }

  consumeShield(player, particleSystem) {
    const shld = this.activePowerups[POWERUP_TYPES.SHIELD];
    if (shld.active && shld.hits > 0) {
      shld.hits -= 1;
      audio.playShieldShatter();
      if (particleSystem) {
        particleSystem.emitShieldShatter(player.mesh.position);
      }
      player.invulnerableTimer = 1.5; // brief safety window
      if (shld.hits <= 0) {
        shld.active = false;
      }
      return true;
    }
    return false;
  }

  isMagnetActive() {
    return this.activePowerups[POWERUP_TYPES.MAGNET].active;
  }

  isJetpackActive() {
    return this.activePowerups[POWERUP_TYPES.JETPACK].active;
  }

  isBoostActive() {
    return this.activePowerups[POWERUP_TYPES.BOOST].active;
  }

  getActiveState() {
    return {
      jetpack: {
        active: this.activePowerups[POWERUP_TYPES.JETPACK].active,
        percent: this.activePowerups[POWERUP_TYPES.JETPACK].maxTime > 0 ? (this.activePowerups[POWERUP_TYPES.JETPACK].timer / this.activePowerups[POWERUP_TYPES.JETPACK].maxTime) : 0
      },
      magnet: {
        active: this.activePowerups[POWERUP_TYPES.MAGNET].active,
        percent: this.activePowerups[POWERUP_TYPES.MAGNET].maxTime > 0 ? (this.activePowerups[POWERUP_TYPES.MAGNET].timer / this.activePowerups[POWERUP_TYPES.MAGNET].maxTime) : 0
      },
      shield: {
        active: this.activePowerups[POWERUP_TYPES.SHIELD].active,
        percent: this.activePowerups[POWERUP_TYPES.SHIELD].hits > 0 ? 1 : 0
      },
      boost: {
        active: this.activePowerups[POWERUP_TYPES.BOOST].active,
        percent: this.activePowerups[POWERUP_TYPES.BOOST].maxTime > 0 ? (this.activePowerups[POWERUP_TYPES.BOOST].timer / this.activePowerups[POWERUP_TYPES.BOOST].maxTime) : 0
      }
    };
  }
}
