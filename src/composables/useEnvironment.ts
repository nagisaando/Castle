import * as THREE from 'three'

export interface EnvironmentSetup {
  createFloor: (scene: THREE.Scene) => THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>
  setupSceneFog: (scene: THREE.Scene) => void
  cleanupEnvironment: (scene: THREE.Scene, castleModel: THREE.Group | null, trees: THREE.Group[]) => void
  removeFloorTextures: (floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>) => void
}

export function useEnvironment(): EnvironmentSetup {
  const textureLoader = new THREE.TextureLoader()
  
  // Store texture references internally for disposal
  let alphaTexture: THREE.Texture
  let floorColorTexture: THREE.Texture
  let floorNormalTexture: THREE.Texture
  let floorARMTexture: THREE.Texture

  const createFloor = (scene: THREE.Scene) => {
    // Load textures and store references
    alphaTexture = textureLoader.load('/texture/alpha.jpg')
    floorColorTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_diff_1k.jpg')
    floorNormalTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_nor_gl_1k.png')
    floorARMTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_arm_1k.jpg')

    // Set color space
    floorColorTexture.colorSpace = THREE.SRGBColorSpace

    // Set texture repeat
    floorColorTexture.repeat.set(10, 10)
    floorARMTexture.repeat.set(10, 10)
    floorNormalTexture.repeat.set(10, 10)

    // Set texture wrapping
    floorColorTexture.wrapS = THREE.RepeatWrapping
    floorColorTexture.wrapT = THREE.RepeatWrapping
    floorARMTexture.wrapS = THREE.RepeatWrapping
    floorARMTexture.wrapT = THREE.RepeatWrapping
    floorNormalTexture.wrapS = THREE.RepeatWrapping
    floorNormalTexture.wrapT = THREE.RepeatWrapping

    // Create floor mesh
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        alphaMap: alphaTexture,
        transparent: true,
        map: floorColorTexture,
        aoMap: floorARMTexture,
        roughnessMap: floorARMTexture,
        metalnessMap: floorARMTexture,
        normalMap: floorNormalTexture
      })
    )

    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    return floor
  }

  const setupSceneFog = (scene: THREE.Scene) => {
    scene.fog = new THREE.FogExp2('#112233', 0.015)
  }

  const cleanupEnvironment = (scene: THREE.Scene, castleModel: THREE.Group | null, trees: THREE.Group[]) => {
    // Remove castle model
    if (castleModel) {
      scene.remove(castleModel)
    }

    // Remove trees
    trees.forEach(tree => {
      scene.remove(tree)
    })
    trees = [];

    // Remove fog
    scene.fog = null
  }

  const removeFloorTextures = (floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>) => {
    // Dispose of alpha map
    floor.material.alphaMap?.dispose()
    floor.material.alphaMap = null

    // Dispose of main texture map
    floor.material.map?.dispose()
    floor.material.map = null

    // Dispose of AO map
    floor.material.aoMap?.dispose()
    floor.material.aoMap = null

    // Type guard for MeshStandardMaterial
    if ('roughnessMap' in floor.material) {
      // TypeScript now knows this is MeshStandardMaterial
      floor.material.roughnessMap?.dispose()
      floor.material.roughnessMap = null

      floor.material.metalnessMap?.dispose()
      floor.material.metalnessMap = null

      floor.material.normalMap?.dispose()
      floor.material.normalMap = null
    }

    // Dispose of stored texture references
    floorARMTexture.dispose()
    floorNormalTexture.dispose()
    floorColorTexture.dispose()
    alphaTexture.dispose()

    // Dispose of material and geometry
    floor.material.dispose()
    floor.geometry.dispose()

    // Replace with basic material
    floor.material = new THREE.MeshBasicMaterial({
      color: '#787464',
    })

    floor.material.needsUpdate = true
  }

  return {
    createFloor,
    setupSceneFog,
    cleanupEnvironment,
    removeFloorTextures
  }
}