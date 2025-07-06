import * as THREE from "three";
import { POSITIONS, JUMP_HEIGHT } from "../constants";
import { useTextureManager } from "./useTextureManager";

export interface ShadowManagerSetup {
  createShadow: (
    mouseModel: THREE.Group,
    mouseBody: THREE.Object3D,
    scene: THREE.Scene
  ) => THREE.Mesh;
  updateShadowForJump: (shadow: THREE.Mesh, mouseY: number) => void;
  updateShadowPosition: (shadow: THREE.Mesh, mouseX: number) => void;
}

export function useShadowManager(): ShadowManagerSetup {
  const { getShadowTexture } = useTextureManager();

  const createShadow = (
    mouseModel: THREE.Group,
    mouseBody: THREE.Object3D,
    scene: THREE.Scene
  ): THREE.Mesh => {
    // Calculate body size for shadow dimensions
    const bodySize = new THREE.Box3()
      .setFromObject(mouseBody)
      .getSize(new THREE.Vector3());

    const shadowTexture = getShadowTexture();

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(bodySize.y * 2, bodySize.y * 2),
      new THREE.MeshBasicMaterial({
        alphaMap: shadowTexture,
        transparent: true,
        color: 0x000000,
      })
    );

    // Position shadow on ground
    shadow.position.set(
      mouseModel.position.x,
      POSITIONS.MOUSE_Y + 0.08,
      POSITIONS.MOUSE_START_Z + 0.3
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    return shadow;
  };

  const updateShadowForJump = (shadow: THREE.Mesh, mouseY: number) => {
    // Calculate shadow scale based on mouse height
    // When mouse is at ground level (0), shadow is full size (1.0)
    // As mouse goes higher, shadow gets smaller to simulate distance
    const maxJumpHeight = JUMP_HEIGHT;
    const minShadowScale = 0.5; // Minimum shadow size at peak jump
    const heightRatio = mouseY / maxJumpHeight;
    const shadowScale = 1 - heightRatio * (1 - minShadowScale);

    // Ensure shadow scale doesn't go below minimum
    const finalScale = Math.max(shadowScale, minShadowScale);

    shadow.scale.set(finalScale, finalScale, 1);

    // Optionally adjust shadow opacity based on height
    const material = shadow.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0.3, 1 - heightRatio * 0.4);
  };

  const updateShadowPosition = (shadow: THREE.Mesh, mouseX: number) => {
    // Only update x-position, z-position stays fixed on ground
    shadow.position.x = mouseX;
  };

  return {
    createShadow,
    updateShadowForJump,
    updateShadowPosition,
  };
}
