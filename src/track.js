import * as THREE from 'three';
import { createStoneTexture, createWallTexture, createCoinTexture, createLavaTexture } from './textureGenerator.js';
import { LANE_WIDTH } from './player.js';
import { POWERUP_TYPES } from './powerups.js';
import { audio } from './audio.js';

export const CHUNK_LENGTH = 24.0;
export const PATH_WIDTH = 9.0;

export class TrackManager {
  constructor(scene) {
    this.scene = scene;

    // Procedural textures & shared materials
    this.stoneTexture = createStoneTexture();
    this.wallTexture = createWallTexture();
    this.coinTexture = createCoinTexture();
    this.lavaTexture = createLavaTexture();

    this.stoneMat = new THREE.MeshStandardMaterial({
      map: this.stoneTexture,
      roughness: 0.85,
      metalness: 0.1
    });

    this.wallMat = new THREE.MeshStandardMaterial({
      map: this.wallTexture,
      roughness: 0.9,
      metalness: 0.1
    });

    this.coinMat = new THREE.MeshStandardMaterial({
      map: this.coinTexture,
      roughness: 0.3,
      metalness: 0.85,
      emissive: 0x443300
    });

    this.gemMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x004422
    });

    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.9
    });

    this.lavaMat = new THREE.MeshBasicMaterial({
      map: this.lavaTexture
    });

    // Active track segments, obstacles, and items
    this.chunks = [];
    this.obstacles = [];
    this.coins = [];
    this.powerupPickups = [];

    // Path cursor for continuous world generation
    this.cursorPos = new THREE.Vector3(0, 0, 0);
    this.cursorHeading = 0; // Current generation direction (0 = -Z)
    this.chunkCount = 0;

    // Active turn intersections waiting for player input
    this.turnIntersections = [];

    this.initPool();
  }

  initPool() {
    // Generate initial straight runway for safe start
    for (let i = 0; i < 10; i++) {
      this.spawnNextChunk(i < 3); // first 3 chunks are completely clear of obstacles
    }
  }

  reset() {
    // Clean up all meshes from scene
    this.chunks.forEach(c => this.scene.remove(c.mesh));
    this.obstacles.forEach(o => this.scene.remove(o.mesh));
    this.coins.forEach(c => this.scene.remove(c.mesh));
    this.powerupPickups.forEach(p => this.scene.remove(p.mesh));

    this.chunks = [];
    this.obstacles = [];
    this.coins = [];
    this.powerupPickups = [];
    this.turnIntersections = [];

    this.cursorPos.set(0, 0, 0);
    this.cursorHeading = 0;
    this.chunkCount = 0;

    for (let i = 0; i < 10; i++) {
      this.spawnNextChunk(i < 3);
    }
  }

  spawnNextChunk(forceEmpty = false) {
    this.chunkCount++;
    const isTurn = !forceEmpty && this.chunkCount > 6 && (this.chunkCount % 12 === 0);

    const chunkGroup = new THREE.Group();
    chunkGroup.position.copy(this.cursorPos);
    chunkGroup.rotation.y = this.cursorHeading;

    const forwardDir = new THREE.Vector3(-Math.sin(this.cursorHeading), 0, -Math.cos(this.cursorHeading));
    const rightDir = new THREE.Vector3(Math.cos(this.cursorHeading), 0, -Math.sin(this.cursorHeading));

    let turnType = null; // 'left' | 'right'

    if (isTurn) {
      // 90-degree intersection chunk
      turnType = Math.random() > 0.5 ? 'right' : 'left';
      this.buildTurnMesh(chunkGroup, turnType);

      // Register turn intersection trigger
      const intersectionPos = this.cursorPos.clone().add(forwardDir.clone().multiplyScalar(CHUNK_LENGTH * 0.5));
      this.turnIntersections.push({
        position: intersectionPos,
        heading: this.cursorHeading,
        turnType: turnType,
        consumed: false
      });

      // Update cursor for subsequent chunks along the new heading
      const nextHeading = this.cursorHeading + (turnType === 'left' ? Math.PI / 2 : -Math.PI / 2);
      this.cursorPos.add(forwardDir.clone().multiplyScalar(CHUNK_LENGTH * 0.5));
      const newForward = new THREE.Vector3(-Math.sin(nextHeading), 0, -Math.cos(nextHeading));
      this.cursorPos.add(newForward.clone().multiplyScalar(CHUNK_LENGTH * 0.5));
      this.cursorHeading = nextHeading;

    } else {
      // Standard straight chunk (or bridge chasm)
      const isChasm = !forceEmpty && Math.random() < 0.25;
      this.buildStraightMesh(chunkGroup, isChasm);

      if (!forceEmpty) {
        this.populateChunkContent(this.cursorPos.clone(), this.cursorHeading, forwardDir, rightDir, isChasm);
      }

      // Advance cursor straight forward
      this.cursorPos.add(forwardDir.clone().multiplyScalar(CHUNK_LENGTH));
    }

    this.scene.add(chunkGroup);
    this.chunks.push({
      mesh: chunkGroup,
      position: chunkGroup.position.clone(),
      heading: this.cursorHeading,
      isTurn: isTurn
    });
  }

  buildStraightMesh(group, isChasm) {
    if (isChasm) {
      // Broken stone bridge over glowing lava abyss
      const floorGeo = new THREE.BoxGeometry(PATH_WIDTH * 0.7, 0.8, CHUNK_LENGTH);
      const floor = new THREE.Mesh(floorGeo, this.stoneMat);
      floor.position.set(0, -0.4, -CHUNK_LENGTH / 2);
      floor.receiveShadow = true;
      group.add(floor);

      // Lava plane beneath
      const lavaGeo = new THREE.PlaneGeometry(PATH_WIDTH * 3, CHUNK_LENGTH);
      const lava = new THREE.Mesh(lavaGeo, this.lavaMat);
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(0, -3.5, -CHUNK_LENGTH / 2);
      group.add(lava);

    } else {
      // Full stone corridor with carved side walls
      const floorGeo = new THREE.BoxGeometry(PATH_WIDTH, 0.8, CHUNK_LENGTH);
      const floor = new THREE.Mesh(floorGeo, this.stoneMat);
      floor.position.set(0, -0.4, -CHUNK_LENGTH / 2);
      floor.receiveShadow = true;
      group.add(floor);

      // Left Wall
      const wallGeo = new THREE.BoxGeometry(1.2, 3.5, CHUNK_LENGTH);
      const leftWall = new THREE.Mesh(wallGeo, this.wallMat);
      leftWall.position.set(-(PATH_WIDTH / 2 + 0.6), 1.25, -CHUNK_LENGTH / 2);
      leftWall.receiveShadow = true;
      group.add(leftWall);

      // Right Wall
      const rightWall = new THREE.Mesh(wallGeo, this.wallMat);
      rightWall.position.set((PATH_WIDTH / 2 + 0.6), 1.25, -CHUNK_LENGTH / 2);
      rightWall.receiveShadow = true;
      group.add(rightWall);

      // Decorative Braziers / Pillars on sides
      [-1, 1].forEach(side => {
        const pillarGeo = new THREE.BoxGeometry(0.8, 4.0, 0.8);
        const pillar = new THREE.Mesh(pillarGeo, this.wallMat);
        pillar.position.set(side * (PATH_WIDTH / 2 + 0.3), 1.5, -CHUNK_LENGTH / 2);
        group.add(pillar);

        // Torch flame glow
        const torchGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const torchMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
        const torch = new THREE.Mesh(torchGeo, torchMat);
        torch.position.set(side * (PATH_WIDTH / 2 - 0.2), 3.0, -CHUNK_LENGTH / 2);
        group.add(torch);
      });
    }
  }

  buildTurnMesh(group, turnType) {
    // Large square intersection floor
    const size = PATH_WIDTH + 4.0;
    const floorGeo = new THREE.BoxGeometry(size, 0.8, size);
    const floor = new THREE.Mesh(floorGeo, this.stoneMat);
    floor.position.set(0, -0.4, -CHUNK_LENGTH / 2);
    group.add(floor);

    // Decorative turn banner / stone idol pointing direction
    const arrowGeo = new THREE.ConeGeometry(0.8, 1.6, 4);
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xf5c518, emissive: 0x664400 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, 2.5, -CHUNK_LENGTH / 2);
    arrow.rotation.z = (turnType === 'left') ? Math.PI / 2 : -Math.PI / 2;
    group.add(arrow);
  }

  populateChunkContent(basePos, heading, forwardDir, rightDir, isChasm) {
    // 1. Spawn Obstacles
    const rand = Math.random();
    const obstaclePosLocalZ = -CHUNK_LENGTH * 0.5;

    if (rand < 0.32) {
      // LOW OBSTACLE (Must Jump) — fallen tree trunk or stone bar across lanes
      this.spawnLowObstacle(basePos, heading, forwardDir, rightDir, obstaclePosLocalZ);
    } else if (rand < 0.62) {
      // HIGH OBSTACLE (Must Slide) — carved stone arch / hanging spikes
      this.spawnHighObstacle(basePos, heading, forwardDir, rightDir, obstaclePosLocalZ);
    } else if (rand < 0.90) {
      // BLOCK OBSTACLE (Must Switch Lane) — heavy idol stone blocking 1 or 2 lanes
      this.spawnBlockObstacle(basePos, heading, forwardDir, rightDir, obstaclePosLocalZ);
    }

    // 2. Spawn Coins & Gems
    this.spawnCoins(basePos, heading, forwardDir, rightDir);

    // 3. Rare Powerup Spawns
    if (Math.random() < 0.18) {
      this.spawnPowerup(basePos, heading, forwardDir, rightDir);
    }
  }

  spawnLowObstacle(basePos, heading, forwardDir, rightDir, localZ) {
    const geo = new THREE.CylinderGeometry(0.4, 0.4, PATH_WIDTH - 1.0, 10);
    const mesh = new THREE.Mesh(geo, this.woodMat);
    mesh.rotation.z = Math.PI / 2;
    mesh.rotation.y = heading;

    const worldPos = basePos.clone()
      .add(forwardDir.clone().multiplyScalar(-localZ))
      .add(new THREE.Vector3(0, 0.4, 0));

    mesh.position.copy(worldPos);
    this.scene.add(mesh);

    this.obstacles.push({
      mesh,
      position: worldPos,
      type: 'low',
      radius: 0.6,
      lane: null // spans all lanes
    });
  }

  spawnHighObstacle(basePos, heading, forwardDir, rightDir, localZ) {
    const group = new THREE.Group();
    // High stone bar
    const barGeo = new THREE.BoxGeometry(PATH_WIDTH - 0.5, 1.2, 0.8);
    const bar = new THREE.Mesh(barGeo, this.wallMat);
    bar.position.y = 2.4; // 2.4 clearance requires sliding under
    group.add(bar);

    // Side support posts
    [-1, 1].forEach(side => {
      const postGeo = new THREE.BoxGeometry(0.6, 2.6, 0.6);
      const post = new THREE.Mesh(postGeo, this.wallMat);
      post.position.set(side * (PATH_WIDTH / 2 - 0.5), 1.3, 0);
      group.add(post);
    });

    const worldPos = basePos.clone().add(forwardDir.clone().multiplyScalar(-localZ));
    group.position.copy(worldPos);
    group.rotation.y = heading;
    this.scene.add(group);

    this.obstacles.push({
      mesh: group,
      position: worldPos,
      type: 'high',
      radius: 0.7,
      lane: null
    });
  }

  spawnBlockObstacle(basePos, heading, forwardDir, rightDir, localZ) {
    // Choose 1 or 2 lanes to block (leave at least 1 lane open!)
    const lanes = [-1, 0, 1];
    const freeLane = lanes[Math.floor(Math.random() * lanes.length)];
    const blockedLanes = lanes.filter(l => l !== freeLane);

    blockedLanes.forEach(lane => {
      const geo = new THREE.BoxGeometry(2.0, 3.0, 1.2);
      const mesh = new THREE.Mesh(geo, this.wallMat);

      const worldPos = basePos.clone()
        .add(forwardDir.clone().multiplyScalar(-localZ))
        .add(rightDir.clone().multiplyScalar(lane * LANE_WIDTH))
        .add(new THREE.Vector3(0, 1.5, 0));

      mesh.position.copy(worldPos);
      mesh.rotation.y = heading;
      this.scene.add(mesh);

      this.obstacles.push({
        mesh,
        position: worldPos,
        type: 'block',
        radius: 1.1,
        lane: lane
      });
    });
  }

  spawnCoins(basePos, heading, forwardDir, rightDir) {
    const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
    const count = 5;
    const isGem = Math.random() < 0.2;

    for (let i = 0; i < count; i++) {
      const localZ = - (CHUNK_LENGTH * 0.2 + i * 2.2);
      const worldPos = basePos.clone()
        .add(forwardDir.clone().multiplyScalar(-localZ))
        .add(rightDir.clone().multiplyScalar(lane * LANE_WIDTH))
        .add(new THREE.Vector3(0, 0.8, 0));

      let mesh;
      if (isGem && i === 2) {
        // High-value emerald gem
        const gemGeo = new THREE.OctahedronGeometry(0.45, 0);
        mesh = new THREE.Mesh(gemGeo, this.gemMat);
      } else {
        // Spinning Gold Coin
        const coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16);
        mesh = new THREE.Mesh(coinGeo, this.coinMat);
        mesh.rotation.x = Math.PI / 2;
      }

      mesh.position.copy(worldPos);
      this.scene.add(mesh);

      this.coins.push({
        mesh,
        position: worldPos,
        isGem: isGem && i === 2,
        collected: false
      });
    }

    // Sky Coins for Jetpack flight (placed high in the air at Y = 7.5)
    for (let i = 0; i < 4; i++) {
      const skyLane = [-1, 0, 1][(i + Math.floor(Math.random() * 3)) % 3];
      const localZ = - (CHUNK_LENGTH * 0.15 + i * 4.5);
      const skyPos = basePos.clone()
        .add(forwardDir.clone().multiplyScalar(-localZ))
        .add(rightDir.clone().multiplyScalar(skyLane * LANE_WIDTH))
        .add(new THREE.Vector3(0, 7.5, 0));

      const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
      const skyMesh = new THREE.Mesh(coinGeo, this.coinMat);
      skyMesh.rotation.x = Math.PI / 2;
      skyMesh.position.copy(skyPos);
      this.scene.add(skyMesh);

      this.coins.push({
        mesh: skyMesh,
        position: skyPos,
        isGem: Math.random() < 0.3,
        collected: false
      });
    }
  }

  spawnPowerup(basePos, heading, forwardDir, rightDir) {
    const types = [POWERUP_TYPES.JETPACK, POWERUP_TYPES.MAGNET, POWERUP_TYPES.SHIELD, POWERUP_TYPES.BOOST];
    const type = types[Math.floor(Math.random() * types.length)];
    const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
    const localZ = -CHUNK_LENGTH * 0.7;

    const group = new THREE.Group();
    // Glowing floating pedestal & icon
    const orbGeo = new THREE.SphereGeometry(0.5, 12, 12);
    let color = 0xffffff;
    if (type === POWERUP_TYPES.JETPACK) color = 0xff6600;
    if (type === POWERUP_TYPES.MAGNET) color = 0x00f0ff;
    if (type === POWERUP_TYPES.SHIELD) color = 0x22ff55;
    if (type === POWERUP_TYPES.BOOST) color = 0xffdd00;

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.6,
      roughness: 0.2
    });
    const orb = new THREE.Mesh(orbGeo, mat);
    group.add(orb);

    const ringGeo = new THREE.TorusGeometry(0.7, 0.08, 8, 16);
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const worldPos = basePos.clone()
      .add(forwardDir.clone().multiplyScalar(-localZ))
      .add(rightDir.clone().multiplyScalar(lane * LANE_WIDTH))
      .add(new THREE.Vector3(0, 1.2, 0));

    group.position.copy(worldPos);
    this.scene.add(group);

    this.powerupPickups.push({
      mesh: group,
      position: worldPos,
      type: type,
      collected: false
    });
  }

  checkTurn(player, direction) {
    // Check if player is currently near an active turn intersection
    const playerPos = player.mesh.position;
    for (let i = 0; i < this.turnIntersections.length; i++) {
      const turn = this.turnIntersections[i];
      if (turn.consumed) continue;

      const dist = playerPos.distanceTo(turn.position);
      if (dist < 8.0) {
        // Player is within turn window!
        if (turn.turnType === direction) {
          turn.consumed = true;
          audio.playTurn();

          // Pivot player orientation
          const angleDelta = (direction === 'left') ? Math.PI / 2 : -Math.PI / 2;
          player.targetHeading += angleDelta;

          // Align player position to the intersection pivot
          player.position.copy(turn.position);
          player.laneOffset = 0;
          player.targetLane = 0;

          return { success: true, correct: true };
        } else {
          // Turned wrong direction
          return { success: false, correct: false };
        }
      }
    }
    return { success: false, correct: false };
  }

  update(delta, player, powerupManager, particleSystem) {
    const playerPos = player.mesh.position;

    // 1. Animate spinning coins and powerups
    this.coins.forEach(c => {
      if (!c.collected) {
        c.mesh.rotation.z += delta * 3.5;

        // Magnet attraction
        if (powerupManager.isMagnetActive() && !player.isDead) {
          const dist = c.mesh.position.distanceTo(playerPos);
          if (dist < 18.0) {
            c.mesh.position.lerp(playerPos, Math.min(1.0, delta * 12.0));
          }
        }
      }
    });

    this.powerupPickups.forEach(p => {
      if (!p.collected) {
        p.mesh.rotation.y += delta * 3.0;
        p.mesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.2;
      }
    });

    // 2. Check Coin Collisions
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.collected) continue;

      const dist = c.mesh.position.distanceTo(playerPos);
      if (dist < 1.6) {
        c.collected = true;
        this.scene.remove(c.mesh);
        c.mesh.geometry.dispose();

        if (c.isGem) {
          audio.playGem();
          particleSystem.emitCoinSparkles(c.position, 0x00ff88);
          window.dispatchEvent(new CustomEvent('coin-collected', { detail: { value: 5, isGem: true } }));
        } else {
          audio.playCoin();
          particleSystem.emitCoinSparkles(c.position, 0xffd700);
          window.dispatchEvent(new CustomEvent('coin-collected', { detail: { value: 1, isGem: false } }));
        }
        this.coins.splice(i, 1);
      }
    }

    // 3. Check Powerup Collisions
    for (let i = this.powerupPickups.length - 1; i >= 0; i--) {
      const p = this.powerupPickups[i];
      if (p.collected) continue;

      const dist = p.mesh.position.distanceTo(playerPos);
      if (dist < 1.8) {
        p.collected = true;
        this.scene.remove(p.mesh);
        powerupManager.activate(p.type, player);
        particleSystem.emitCoinSparkles(p.position, 0x00f0ff);
        this.powerupPickups.splice(i, 1);
      }
    }

    // 4. Check Obstacle Collisions
    const hitbox = player.getHitbox();
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const dist = obs.position.distanceTo(hitbox.center);

      if (dist < (obs.radius + hitbox.radius + 0.5)) {
        // Evaluate obstacle type & bypass states
        let hit = false;

        if (powerupManager.isBoostActive()) {
          // Speed boost smashes right through obstacles!
          continue;
        }

        if (hitbox.isFlying) {
          // Flying with Jetpack bypasses all ground obstacles!
          continue;
        }

        if (obs.type === 'low') {
          // Can jump over low obstacle
          if (hitbox.center.y < 1.1) {
            hit = true;
          }
        } else if (obs.type === 'high') {
          // Can slide under high obstacle
          if (!hitbox.isSliding) {
            hit = true;
          }
        } else if (obs.type === 'block') {
          // Blocks lane
          if (obs.lane === player.targetLane) {
            hit = true;
          }
        }

        if (hit) {
          // Check shield
          if (powerupManager.isShieldActive()) {
            powerupManager.consumeShield(player, particleSystem);
            this.obstacles.splice(i, 1);
            this.scene.remove(obs.mesh);
            break;
          }

          // Otherwise fatal crash / stumble
          return { hit: true, obstacle: obs };
        }
      }
    }

    // 5. Spawn new chunks ahead and recycle chunks behind
    if (this.chunks.length > 0) {
      const oldestChunk = this.chunks[0];
      const distToOldest = playerPos.distanceTo(oldestChunk.position);

      if (distToOldest > CHUNK_LENGTH * 4) {
        // Remove oldest chunk
        this.scene.remove(oldestChunk.mesh);
        this.chunks.shift();

        // Spawn new chunk ahead
        this.spawnNextChunk(false);
      }
    }

    return { hit: false };
  }
}
