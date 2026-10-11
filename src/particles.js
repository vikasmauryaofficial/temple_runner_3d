import * as THREE from 'three';
import { createParticleTexture } from './textureGenerator.js';

/**
 * High-performance pooled particle system for 3D visual effects:
 * - Coin sparkle bursts
 * - Jetpack thruster flames & smoke
 * - Shield sphere & shockwave shatter
 * - Magnet swirling vortex
 * - Speed lines
 * - Running dust
 */

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particleTexture = createParticleTexture();
    this.sparkles = [];
    this.thrusterParticles = [];
    this.dustParticles = [];
    this.shatterParticles = [];

    // Shield mesh
    this.shieldMesh = this.createShieldMesh();
    this.scene.add(this.shieldMesh);
    this.shieldMesh.visible = false;

    // Speed warp lines group
    this.speedLinesGroup = this.createSpeedLines();
    this.scene.add(this.speedLinesGroup);
    this.speedLinesGroup.visible = false;
  }

  createShieldMesh() {
    const geo = new THREE.IcosahedronGeometry(1.6, 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const innerGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });

    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, mat));
    group.add(new THREE.Mesh(innerGeo, innerMat));
    return group;
  }

  createSpeedLines() {
    const group = new THREE.Group();
    const count = 40;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 6); // 2 vertices per line

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 5.0;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius + 1.5;
      const z = (Math.random() - 0.5) * 30;

      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;

      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z - 6.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    const lines = new THREE.LineSegments(geo, mat);
    group.add(lines);
    return group;
  }

  emitCoinSparkles(position, color = 0xffd700) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.particleTexture,
        color: color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 1
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(position);
      sprite.scale.set(0.6, 0.6, 0.6);

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 3;
      const velY = Math.random() * 6 + 2;

      this.sparkles.push({
        sprite,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          velY,
          Math.sin(angle) * speed
        ),
        life: 0.6,
        maxLife: 0.6
      });
      this.scene.add(sprite);
    }
  }

  emitJetpackFlames(posLeft, posRight) {
    const positions = [posLeft, posRight];
    positions.forEach((pos) => {
      const mat = new THREE.SpriteMaterial({
        map: this.particleTexture,
        color: Math.random() > 0.3 ? 0xff6600 : 0xffcc00,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.9
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(0.5, 0.5, 0.5);

      this.thrusterParticles.push({
        sprite,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          - (Math.random() * 8 + 6),
          (Math.random() - 0.5) * 1.5
        ),
        life: 0.25,
        maxLife: 0.25
      });
      this.scene.add(sprite);
    });
  }

  emitDust(pos) {
    const mat = new THREE.SpriteMaterial({
      map: this.particleTexture,
      color: 0x8a7d65,
      transparent: true,
      opacity: 0.4
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.set(0.4, 0.4, 0.4);

    this.dustParticles.push({
      sprite,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 1.2
      ),
      life: 0.35,
      maxLife: 0.35
    });
    this.scene.add(sprite);
  }

  emitShieldShatter(position) {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.particleTexture,
        color: 0x00f0ff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 1
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(position);
      sprite.scale.set(0.8, 0.8, 0.8);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = Math.random() * 12 + 6;

      this.shatterParticles.push({
        sprite,
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        ),
        life: 0.5,
        maxLife: 0.5
      });
      this.scene.add(sprite);
    }
  }

  update(delta, playerPos, playerRotation, isShieldActive, isSpeedActive) {
    // 1. Update Shield
    if (isShieldActive) {
      this.shieldMesh.visible = true;
      this.shieldMesh.position.copy(playerPos).add(new THREE.Vector3(0, 1.2, 0));
      this.shieldMesh.rotation.y += delta * 3;
      this.shieldMesh.rotation.x += delta * 1.5;
    } else {
      this.shieldMesh.visible = false;
    }

    // 2. Update Speed Lines
    if (isSpeedActive) {
      this.speedLinesGroup.visible = true;
      this.speedLinesGroup.position.copy(playerPos);
      this.speedLinesGroup.rotation.y = playerRotation;
    } else {
      this.speedLinesGroup.visible = false;
    }

    // 3. Update Sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.sparkles.splice(i, 1);
        continue;
      }
      p.velocity.y -= 9.8 * delta; // gravity
      p.sprite.position.addScaledVector(p.velocity, delta);
      p.sprite.material.opacity = p.life / p.maxLife;
      const s = (p.life / p.maxLife) * 0.6;
      p.sprite.scale.set(s, s, s);
    }

    // 4. Update Jetpack flames
    for (let i = this.thrusterParticles.length - 1; i >= 0; i--) {
      const p = this.thrusterParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.thrusterParticles.splice(i, 1);
        continue;
      }
      p.sprite.position.addScaledVector(p.velocity, delta);
      p.sprite.material.opacity = p.life / p.maxLife;
      const s = (1 - (p.life / p.maxLife)) * 0.8 + 0.3;
      p.sprite.scale.set(s, s, s);
    }

    // 5. Update Dust
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.dustParticles.splice(i, 1);
        continue;
      }
      p.sprite.position.addScaledVector(p.velocity, delta);
      p.sprite.material.opacity = (p.life / p.maxLife) * 0.4;
      const s = ((1 - (p.life / p.maxLife)) * 0.6 + 0.3);
      p.sprite.scale.set(s, s, s);
    }

    // 6. Update Shatter
    for (let i = this.shatterParticles.length - 1; i >= 0; i--) {
      const p = this.shatterParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.shatterParticles.splice(i, 1);
        continue;
      }
      p.velocity.y -= 12.0 * delta;
      p.sprite.position.addScaledVector(p.velocity, delta);
      p.sprite.material.opacity = p.life / p.maxLife;
    }
  }

  clear() {
    [...this.sparkles, ...this.thrusterParticles, ...this.dustParticles, ...this.shatterParticles].forEach(p => {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    });
    this.sparkles = [];
    this.thrusterParticles = [];
    this.dustParticles = [];
    this.shatterParticles = [];
  }
}
