import * as THREE from 'three';
import { Player } from './player.js';
import { Chaser } from './chaser.js';
import { TrackManager } from './track.js';
import { PowerupManager, POWERUP_TYPES } from './powerups.js';
import { ParticleSystem } from './particles.js';
import { InputManager } from './controls.js';
import { shop, UPGRADES, SKINS } from './shop.js';
import { audio } from './audio.js';

// Game state constants
const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover'
};

class Game {
  constructor() {
    this.state = STATES.MENU;

    // Run statistics
    this.distance = 0;
    this.coinsThisRun = 0;
    this.score = 0;
    this.multiplier = 1;

    // Camera follow parameters
    this.camOffset = new THREE.Vector3(0, 4.2, 7.5);
    this.camLookOffset = new THREE.Vector3(0, 1.8, -4.0);
    this.cameraShake = 0;

    // DOM UI Elements
    this.initDOMElements();

    // 1. Initialize Three.js scene & renderer
    this.initThree();

    // 2. Initialize Game Entities
    this.particles = new ParticleSystem(this.scene);
    this.player = new Player(this.scene);
    this.chaser = new Chaser(this.scene);
    this.track = new TrackManager(this.scene);
    this.powerups = new PowerupManager();

    // 3. Initialize Inputs
    this.initInputs();

    // 4. Initialize UI Listeners
    this.initUIListeners();

    // 5. Update Shop UI
    this.renderShop();

    // 6. Window resize handler
    window.addEventListener('resize', () => this.onWindowResize());

    // 7. Coin collection listener
    window.addEventListener('coin-collected', (e) => {
      const val = e.detail.value || 1;
      this.coinsThisRun += val;
      shop.addCoins(val);
      this.hudCoins.textContent = this.coinsThisRun;
    });

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Start Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initDOMElements() {
    this.hudCoins = document.getElementById('hud-coins');
    this.hudScore = document.getElementById('hud-score');
    this.hudDistance = document.getElementById('hud-distance');
    this.hudMultiplier = document.getElementById('hud-multiplier');
    this.dangerVignette = document.getElementById('danger-vignette');

    this.startModal = document.getElementById('start-modal');
    this.shopModal = document.getElementById('shop-modal');
    this.helpModal = document.getElementById('help-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.gameoverModal = document.getElementById('gameover-modal');

    this.startHighScore = document.getElementById('start-high-score');
    this.startHighScore.textContent = shop.getHighScore().toLocaleString();

    this.shopCoinsDisplay = document.getElementById('shop-coins-display');

    // Powerup HUD Gauges
    this.gaugeJetpack = document.getElementById('gauge-jetpack');
    this.gaugeMagnet = document.getElementById('gauge-magnet');
    this.gaugeShield = document.getElementById('gauge-shield');
    this.gaugeBoost = document.getElementById('gauge-boost');
  }

  initThree() {
    const container = document.getElementById('canvas-container');

    // Scene with atmospheric fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x120e0b);
    this.scene.fog = new THREE.Fog(0x120e0b, 25, 110);

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 5, 8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.HemisphereLight(0xffeedd, 0x221100, 0.7);
    this.scene.add(ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffae6, 1.2);
    this.dirLight.position.set(20, 40, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 100;
    this.dirLight.shadow.camera.left = -25;
    this.dirLight.shadow.camera.right = 25;
    this.dirLight.shadow.camera.top = 25;
    this.dirLight.shadow.camera.bottom = -25;
    this.scene.add(this.dirLight);

    // Follow point light attached near runner
    this.playerLight = new THREE.PointLight(0xffa500, 1.2, 25);
    this.playerLight.position.set(0, 4, -2);
    this.scene.add(this.playerLight);
  }

  initInputs() {
    this.inputs = new InputManager({
      onLeft: () => {
        if (this.state !== STATES.PLAYING) return;
        // Check if player is turning 90 degrees at intersection first
        const turnResult = this.track.checkTurn(this.player, 'left');
        if (!turnResult.success) {
          // Normal lane shift left
          this.player.moveLeft();
        }
      },
      onRight: () => {
        if (this.state !== STATES.PLAYING) return;
        const turnResult = this.track.checkTurn(this.player, 'right');
        if (!turnResult.success) {
          // Normal lane shift right
          this.player.moveRight();
        }
      },
      onJump: () => {
        if (this.state !== STATES.PLAYING) return;
        if (this.player.jump()) {
          audio.playJump();
        }
      },
      onSlide: () => {
        if (this.state !== STATES.PLAYING) return;
        if (this.player.slide()) {
          audio.playSlide();
        }
      },
      onPause: () => {
        this.togglePause();
      }
    });

    // On-screen touch buttons
    document.getElementById('btn-left').addEventListener('click', () => {
      if (this.state !== STATES.PLAYING) return;
      const turnResult = this.track.checkTurn(this.player, 'left');
      if (!turnResult.success) this.player.moveLeft();
    });

    document.getElementById('btn-right').addEventListener('click', () => {
      if (this.state !== STATES.PLAYING) return;
      const turnResult = this.track.checkTurn(this.player, 'right');
      if (!turnResult.success) this.player.moveRight();
    });

    document.getElementById('btn-jump').addEventListener('click', () => {
      if (this.state !== STATES.PLAYING) return;
      if (this.player.jump()) audio.playJump();
    });

    document.getElementById('btn-slide').addEventListener('click', () => {
      if (this.state !== STATES.PLAYING) return;
      if (this.player.slide()) audio.playSlide();
    });
  }

  initUIListeners() {
    // Audio button
    const btnAudio = document.getElementById('btn-audio');
    btnAudio.addEventListener('click', () => {
      audio.init();
      const muted = audio.toggleMute();
      btnAudio.textContent = muted ? '🔇' : '🔊';
    });

    // Pause buttons
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-restart-pause').addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.startRun();
    });
    document.getElementById('btn-menu-pause').addEventListener('click', () => {
      this.pauseModal.classList.add('hidden');
      this.goToMenu();
    });

    // Start Menu Buttons
    document.getElementById('btn-play').addEventListener('click', () => {
      audio.init();
      this.startRun();
    });

    document.getElementById('btn-open-shop').addEventListener('click', () => {
      this.openShop();
    });

    document.getElementById('btn-close-shop').addEventListener('click', () => {
      this.shopModal.classList.add('hidden');
    });

    document.getElementById('btn-open-help').addEventListener('click', () => {
      this.helpModal.classList.remove('hidden');
    });

    document.getElementById('btn-close-help').addEventListener('click', () => {
      this.helpModal.classList.add('hidden');
    });

    // Game Over Buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.gameoverModal.classList.add('hidden');
      this.startRun();
    });

