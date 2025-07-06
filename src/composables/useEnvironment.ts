import * as THREE from "three";
import { useTextureManager } from "./useTextureManager";

export interface EnvironmentSetup {
  createFloor: (
    scene: THREE.Scene
  ) => THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
  >;
  setupSceneFog: (scene: THREE.Scene) => void;
  cleanupEnvironment: (
    scene: THREE.Scene,
    castleModel: THREE.Group | null,
    trees: THREE.Group[]
  ) => void;
  removeFloorTextures: (
    floor: THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
    >
  ) => void;
}

export function useEnvironment(): EnvironmentSetup {
  const { getFloorTextures, disposeTexture } = useTextureManager();

  const createFloor = (scene: THREE.Scene) => {
    // Load textures using texture manager
    const { alpha, color, normal, arm } = getFloorTextures();

    // Create floor mesh
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        alphaMap: alpha,
        transparent: true,
        map: color,
        aoMap: arm,
        roughnessMap: arm,
        metalnessMap: arm,
        normalMap: normal,
      })
    );

    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    return floor;
  };

  const setupSceneFog = (scene: THREE.Scene) => {
    scene.fog = new THREE.FogExp2("#112233", 0.015);
  };

  const cleanupEnvironment = (
    scene: THREE.Scene,
    castleModel: THREE.Group | null,
    trees: THREE.Group[]
  ) => {
    // Remove castle model
    if (castleModel) {
      scene.remove(castleModel);
    }

    // Remove trees
    trees.forEach((tree) => {
      scene.remove(tree);
    });
    trees = [];

    // Remove fog
    scene.fog = null;
  };

  const removeFloorTextures = (
    floor: THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
    >
  ) => {
    // Dispose textures from material first
    floor.material.alphaMap?.dispose();
    floor.material.map?.dispose();
    floor.material.aoMap?.dispose();

    // Clear material texture references
    floor.material.alphaMap = null;
    floor.material.map = null;
    floor.material.aoMap = null;

    // Type guard for MeshStandardMaterial
    if ("roughnessMap" in floor.material) {
      // TypeScript now knows this is MeshStandardMaterial
      floor.material.roughnessMap?.dispose();
      floor.material.roughnessMap = null;
      floor.material.metalnessMap?.dispose();
      floor.material.metalnessMap = null;
      floor.material.normalMap?.dispose();
      floor.material.normalMap = null;
    }

    // Then dispose from texture manager cache
    disposeTexture("/texture/alpha.jpg");
    disposeTexture("/texture/ground/brown_mud_leaves_01_diff_1k.jpg");
    disposeTexture("/texture/ground/brown_mud_leaves_01_nor_gl_1k.png");
    disposeTexture("/texture/ground/brown_mud_leaves_01_arm_1k.jpg");

    // Dispose of material and geometry
    floor.material.dispose();
    floor.geometry.dispose();

    // Replace with basic material
    floor.material = new THREE.MeshBasicMaterial({
      color: "#787464",
    });

    floor.material.needsUpdate = true;
  };

  return {
    createFloor,
    setupSceneFog,
    cleanupEnvironment,
    removeFloorTextures,
  };
}
