import * as THREE from 'three';
import { shop } from './shop.js';

export const LANE_WIDTH = 2.5;

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Movement & state
    this.lane = 0; // -1: Left, 0: Center, 1: Right
    this.targetLane = 0;
    this.laneOffset = 0; // Current interpolated X offset relative to current heading

    this.position = new THREE.Vector3(0, 0, 0);
    this.heading = 0; // Rotation angle around Y axis (0 = running along -Z)
    this.targetHeading = 0;

    // Physics
    this.baseSpeed = 16.0;
    this.speed = 16.0;
    this.maxSpeed = 34.0;
    this.speedMultiplier = 1.0;

    this.velocityY = 0;
    this.gravity = -38.0;
    this.jumpForce = 13.5;
    this.groundY = 0;
    this.isGrounded = true;

    // Actions & states
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.8;

    this.isFlying = false; // Jetpack mode
    this.flyAltitude = 7.5;

    this.isStumbling = false;
    this.stumbleTimer = 0;

    this.isDead = false;
    this.crashTimer = 0;

    this.invulnerableTimer = 0;

    // Run animation timing
    this.animTime = 0;

    // Create 3D Adventurer Mesh Group
    this.mesh = new THREE.Group();
    this.createCharacterMesh();
    this.scene.add(this.mesh);

    this.applySkin(shop.getSkinConfig());
  }

  createCharacterMesh() {
    // Materials
    this.matSkin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
    this.matCloth = new THREE.MeshLambertMaterial({ color: 0x5c4028 });
    this.matPants = new THREE.MeshLambertMaterial({ color: 0x3d3224 });
    this.matBoots = new THREE.MeshLambertMaterial({ color: 0x1f1912 });
    this.matHat = new THREE.MeshLambertMaterial({ color: 0x4a3320 });
    this.matJetpack = new THREE.MeshLambertMaterial({ color: 0x666666 });
    this.matThruster = new THREE.MeshLambertMaterial({ color: 0xd9534f });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
    this.torso = new THREE.Mesh(torsoGeo, this.matCloth);
    this.torso.position.y = 1.25;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // 2. Head & Hat
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.65, 0);
    this.torso.add(this.headGroup);

    const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    this.head = new THREE.Mesh(headGeo, this.matSkin);
    this.headGroup.add(this.head);

    // Explorer Hat
    const hatBrimGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.05, 12);
    const hatBrim = new THREE.Mesh(hatBrimGeo, this.matHat);
    hatBrim.position.y = 0.22;
    this.headGroup.add(hatBrim);

    const hatCrownGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.28, 12);
    const hatCrown = new THREE.Mesh(hatCrownGeo, this.matHat);
    hatCrown.position.y = 0.38;
    this.headGroup.add(hatCrown);

    // 3. Backpack / Jetpack with Thruster Nozzles
    this.backpackGroup = new THREE.Group();
    this.backpackGroup.position.set(0, 0.05, 0.32);
    this.torso.add(this.backpackGroup);

    const packGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
    const packMesh = new THREE.Mesh(packGeo, this.matJetpack);
    this.backpackGroup.add(packMesh);

    // Left Thruster
    const nozzGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8);
    this.leftNozzle = new THREE.Mesh(nozzGeo, this.matThruster);
    this.leftNozzle.position.set(-0.18, -0.32, 0);
    this.backpackGroup.add(this.leftNozzle);

    // Right Thruster
    this.rightNozzle = new THREE.Mesh(nozzGeo, this.matThruster);
    this.rightNozzle.position.set(0.18, -0.32, 0);
    this.backpackGroup.add(this.rightNozzle);

    // 4. Arms
    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.48, 0.35, 0);
    this.torso.add(this.leftArm);

    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const leftArmMesh = new THREE.Mesh(armGeo, this.matCloth);
    leftArmMesh.position.y = -0.3;
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.48, 0.35, 0);
    this.torso.add(this.rightArm);

    const rightArmMesh = new THREE.Mesh(armGeo, this.matCloth);
    rightArmMesh.position.y = -0.3;
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    // 5. Legs
    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, -0.45, 0);
    this.torso.add(this.leftLeg);

    const legGeo = new THREE.BoxGeometry(0.24, 0.75, 0.26);
    const leftLegMesh = new THREE.Mesh(legGeo, this.matPants);
    leftLegMesh.position.y = -0.35;
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    const bootGeo = new THREE.BoxGeometry(0.26, 0.2, 0.34);
    const leftBootMesh = new THREE.Mesh(bootGeo, this.matBoots);
    leftBootMesh.position.set(0, -0.7, -0.04);
    this.leftLeg.add(leftBootMesh);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, -0.45, 0);
    this.torso.add(this.rightLeg);

    const rightLegMesh = new THREE.Mesh(legGeo, this.matPants);
    rightLegMesh.position.y = -0.35;
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    const rightBootMesh = new THREE.Mesh(bootGeo, this.matBoots);
    rightBootMesh.position.set(0, -0.7, -0.04);
    this.rightLeg.add(rightBootMesh);
  }

  applySkin(config) {
    if (!config) return;
    this.matCloth.color.setHex(config.jacket);
    this.matPants.color.setHex(config.pants);
    if (config.accent) {
      this.matHat.color.setHex(config.accent);
      this.matThruster.color.setHex(config.accent);
    } else {
      this.matHat.color.setHex(config.color);
    }
  }

  reset() {
    this.lane = 0;
    this.targetLane = 0;
    this.laneOffset = 0;
    this.position.set(0, 0, 0);
    this.heading = 0;
    this.targetHeading = 0;
    this.speed = this.baseSpeed;
    this.speedMultiplier = 1.0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.isFlying = false;
    this.isStumbling = false;
    this.stumbleTimer = 0;
    this.isDead = false;
    this.crashTimer = 0;
    this.invulnerableTimer = 0;
    this.animTime = 0;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.torso.position.set(0, 1.25, 0);
    this.torso.rotation.set(0, 0, 0);
  }

  moveLeft() {
    if (this.isDead) return;
    if (this.targetLane > -1) {
      this.targetLane -= 1;
    }
  }

  moveRight() {
    if (this.isDead) return;
    if (this.targetLane < 1) {
      this.targetLane += 1;
    }
  }

  jump() {
    if (this.isDead || this.isFlying) return false;
    if (this.isGrounded || this.isSliding) {
      this.isJumping = true;
      this.isGrounded = false;
      this.isSliding = false;
      this.velocityY = this.jumpForce;
      return true;
    }
    return false;
  }

  slide() {
    if (this.isDead || this.isFlying) return false;
    if (this.isGrounded) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      return true;
    } else if (this.isJumping) {
      // Fast drop dive down
      this.velocityY = -this.jumpForce * 1.5;
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      return true;
    }
    return false;
  }

  setFlying(active) {
    this.isFlying = active;
    if (active) {
      this.isSliding = false;
      this.isJumping = false;
    }
  }

  stumble() {
    if (this.invulnerableTimer > 0 || this.isFlying || this.isDead) return;
    this.isStumbling = true;
    this.stumbleTimer = 2.0;
    this.speed = Math.max(12, this.speed * 0.7);
  }

  crash() {
    if (this.invulnerableTimer > 0) return false;
    this.isDead = true;
    this.speed = 0;
    return true;
  }

  update(delta, particleSystem) {
    if (this.isDead) {
      this.updateCrashAnimation(delta);
      return;
    }

    // Accelerate gradually over distance
    if (this.speed < this.maxSpeed && !this.isStumbling) {
      this.speed += delta * 0.25;
    }

    const currentEffectiveSpeed = this.speed * this.speedMultiplier;

    // Smooth lane transition (Interpolate laneOffset toward targetLane * LANE_WIDTH)
    const targetX = this.targetLane * LANE_WIDTH;
    const laneLerpSpeed = 16.0;
    this.laneOffset += (targetX - this.laneOffset) * Math.min(1.0, delta * laneLerpSpeed);

    // Smooth heading rotation
    this.heading += (this.targetHeading - this.heading) * Math.min(1.0, delta * 12.0);

    // Move forward based on current target heading
    const forwardX = -Math.sin(this.targetHeading);
    const forwardZ = -Math.cos(this.targetHeading);
    const rightX = Math.cos(this.targetHeading);
    const rightZ = -Math.sin(this.targetHeading);

    // Advance forward
    this.position.x += forwardX * currentEffectiveSpeed * delta;
    this.position.z += forwardZ * currentEffectiveSpeed * delta;

    // Calculate actual 3D position by applying lateral lane offset
    const finalX = this.position.x + rightX * this.laneOffset;
    const finalZ = this.position.z + rightZ * this.laneOffset;

    // Vertical Physics / Flying
    if (this.isFlying) {
      // Ascend to flight altitude
      this.groundY += (this.flyAltitude - this.groundY) * Math.min(1.0, delta * 4.0);
      this.velocityY = 0;

      // Jetpack flame particles
      if (particleSystem) {
        const leftNozzleWorld = new THREE.Vector3();
        const rightNozzleWorld = new THREE.Vector3();
        this.leftNozzle.getWorldPosition(leftNozzleWorld);
        this.rightNozzle.getWorldPosition(rightNozzleWorld);
        particleSystem.emitJetpackFlames(leftNozzleWorld, rightNozzleWorld);
      }
    } else {
      // Descend smoothly if returning from flight
      if (this.groundY > 0 && !this.isJumping) {
        this.groundY = Math.max(0, this.groundY - delta * 8.0);
      }

      // Normal jump gravity physics
      if (!this.isGrounded) {
        this.velocityY += this.gravity * delta;
        this.groundY += this.velocityY * delta;
        if (this.groundY <= 0) {
          this.groundY = 0;
          this.isGrounded = true;
          this.isJumping = false;
          this.velocityY = 0;
          if (particleSystem) {
            particleSystem.emitDust(this.mesh.position);
          }
        }
      }
    }

    // Sliding timer
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // Stumble timer
    if (this.isStumbling) {
      this.stumbleTimer -= delta;
      if (this.stumbleTimer <= 0) {
        this.isStumbling = false;
      }
    }

    // Invulnerability timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
    }

    // Apply 3D Mesh Transform
    this.mesh.position.set(finalX, this.groundY, finalZ);
    this.mesh.rotation.y = this.heading;

    // Bank slightly during lane switches
    const laneDelta = targetX - this.laneOffset;
    this.mesh.rotation.z = THREE.MathUtils.clamp(-laneDelta * 0.1, -0.25, 0.25);

    // Update Skeletal Limb Animations
    this.updateAnimations(delta, currentEffectiveSpeed, particleSystem);
  }

  updateAnimations(delta, currentSpeed, particleSystem) {
    this.animTime += delta * currentSpeed * 0.7;

    if (this.isFlying) {
      // Superman flying pose
      this.torso.rotation.x = 1.1; // Lean heavily forward
      this.torso.position.y = 1.0;
      this.leftArm.rotation.x = -1.8;
      this.rightArm.rotation.x = -1.8;
      this.leftLeg.rotation.x = 0.3;
      this.rightLeg.rotation.x = 0.3;
      this.headGroup.rotation.x = -0.8; // Looking ahead
    } else if (this.isSliding) {
      // Low sliding pose
      this.torso.rotation.x = -1.0; // Leaning back
      this.torso.position.y = 0.5; // Low to ground
      this.leftLeg.rotation.x = 1.2; // Legs stretched forward
      this.rightLeg.rotation.x = 1.0;
      this.leftArm.rotation.x = -0.5;
      this.rightArm.rotation.x = -0.5;
      this.headGroup.rotation.x = 0.7; // Looking up/forward

      if (particleSystem && Math.random() < 0.4) {
        particleSystem.emitDust(this.mesh.position);
      }
    } else if (this.isJumping) {
      // Jump pose: legs tucked, arms raised
      this.torso.rotation.x = 0.2;
      this.torso.position.y = 1.25;
      this.leftLeg.rotation.x = 0.8;
      this.rightLeg.rotation.x = 0.6;
      this.leftArm.rotation.x = -1.0;
      this.rightArm.rotation.x = -1.0;
      this.headGroup.rotation.x = 0;
    } else {
      // Regular running cycle
      this.torso.rotation.x = 0.15; // Natural forward sprint lean
      this.torso.position.y = 1.25 + Math.abs(Math.sin(this.animTime * 2)) * 0.1;

      // Legs swing
      const legAngle = Math.sin(this.animTime) * 0.8;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      // Arms swing opposite to legs
      this.leftArm.rotation.x = -legAngle * 0.9;
      this.rightArm.rotation.x = legAngle * 0.9;

      this.headGroup.rotation.x = 0;

      // Running dust puffs at footfalls
      if (particleSystem && Math.sin(this.animTime * 2) > 0.92) {
        particleSystem.emitDust(this.mesh.position);
      }
    }

    // Stumble wobble
    if (this.isStumbling) {
      this.mesh.rotation.y += Math.sin(this.animTime * 5) * 0.15;
    }
  }

  updateCrashAnimation(delta) {
    this.crashTimer += delta;
    this.torso.rotation.x += delta * 4;
    this.torso.rotation.z += delta * 2;
    this.torso.position.y = Math.max(0.3, this.torso.position.y - delta * 3);
  }

  getHitbox() {
    const center = this.mesh.position.clone();
    center.y += this.isSliding ? 0.4 : 1.0;
    const height = this.isSliding ? 0.8 : (this.isFlying ? 1.2 : 2.0);
    const radius = 0.6;
    return { center, height, radius, isSliding: this.isSliding, isFlying: this.isFlying };
  }
}