    document.getElementById('btn-go-shop').addEventListener('click', () => {
      this.gameoverModal.classList.add('hidden');
      this.openShop();
    });

    document.getElementById('btn-go-menu').addEventListener('click', () => {
      this.gameoverModal.classList.add('hidden');
      this.goToMenu();
    });

    // Shop Tabs
    const tabUpgrades = document.getElementById('tab-btn-upgrades');
    const tabSkins = document.getElementById('tab-btn-skins');
    const upgradesContainer = document.getElementById('shop-upgrades-container');
    const skinsContainer = document.getElementById('shop-skins-container');

    tabUpgrades.addEventListener('click', () => {
      tabUpgrades.classList.add('active');
      tabSkins.classList.remove('active');
      upgradesContainer.style.display = 'flex';
      skinsContainer.style.display = 'none';
    });

    tabSkins.addEventListener('click', () => {
      tabSkins.classList.add('active');
      tabUpgrades.classList.remove('active');
      upgradesContainer.style.display = 'none';
      skinsContainer.style.display = 'flex';
    });
  }

  startRun() {
    this.state = STATES.PLAYING;
    this.distance = 0;
    this.coinsThisRun = 0;
    this.score = 0;
    this.multiplier = 1;

    this.hudCoins.textContent = '0';
    this.hudScore.textContent = '0';
    this.hudDistance.textContent = '0 m';
    this.hudMultiplier.textContent = '1x';

    this.startModal.classList.add('hidden');
    this.gameoverModal.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.dangerVignette.classList.remove('active');

    this.player.reset();
    this.player.applySkin(shop.getSkinConfig());
    this.chaser.reset();
    this.track.reset();
    this.powerups.reset();
    this.particles.clear();

    audio.startBGM();
  }

  togglePause() {
    if (this.state === STATES.PLAYING) {
      this.state = STATES.PAUSED;
      this.pauseModal.classList.remove('hidden');
      audio.stopBGM();
    } else if (this.state === STATES.PAUSED) {
      this.state = STATES.PLAYING;
      this.pauseModal.classList.add('hidden');
      audio.startBGM();
    }
  }

  goToMenu() {
    this.state = STATES.MENU;
    this.startHighScore.textContent = shop.getHighScore().toLocaleString();
    this.startModal.classList.remove('hidden');
    this.player.reset();
    this.chaser.reset();
    this.track.reset();
    this.powerups.reset();
    this.particles.clear();
    audio.stopBGM();
  }

  triggerGameOver(reason) {
    if (this.state === STATES.GAMEOVER) return;
    this.state = STATES.GAMEOVER;

    this.player.crash();
    this.chaser.pounce(this.player);
    this.powerups.reset();
    this.cameraShake = 0.8;

    audio.playCrash();
    audio.stopBGM();

    const isNewHigh = shop.checkHighScore(Math.floor(this.score));

    setTimeout(() => {
      document.getElementById('gameover-reason').textContent = reason || 'COLLIDED WITH THE RUINS';
      document.getElementById('go-stat-distance').textContent = `${Math.floor(this.distance)} m`;
      document.getElementById('go-stat-coins').textContent = `🪙 ${this.coinsThisRun}`;
      document.getElementById('go-stat-score').textContent = Math.floor(this.score).toLocaleString();

      const newHighBanner = document.getElementById('gameover-new-high');
      newHighBanner.style.display = isNewHigh ? 'block' : 'none';

      this.gameoverModal.classList.remove('hidden');
      this.dangerVignette.classList.remove('active');
    }, 1200);
  }

  openShop() {
    this.shopCoinsDisplay.textContent = shop.getCoins().toLocaleString();
    this.renderShop();
    this.shopModal.classList.remove('hidden');
  }

  renderShop() {
    const upgradesContainer = document.getElementById('shop-upgrades-container');
    const skinsContainer = document.getElementById('shop-skins-container');
    const playerCoins = shop.getCoins();
    this.shopCoinsDisplay.textContent = playerCoins.toLocaleString();

    // 1. Render Upgrades
    upgradesContainer.innerHTML = '';
    Object.keys(UPGRADES).forEach(key => {
      const u = UPGRADES[key];
      const lvl = shop.getUpgradeLevel(key);
      const cost = shop.getUpgradeCost(key);
      const isMax = lvl >= u.maxLevel;

      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="shop-item-info">
          <span class="shop-item-icon">${u.icon}</span>
          <div>
            <div class="shop-item-name">${u.name} (Lvl ${lvl}/${u.maxLevel})</div>
            <div class="shop-item-desc">+${u.stepVal}s duration per tier</div>
          </div>
        </div>
        <button class="btn-buy" ${isMax || playerCoins < cost ? 'disabled' : ''}>
          ${isMax ? 'MAXED' : `🪙 ${cost}`}
        </button>
      `;

      const btn = item.querySelector('.btn-buy');
      if (!isMax) {
        btn.addEventListener('click', () => {
          if (shop.purchaseUpgrade(key)) {
            audio.playPowerup();
            this.renderShop();
          }
        });
      }
      upgradesContainer.appendChild(item);
    });

    // 2. Render Skins
    skinsContainer.innerHTML = '';
    const selectedSkinId = shop.getSelectedSkin();

    SKINS.forEach(skin => {
      const unlocked = shop.isSkinUnlocked(skin.id);
      const isSelected = selectedSkinId === skin.id;

      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="shop-item-info">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #${skin.color.toString(16).padStart(6, '0')}; border: 2px solid #ffd700;"></div>
          <div>
            <div class="shop-item-name">${skin.name}</div>
            <div class="shop-item-desc">${unlocked ? (isSelected ? 'EQUIPPED' : 'READY TO EQUIP') : `Unlock for ${skin.price} coins`}</div>
          </div>
        </div>
        <button class="btn-buy" ${isSelected ? 'disabled' : ''}>
          ${isSelected ? 'EQUIPPED' : (unlocked ? 'EQUIP' : `🪙 ${skin.price}`)}
        </button>
      `;

      const btn = item.querySelector('.btn-buy');
      btn.addEventListener('click', () => {
        if (unlocked) {
          shop.selectSkin(skin.id);
          this.player.applySkin(skin);
          audio.playCoin();
          this.renderShop();
        } else if (playerCoins >= skin.price) {
          if (shop.purchaseSkin(skin.id)) {
            this.player.applySkin(skin);
            audio.playPowerup();
            this.renderShop();
          }
        }
      });
      skinsContainer.appendChild(item);
    });
  }

  updateHUD(delta) {
    if (this.state !== STATES.PLAYING) return;

    // Advance distance
    const currentSpeed = this.player.speed * this.player.speedMultiplier;
    this.distance += currentSpeed * delta;

    // Calculate dynamic multiplier
    this.multiplier = this.powerups.isBoostActive() ? 2 : 1;

    // Calculate score
    this.score += currentSpeed * delta * 1.5 * this.multiplier;

    // Update Top HUD
    this.hudDistance.textContent = `${Math.floor(this.distance)} m`;
    this.hudScore.textContent = Math.floor(this.score).toLocaleString();
    this.hudMultiplier.textContent = `${this.multiplier}x`;

    // Update Powerup Progress Bars
    const pState = this.powerups.getActiveState();

    this.updateGauge(this.gaugeJetpack, pState.jetpack.active, pState.jetpack.percent);
    this.updateGauge(this.gaugeMagnet, pState.magnet.active, pState.magnet.percent);
    this.updateGauge(this.gaugeShield, pState.shield.active, pState.shield.percent);
    this.updateGauge(this.gaugeBoost, pState.boost.active, pState.boost.percent);

    // Chaser proximity danger vignette
    if (this.chaser.distance < 4.5) {
      this.dangerVignette.classList.add('active');
    } else {
      this.dangerVignette.classList.remove('active');
    }
  }

  updateGauge(el, active, percent) {
    if (active) {
      el.classList.remove('hidden');
      const bar = el.querySelector('.gauge-bar-fill');
      if (bar) bar.style.width = `${Math.max(0, percent * 100)}%`;
    } else {
      el.classList.add('hidden');
    }
  }

  updateCamera(delta) {
    const playerPos = this.player.mesh.position;
    const playerHeading = this.player.heading;

    // Calculate ideal camera position behind player relative to current heading
    const forwardX = -Math.sin(playerHeading);
    const forwardZ = -Math.cos(playerHeading);
    const rightX = Math.cos(playerHeading);
    const rightZ = -Math.sin(playerHeading);

    // Dynamic camera height for Jetpack flight
    const flightHeightBonus = this.player.isFlying ? 3.5 : 0;
    const flightDistBonus = this.player.isFlying ? 2.0 : 0;

    const targetCamX = playerPos.x - forwardX * (this.camOffset.z + flightDistBonus);
    const targetCamZ = playerPos.z - forwardZ * (this.camOffset.z + flightDistBonus);
    const targetCamY = playerPos.y + this.camOffset.y + flightHeightBonus;

    // Camera look target ahead of runner
    const targetLookX = playerPos.x + forwardX * (-this.camLookOffset.z);
    const targetLookZ = playerPos.z + forwardZ * (-this.camLookOffset.z);
    const targetLookY = playerPos.y + this.camLookOffset.y;

    // Smoothly interpolate camera
    const camLerp = Math.min(1.0, delta * 10.0);
    this.camera.position.x += (targetCamX - this.camera.position.x) * camLerp;
    this.camera.position.y += (targetCamY - this.camera.position.y) * camLerp;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * camLerp;

    // Camera shake
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.0);
    }

    this.camera.lookAt(targetLookX, targetLookY, targetLookZ);

    // Keep directional sunlight and runner point light centered around player
    this.dirLight.position.set(playerPos.x + 20, playerPos.y + 40, playerPos.z + 20);
    this.dirLight.target = this.player.mesh;
    this.playerLight.position.set(playerPos.x, playerPos.y + 3.5, playerPos.z);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === STATES.PLAYING) {
      // 1. Update Player
      this.player.update(delta, this.particles);

      // 2. Update Chaser Monster
      this.chaser.update(delta, this.player);

      // 3. Update Powerups
      this.powerups.update(delta, this.player, this.particles);

      // 4. Update Track & Check Collisions
      const trackResult = this.track.update(delta, this.player, this.powerups, this.particles);
      if (trackResult.hit) {
        if (this.chaser.isAggressive) {
          // Stumbled twice while beast was close = caught!
          this.triggerGameOver('CAUGHT BY THE DEMON CHASER!');
        } else {
          // First stumble: beast rushes close!
          this.player.stumble();
          this.chaser.triggerAggro();
          audio.playStumble();
          this.cameraShake = 0.4;
        }
      }

      // 5. Update HUD stats
      this.updateHUD(delta);
    } else if (this.state === STATES.GAMEOVER) {
      this.player.updateCrashAnimation(delta);
    }

    // Update Particles
    this.particles.update(
      delta,
      this.player.mesh.position,
      this.player.heading,
      this.powerups.isShieldActive(),
      this.powerups.isBoostActive()
    );

    // Follow Camera
    this.updateCamera(delta);

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
