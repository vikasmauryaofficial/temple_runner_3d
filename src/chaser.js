import * as THREE from 'three';
import { audio } from './audio.js';

export class Chaser {
  constructor(scene) {
    this.scene = scene;

    this.distance = 9.0; // Distance behind player
    this.targetDistance = 9.0;
    this.closeDistance = 3.0;
    this.normalDistance = 9.0;

    this.isAggressive = false;
    this.calmTimer = 0;

    this.animTime = 0;

    this.mesh = new THREE.Group();
    this.createBeastMesh();
    this.scene.add(this.mesh);
  }

  createBeastMesh() {
    // Beast materials: Dark obsidian charcoal stone + glowing fiery eyes
    const matBeast = new THREE.MeshLambertMaterial({ color: 0x1a1614 });
    const matFur = new THREE.MeshLambertMaterial({ color: 0x2b221d });
    const matEyes = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const matFangs = new THREE.MeshLambertMaterial({ color: 0xddddcc });

    // Torso / Hulking chest
    const torsoGeo = new THREE.BoxGeometry(1.6, 1.4, 1.2);
    this.torso = new THREE.Mesh(torsoGeo, matBeast);
    this.torso.position.y = 1.4;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Spine fur ridge
    const furGeo = new THREE.BoxGeometry(0.3, 1.2, 1.4);
    const furMesh = new THREE.Mesh(furGeo, matFur);
    furMesh.position.y = 0.2;
    this.torso.add(furMesh);

    // Head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.6, -0.6);
    this.torso.add(this.head);

    const headGeo = new THREE.BoxGeometry(1.0, 0.8, 1.0);
    const headMesh = new THREE.Mesh(headGeo, matBeast);
    this.head.add(headMesh);

    // Glowing Red Eyes
    const eyeGeo = new THREE.BoxGeometry(0.18, 0.1, 0.1);
    const leftEye = new THREE.Mesh(eyeGeo, matEyes);
    leftEye.position.set(-0.28, 0.15, -0.5);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, matEyes);
    rightEye.position.set(0.28, 0.15, -0.5);
    this.head.add(rightEye);

    // Fangs / Horns
    const hornGeo = new THREE.ConeGeometry(0.15, 0.6, 6);
    const leftHorn = new THREE.Mesh(hornGeo, matFangs);
    leftHorn.position.set(-0.4, 0.45, 0);
    leftHorn.rotation.z = 0.4;
    this.head.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, matFangs);
    rightHorn.position.set(0.4, 0.45, 0);
    rightHorn.rotation.z = -0.4;
    this.head.add(rightHorn);

    // Huge Arms / Claws
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-1.0, 0.3, 0.2);
    this.torso.add(this.leftArm);

    const armGeo = new THREE.BoxGeometry(0.45, 1.4, 0.45);
    const leftArmMesh = new THREE.Mesh(armGeo, matBeast);
    leftArmMesh.position.y = -0.6;
    this.leftArm.add(leftArmMesh);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(1.0, 0.3, 0.2);
    this.torso.add(this.rightArm);

    const rightArmMesh = new THREE.Mesh(armGeo, matBeast);
    rightArmMesh.position.y = -0.6;
    this.rightArm.add(rightArmMesh);

    // Legs
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.5, -0.7, 0.3);
    this.torso.add(this.leftLeg);

    const legGeo = new THREE.BoxGeometry(0.45, 0.9, 0.5);
    const leftLegMesh = new THREE.Mesh(legGeo, matBeast);
    leftLegMesh.position.y = -0.45;
    this.leftLeg.add(leftLegMesh);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.5, -0.7, 0.3);
    this.torso.add(this.rightLeg);

    const rightLegMesh = new THREE.Mesh(legGeo, matBeast);
    rightLegMesh.position.y = -0.45;
    this.rightLeg.add(rightLegMesh);
  }

  reset() {
    this.distance = this.normalDistance;
    this.targetDistance = this.normalDistance;
    this.isAggressive = false;
    this.calmTimer = 0;
    this.animTime = 0;
    this.mesh.visible = true;
  }

  triggerAggro() {
    this.isAggressive = true;
    this.targetDistance = this.closeDistance;
    this.calmTimer = 7.0; // 7 seconds before falling back
    audio.playRoar();
  }

  update(delta, player) {
    if (this.isAggressive) {
      this.calmTimer -= delta;
      if (this.calmTimer <= 0) {
        this.isAggressive = false;
        this.targetDistance = this.normalDistance;
      }
    }

    // Interpolate distance
    const lerpSpeed = this.isAggressive ? 6.0 : 2.0;
    this.distance += (this.targetDistance - this.distance) * Math.min(1.0, delta * lerpSpeed);

    // Follow behind player along their heading
    const forwardX = -Math.sin(player.heading);
    const forwardZ = -Math.cos(player.heading);

    const chaserX = player.mesh.position.x - forwardX * this.distance;
    const chaserZ = player.mesh.position.z - forwardZ * this.distance;
    const chaserY = 0;

    this.mesh.position.set(chaserX, chaserY, chaserZ);
    this.mesh.rotation.y = player.heading;

    // Running pound animation
    this.animTime += delta * player.speed * 0.9;
    const stride = Math.sin(this.animTime);

    this.torso.position.y = 1.4 + Math.abs(stride) * 0.3;
    this.torso.rotation.x = 0.35; // Heavy forward prowling crouch

    this.leftArm.rotation.x = stride * 1.1;
    this.rightArm.rotation.x = -stride * 1.1;

    this.leftLeg.rotation.x = -stride * 0.8;
    this.rightLeg.rotation.x = stride * 0.8;

    this.head.rotation.x = -0.2 + Math.abs(stride) * 0.1;
  }

  pounce(player) {
    // Jump onto player during death
    this.mesh.position.copy(player.mesh.position);
    this.torso.rotation.x = 0.8;
    this.leftArm.rotation.x = -1.4;
    this.rightArm.rotation.x = -1.4;
  }
}
