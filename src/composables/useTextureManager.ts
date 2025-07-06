import * as THREE from "three";

export interface TextureManagerSetup {
  getTexture: (path: string) => THREE.Texture;
  getFloorTextures: () => {
    alpha: THREE.Texture;
    color: THREE.Texture;
    normal: THREE.Texture;
    arm: THREE.Texture;
  };
  getShadowTexture: () => THREE.Texture;
  disposeTexture: (path: string) => void;
}

export function useTextureManager(): TextureManagerSetup {
  const textureLoader = new THREE.TextureLoader();
  const textureCache = new Map<string, THREE.Texture>();

  const getTexture = (path: string): THREE.Texture => {
    if (textureCache.has(path)) {
      return textureCache.get(path)!;
    }

    const texture = textureLoader.load(path);
    textureCache.set(path, texture);
    return texture;
  };

  const getFloorTextures = () => {
    const alpha = getTexture("/texture/alpha.jpg");
    const color = getTexture("/texture/ground/brown_mud_leaves_01_diff_1k.jpg");
    const normal = getTexture(
      "/texture/ground/brown_mud_leaves_01_nor_gl_1k.png"
    );
    const arm = getTexture("/texture/ground/brown_mud_leaves_01_arm_1k.jpg");

    // Set color space
    color.colorSpace = THREE.SRGBColorSpace;

    // Set texture repeat
    color.repeat.set(10, 10);
    arm.repeat.set(10, 10);
    normal.repeat.set(10, 10);

    // Set texture wrapping
    color.wrapS = THREE.RepeatWrapping;
    color.wrapT = THREE.RepeatWrapping;
    arm.wrapS = THREE.RepeatWrapping;
    arm.wrapT = THREE.RepeatWrapping;
    normal.wrapS = THREE.RepeatWrapping;
    normal.wrapT = THREE.RepeatWrapping;

    return { alpha, color, normal, arm };
  };

  const getShadowTexture = (): THREE.Texture => {
    return getTexture("/texture/shadow.jpg");
  };

  const disposeTexture = (path: string) => {
    const texture = textureCache.get(path);
    if (texture) {
      texture.dispose();
      textureCache.delete(path);
    }
  };

  return {
    getTexture,
    getFloorTextures,
    getShadowTexture,
    disposeTexture,
  };
}
