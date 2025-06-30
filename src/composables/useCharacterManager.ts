import * as THREE from 'three'
import { POSITIONS } from '../constants'

export function useCharacterManager() {
  const initMouse = (
    mouseModel: THREE.Group,
    mouseBody: THREE.Object3D,
    scene: THREE.Scene
  ): THREE.Sphere => {
    mouseModel.position.set(0, POSITIONS.MOUSE_Y, POSITIONS.MOUSE_START_Z)
    scene.add(mouseModel)

    // Calculate body size
    const bodySize = new THREE.Box3().setFromObject(mouseBody).getSize(new THREE.Vector3())
    const sphereRadius = Math.max(bodySize.x, bodySize.y, bodySize.z) * 0.5 * 0.8 // 80% of half the largest dimension

    // In 3D modeling, child objects (mouse body) often have local positions relative to their parent
    // to create the bounding sphere with the child object, I have to give a world coordinate to the mouse body object
    // so that it can properly update the bounding sphere

    // Get world position of the body
    mouseModel.updateMatrixWorld() // Ensure transforms are up-to-date
    const bodyWorldPosition = new THREE.Vector3()
    mouseBody.getWorldPosition(bodyWorldPosition)

    const mouseBoundingSphere = new THREE.Sphere(bodyWorldPosition, sphereRadius)

    // Optional debug visualization (commented out)
    // const debugSphereGeometry = new THREE.SphereGeometry(1, 16, 16);
    // const debugSphereMaterial = new THREE.MeshBasicMaterial({
    //   color: 0xffff00,
    //   wireframe: true,
    //   transparent: true,
    //   opacity: 0.5
    // });
    // const debugSphere = new THREE.Mesh(debugSphereGeometry, debugSphereMaterial);
    // debugSphere.position.copy(mouseBoundingSphere.center);
    // debugSphere.scale.setScalar(mouseBoundingSphere.radius);
    // scene.add(debugSphere);

    return mouseBoundingSphere
  }

  const updateMouseBoundingSphere = (
    mouseModel: THREE.Group,
    mouseBody: THREE.Object3D,
    mouseBoundingSphere: THREE.Sphere
  ) => {
    // 1. Update all world matrices in the hierarchy
    //    - mouseBody's world position depends on parent (mouseModel) transforms
    //    - Three.js doesn't auto-update world matrices until render time
    // Without this, we'd use stale positions for collision detection
    mouseModel.updateMatrixWorld()

    // 2. Update collision sphere to match current world position:
    //    - getWorldPosition() accounts for ALL parent transforms
    //    - mouseBoundingSphere.center will now match visual position
    mouseBody.getWorldPosition(mouseBoundingSphere.center)

    // Debug visualization (optional)
    // debugSphere.position.copy(mouseBoundingSphere.center)
    // debugSphere.scale.setScalar(mouseBoundingSphere.radius)
  }

  return {
    initMouse,
    updateMouseBoundingSphere
  }
}