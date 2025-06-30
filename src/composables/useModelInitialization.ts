import * as THREE from "three";

export interface ModelInitializationSetup {
  initializeMouseModel: (mouse: THREE.Group) => MouseModelData;
  initializeCatFeetModel: (
    catFeet: THREE.Group,
    scene: THREE.Scene
  ) => THREE.Group;
  initializeRoomModel: (room: THREE.Group) => RoomModelData;
  initializeDoorModels: (
    doorLeftNob: THREE.Group,
    doorRightNob: THREE.Group
  ) => DoorModelData;
  initializeShurikenModel: (shuriken: THREE.Group) => ShurikenModelData;
  initializeCastleModel: (
    castle: THREE.Group,
    scene: THREE.Scene
  ) => THREE.Group;
  createTrees: (
    fakeTree: THREE.Group,
    scene: THREE.Scene,
    isMobile: boolean
  ) => THREE.Group[];
}

export interface MouseModelData {
  mouseModel: THREE.Group;
  mouseRightBackFoot: THREE.Object3D;
  mouseLeftBackFoot: THREE.Object3D;
  mouseModelBoundingBox: THREE.Box3;
  initialBackFootPositionZ: number;
  mouseBody: THREE.Object3D;
  mouseBodyPositionY: number;
  mouseTail: THREE.Object3D;
  mouseTailPositionY: number;
}

export interface RoomModelData {
  roomModel: THREE.Group;
  roomModelSize: THREE.Vector3;
}

export interface DoorModelData {
  doorLeftNobModel: THREE.Group;
  doorRightNobModel: THREE.Group;
  doorLeftNobBoundingBox: THREE.Box3;
  doorRightNobBoundingBox: THREE.Box3;
}

export interface ShurikenModelData {
  shurikenModel: THREE.Group;
  shurikenBoundingBox: THREE.Box3;
}

export function useModelInitialization(): ModelInitializationSetup {
  const initializeMouseModel = (mouse: THREE.Group): MouseModelData => {
    const mouseModel = mouse;
    const mouseRightBackFoot = mouseModel.getObjectByName(
      "right-rear-foot"
    ) as THREE.Object3D;
    const mouseLeftBackFoot = mouseModel.getObjectByName(
      "left-rear-foot"
    ) as THREE.Object3D;
    const initialBackFootPositionZ = mouseLeftBackFoot.position.z;
    const mouseModelBoundingBox = new THREE.Box3().setFromObject(mouseModel);

    const mouseBody = mouseModel.getObjectByName("body") as THREE.Object3D;
    const mouseBodyPositionY = mouseBody.position.y;

    const mouseTail = mouseModel.getObjectByName("tail") as THREE.Object3D;
    const mouseTailPositionY = mouseTail.position.y;

    return {
      mouseModel,
      mouseRightBackFoot,
      mouseLeftBackFoot,
      mouseModelBoundingBox,
      initialBackFootPositionZ,
      mouseBody,
      mouseBodyPositionY,
      mouseTail,
      mouseTailPositionY,
    };
  };

  const initializeCatFeetModel = (
    catFeet: THREE.Group,
    scene: THREE.Scene
  ): THREE.Group => {
    const catFeetModel = catFeet;
    catFeetModel.position.z = 8;
    catFeetModel.rotation.x = Math.PI / 8;
    catFeetModel.position.y = 0.7;
    catFeetModel.visible = false;
    scene.add(catFeetModel);
    return catFeetModel;
  };

  const initializeRoomModel = (room: THREE.Group): RoomModelData => {
    const roomModel = room;
    const roomBoundingBox = new THREE.Box3().setFromObject(roomModel);
    const roomModelSize = roomBoundingBox.getSize(new THREE.Vector3());

    return {
      roomModel,
      roomModelSize,
    };
  };

  const initializeDoorModels = (
    doorLeftNob: THREE.Group,
    doorRightNob: THREE.Group
  ): DoorModelData => {
    const doorLeftNobModel = doorLeftNob;
    const doorRightNobModel = doorRightNob;
    const doorLeftNobBoundingBox = new THREE.Box3().setFromObject(
      doorLeftNobModel
    );
    const doorRightNobBoundingBox = new THREE.Box3().setFromObject(
      doorRightNobModel
    );

    return {
      doorLeftNobModel,
      doorRightNobModel,
      doorLeftNobBoundingBox,
      doorRightNobBoundingBox,
    };
  };

  const initializeShurikenModel = (
    shuriken: THREE.Group
  ): ShurikenModelData => {
    const shurikenModel = shuriken;
    const shurikenBoundingBox = new THREE.Box3().setFromObject(shurikenModel);

    return {
      shurikenModel,
      shurikenBoundingBox,
    };
  };

  const initializeCastleModel = (
    castle: THREE.Group,
    scene: THREE.Scene
  ): THREE.Group => {
    const castleModel = castle;
    scene.add(castleModel);
    return castleModel;
  };

  const createTrees = (
    fakeTree: THREE.Group,
    scene: THREE.Scene,
    isMobile: boolean
  ): THREE.Group[] => {
    const trees: THREE.Group[] = [];
    const treeCount = isMobile ? 50 : 250;
    const minDist = 10; // Closest trees are 10 units away
    const maxDist = isMobile ? 30 : 70; // Farthest trees are 30(mobile) or 70 units away
    const exclusionZone = { x: [-5, 5], z: [0, isMobile ? 10 : 30] }; // No trees spawn here

    for (let i = 0; i < treeCount; i++) {
      const tree = fakeTree.clone();
      let x, z;
      let attempts = 0;
      const maxAttempts = 10; // Safety net to prevent infinite loops

      do {
        // Random angle and distance within range
        const angle = Math.random() * Math.PI * 2;
        const distance = minDist + Math.random() * (maxDist - minDist);

        x = Math.cos(angle) * distance;
        z = Math.sin(angle) * distance;
        attempts++;
      } while (
        // Keep trying if inside exclusion zone
        x >= exclusionZone.x[0] &&
        x <= exclusionZone.x[1] &&
        z >= exclusionZone.z[0] &&
        z <= exclusionZone.z[1] &&
        attempts < maxAttempts
      );

      // Skip if too many attempts (optional)
      if (attempts >= maxAttempts) continue;

      tree.position.set(x, 0, z);
      scene.add(tree);
      trees.push(tree);
    }

    return trees;
  };

  return {
    initializeMouseModel,
    initializeCatFeetModel,
    initializeRoomModel,
    initializeDoorModels,
    initializeShurikenModel,
    initializeCastleModel,
    createTrees,
  };
}
