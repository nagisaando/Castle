<script setup lang="ts">
import * as THREE from "three"
import GUI from 'lil-gui';
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { DRACOLoader, GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from "three/examples/jsm/libs/stats.module.js";
import gsap from "gsap";


// TODO
// 1. Clean up
// 2. Restart game
// 3. count door
// 4. Sphere not copying in the beginning [DONE]
// 5. Speed really slow
const COLORS = {
  FLOOR: ['#5d2e8c', '#ccff66', '#2EC4B6'],
  DOORS: ['#CF5C36', '#EEE5E9', '#EFC88B']
}

const SIZES = {
  FLOOR: { width: 2.5, height: 6 },
  DOOR: {
    width: 2.5 / 3, height: 1.4, depth: 0.02
  },
  MOUSE: 0.2
}

const SPEED = 3.5


const POSITIONS = {
  DOOR_X_OFFSET: SIZES.FLOOR.width / 3,
  DOOR_Y: 0.016,
  MOUSE_Y: 0.3,
  MOUSE_START_Z: 3,
  MOUSE_X: 0.8,
  CAMERA: { z: 8, y: 1 }
}

// debug
const gui = new GUI();
const stats = new Stats()

/**
 * Types
 */

type Door = {
  obj: THREE.Mesh,
  open: boolean,
  boundingBox: THREE.Box3,
  opened: boolean,
}

type DoorGroup = {
  door1: Door,
  door2: Door,
  door3: Door,
  hide: boolean
}


// Canvas
const canvas = useTemplateRef('canvas')


// Gameover 
let gameOver = false
let gameStart = false



/**
 * Base
 */


// Scene
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()

function loadModel(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, (gltf) => {
      resolve(gltf.scene)
    },
      (xhl) => {
        const percentage = (xhl.loaded / xhl.total * 100).toFixed(0)
        // console.log(`Loading: ${percentage}%`)
      },
      (err) => reject(err)
    )
  })
}

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
gltfLoader.setDRACOLoader(dracoLoader)


// function loadDracoModel(url: string): Promise<THREE.Group> {
//   return new Promise((resolve, reject) => {
//     gltfLoader.load(url, (gltf) => {
//       resolve(gltf.scene)
//     },
//       (xhl) => {
//         const percentage = (xhl.loaded / xhl.total * 100).toFixed(0)
//         // console.log(`Loading: ${percentage}%`)
//       },
//       (err) => reject(err)
//     )
//   })
// }


/**
 * Texture
 */

const textureLoader = new THREE.TextureLoader()
const tatamiColorTexture = textureLoader.load('/texture/tatami/Tatami_basecolor.png')
tatamiColorTexture.colorSpace = THREE.SRGBColorSpace

const tatamiHeightTexture = textureLoader.load('/texture/tatami/Tatami_height.jpg')
const tatamiNormalTexture = textureLoader.load('/texture/tatami/Tatami_normal.jpg')
const tatamiAmbientOcclusionTexture = textureLoader.load('/texture/tatami/Tatami_ambientocclusion.jpg')
const tatamiRoughnessTexture = textureLoader.load('/texture/tatami/Tatami_roughness.jpg')



/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
directionalLight.position.set(1, 4, 1)
scene.add(directionalLight)


// Mouse
const mouse = new THREE.Mesh(
  new THREE.SphereGeometry(SIZES.MOUSE), new THREE.MeshBasicMaterial()
)
mouse.position.set(0, POSITIONS.MOUSE_Y, POSITIONS.MOUSE_START_Z)

const mouseBoundSphere = new THREE.Sphere(mouse.position, SIZES.MOUSE * 1.25)
scene.add(mouse)


// threshold
let thresholdModel: THREE.Group;
const thresholds = ref<THREE.Group[]>(new Array(30))





// Floor
const floors = ref<THREE.Mesh[]>(new Array(30))

// Ring buffer indices for floor
const floorRecycleIndex = ref(0); // Tracks which floor to replace next
const lastFloorIndex = ref(-1)


const lastFloorPosition = computed(() => {
  return floors.value[lastFloorIndex.value]?.position.z ?? 0;
})

const floorGeometry = new THREE.PlaneGeometry(
  SIZES.FLOOR.width,
  SIZES.FLOOR.height,
  // 200,
  // 200,
)

let material = new THREE.MeshStandardMaterial({
  map: tatamiColorTexture,
  aoMap: tatamiAmbientOcclusionTexture,
  normalMap: tatamiNormalTexture,
  roughnessMap: tatamiRoughnessTexture,
  // displacementMap: tatamiHeightTexture,
  // displacementScale: 0.1,
  // displacementBias: -0.03,
})

gui.add(material, 'displacementScale')
  .min(0)
  .max(3)
  .step(0.001)


gui.add(material, 'displacementScale')
  .min(-1)
  .max(3)
  .step(0.001)

function createFloor() {

  const floor = new THREE.Mesh(floorGeometry, material)

  // Set color based on position in sequence
  // const colorIndex = lastFloorIndex.value === -1 ? 0 : lastFloorIndex.value % COLORS.FLOOR.length
  // floor.material.color.set(COLORS.FLOOR[colorIndex])

  // Position the floor
  const spacing = lastFloorIndex.value === -1 ? -3 : (SIZES.FLOOR.height + 0.2)
  floor!.position.z = lastFloorPosition.value - spacing


  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // Create threshold if template is loaded (we need the waiting logic)
  const threshold = thresholdModel.clone()
  threshold.position.set(0, 0.01, floor.position.z - SIZES.FLOOR.height / 2 - 0.1);
  scene.add(threshold)

  // Update ring buffer
  thresholds.value[floorRecycleIndex.value] = threshold
  floors.value[floorRecycleIndex.value] = floor
  lastFloorIndex.value = floorRecycleIndex.value
  floorRecycleIndex.value = (floorRecycleIndex.value + 1) % floors.value.length;

}

function initFloors() {
  for (let i = 0; i < floors.value.length; i++) {
    createFloor()
  }
}



let doorLeftNobModel: THREE.Group;
let doorRightNobModel: THREE.Group;
// const doors = ref<THREE.Group[]>(new Array(6))
const doors = ref<DoorGroup[]>(new Array(6))

// Doors 

const lastDoorPosition = computed(() => {
  return doors.value[lastDoorIndex.value]?.door1.obj.position.z ?? 0
})

// Ring buffer indices for door
const doorRecycleIndex = ref(0); // Tracks which door to replace next
const lastDoorIndex = ref(-1)





const doorGeometry = new THREE.BoxGeometry(SIZES.DOOR.width, SIZES.DOOR.height, SIZES.DOOR.depth)

// I have to modify the position of door
function createDoor() {
  // const doorMaterial1 = new THREE.MeshBasicMaterial({
  //   color: '#CF5C36',
  //   transparent: true
  // })
  // const doorMaterial2 = new THREE.MeshBasicMaterial({
  //   color: '#EEE5E9',
  //   transparent: true
  // })
  // const doorMaterial3 = new THREE.MeshBasicMaterial({
  //   color: '#EFC88B',
  //   transparent: true
  // })

  // let door1: THREE.Mesh
  // let door2: THREE.Mesh
  // let door3: THREE.Mesh


  // Position doors

  // door1 = new THREE.Mesh(doorGeometry, doorMaterial1)
  // door1.position.y = POSITIONS.DOOR_Y

  // door2 = new THREE.Mesh(doorGeometry, doorMaterial2)
  // door2.position.y = POSITIONS.DOOR_Y

  // door3 = new THREE.Mesh(doorGeometry, doorMaterial3)
  // door3.position.y = POSITIONS.DOOR_Y


  const door1 = doorLeftNobModel.clone()
  const door2 = doorLeftNobModel.clone()
  const door3 = doorRightNobModel.clone()

  const spacing = lastDoorIndex.value === -1 ? floors.value[0].position.z - SIZES.FLOOR.height / 2 : -SIZES.FLOOR.height - 0.15 // lastDoorIndex.value = -1 means no door is assigned
  const zPosition = lastDoorPosition.value + spacing

  console.log(zPosition)

  door1.position.y = POSITIONS.DOOR_Y
  door1!.position.z = zPosition - 0.06
  door1!.position.x = -POSITIONS.DOOR_X_OFFSET

  door2.position.y = POSITIONS.DOOR_Y
  door2!.position.z = zPosition - 0.135

  door3.position.y = POSITIONS.DOOR_Y
  door3!.position.z = zPosition - 0.06
  door3!.position.x = POSITIONS.DOOR_X_OFFSET

  scene.add(door1)
  scene.add(door2)
  scene.add(door3)

  const doorGroup: DoorGroup = {
    door1: {
      obj: door1,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false

    },
    door2: {
      obj: door2,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false
    },
    door3: {
      obj: door3,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false
    },
    hide: false
  }

  // Randomly open one door
  const doorsToOpen = ['door1', 'door2', 'door3'] as const
  const randomDoor = doorsToOpen[Math.floor(Math.random() * 3)]
  doorGroup[randomDoor].open = true

  // Update ring buffer
  doors.value[doorRecycleIndex.value] = doorGroup;
  lastDoorIndex.value = doorRecycleIndex.value
  doorRecycleIndex.value = (doorRecycleIndex.value + 1) % doors.value.length;
}

function initDoors() {
  for (let i = 0; i < doors.value.length; i++) {
    createDoor()
  }
}

function setupControls(camera: THREE.PerspectiveCamera) {
  const controls = new OrbitControls(camera, canvas.value)
  controls.enableDamping = true
  return controls
}


// Jump
const jump = ref(false)

function setupKeyboardControls(controls: OrbitControls, camera: THREE.PerspectiveCamera) {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.target !== document.body) return

    const { code } = e

    // Only prevent default for keys we actually handle
    const handledKeys = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp'];
    if (handledKeys.includes(code)) {
      e.preventDefault();
    }


    // Handle game start
    if (code === 'Space') {
      gameStart = true
      gameOver = false
      return
    }

    // Only handle movement if game has started
    if (!gameStart || gameOver) return

    // Handle movement 
    if (code === 'ArrowLeft') handleLeftMovement()
    if (code === 'ArrowRight') handleRightMovement()
    if (code === 'ArrowUp' && !jump.value) handleJump()
    // if (code === 'ArrowDown') handleDown()
  }

  const handleLeftMovement = () => {
    if (mouse.position.x === 0) mouseMove(-POSITIONS.MOUSE_X)
    if (mouse.position.x === POSITIONS.MOUSE_X) mouseMove(0)
  }

  const handleRightMovement = () => {
    if (mouse.position.x === 0) mouseMove(POSITIONS.MOUSE_X)
    if (mouse.position.x === -POSITIONS.MOUSE_X) mouseMove(0)
  }

  const handleJump = () => {
    jump.value = true
    gsap.to(
      mouse.position, {
      y: 0.6,
      duration: 0.25,
      ease: "power1.out",
      onComplete: () => {
        gsap.to(mouse.position, {
          y: 0.4, // Return to original height
          duration: 0.25,
          ease: "bounce.out",
          onComplete: () => {
            jump.value = false
          }
        });
      }
    }
    )
  }

  const mouseMove = (x: number) => {
    gsap.to(mouse.position, {
      duration: 0.2,
      ease: "power2.out",
      x
    });
    gsap.to(controls.target, {
      duration: 0.2,
      ease: "power2.out",
      x,
    });
    gsap.to(camera.position, {
      duration: 0.2,
      ease: "power2.out",
      x,
    });
  }

  window.addEventListener('keydown', handleKeydown)
}

// Game loop
function tick(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  stats: Stats
) {
  const clock = new THREE.Clock()

  let previousTime = 0

  const animate = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update controls
    controls.update()
    controls.autoRotate = false

    if (gameStart && !gameOver) {
      updateFloors(deltaTime)
      updateDoors(deltaTime)
      updateMouseBoundSphere()
    }

    // Renderer
    renderer.render(scene, camera)

    // debug
    stats.update()

    // Call tick again on the next frame
    window.requestAnimationFrame(animate)
  }

  animate()
}

// we update the position with deltaTime so the device frame rate won't cause the different speed 

function updateFloors(deltaTime: number) {
  // update materials
  floors.value.forEach((floor, i) => {
    floor.position.z += SPEED * deltaTime
    thresholds.value[i].position.z += SPEED * deltaTime

    if (floor.position.z > 8) {
      floor.position.z = lastFloorPosition.value - (SIZES.FLOOR.height + 0.2)
      thresholds.value[i].position.z = floor.position.z - SIZES.FLOOR.height / 2 - 0.1

      // check if the ring buffer doing something?
      floors.value[floorRecycleIndex.value] = floor
      lastFloorIndex.value = floorRecycleIndex.value
      floorRecycleIndex.value = (floorRecycleIndex.value + 1) % floors.value.length;
    }
  })
}

function updateDoors(deltaTime: number) {
  doors.value.forEach((door) => {
    door.door1.obj.position.z += SPEED * deltaTime
    door.door2.obj.position.z += SPEED * deltaTime
    door.door3.obj.position.z += SPEED * deltaTime

    // check collisions
    checkDoorCollisions(door)

    // Handle door opening animation
    handleDoorOpening(door)

    // Handle door fading 
    if (!door.hide && door.door2.obj.position.z > 2.5) {
      fadeDoors(door)
    }

    // Recycle doors that go off screen
    if (door.door1.obj.position.z > 5) {
      recycleDoor(door)
    }

  })
}

function checkDoorCollisions(door: DoorGroup) {
  if (Math.abs(door.door1.obj.position.z - mouse.position.z) < 1) {
    const doorsToCheck = [door.door1, door.door2, door.door3]
    // update bounding floors 
    doorsToCheck.forEach(door => door.boundingBox.setFromObject(door.obj))

    if (doorsToCheck.some(door => mouseBoundSphere.intersectsBox(door.boundingBox))) {
      gameOver = true
    }
  }
}

function handleDoorOpening(door: DoorGroup) {
  const openDoor = (doorPart: Door, xOffset: number) => {
    if (!doorPart.opened && doorPart.open && doorPart.obj.position.z > -1) {
      doorPart.opened = true
      gsap.to(doorPart.obj.position, {
        x: `+=${xOffset}`,
        duration: 0.2,
        ease: "power2.out",
      })


    }
  }

  openDoor(door.door1, POSITIONS.DOOR_X_OFFSET)
  openDoor(door.door2, POSITIONS.DOOR_X_OFFSET)
  openDoor(door.door3, -POSITIONS.DOOR_X_OFFSET)
}

function fadeDoors(door: DoorGroup) {
  door.hide = true;
  [door.door1, door.door2, door.door3].forEach((door) => {
    gsap.to(door.obj.material, {
      opacity: '0',
      duration: 2,
      ease: "slow(0.9,0.4,false)",
    })
    gsap.set(door.obj.material, {
      opacity: '1',
      delay: 2

    })
  })
}

function recycleDoor(door: DoorGroup) {
  // Reposition doors 
  const newZ = lastDoorPosition.value - 8
  door.door1.obj.position.z = newZ
  door.door1.obj.position.x = -POSITIONS.DOOR_X_OFFSET

  door.door2.obj.position.z = newZ - SIZES.DOOR.depth
  door.door2.obj.position.x = 0

  door.door3.obj.position.z = newZ
  door.door3.obj.position.x = POSITIONS.DOOR_X_OFFSET

  // Reset door state
  const doorGroup: DoorGroup = {
    door1: {
      ...door.door1,
      open: false,
      opened: false,
    },
    door2: {
      ...door.door2,
      open: false,
      opened: false,
    },
    door3: {
      ...door.door3,
      open: false,
      opened: false,
    },
    hide: false
  }

  // Randomly open one door
  const doorsToOpen = ['door1', 'door2', 'door3'] as const
  const randomDoor = doorsToOpen[Math.floor(Math.random() * 3)]
  doorGroup[randomDoor].open = true

  // Circular buffer replacement
  doors.value[doorRecycleIndex.value] = doorGroup;
  lastDoorIndex.value = doorRecycleIndex.value
  doorRecycleIndex.value = (doorRecycleIndex.value + 1) % doors.value.length;
}

function updateMouseBoundSphere() {
  // Critical: Update the mouse's world matrix before collision check.
  // Three.js doesn't automatically update world transforms until render time.
  // Without this, collision detection would use stale position data from 
  // the previous frame, making movement unresponsive.
  mouse.updateMatrixWorld();
  if (mouse.geometry.boundingSphere)
    mouseBoundSphere.copy(mouse.geometry.boundingSphere).applyMatrix4(mouse.matrixWorld)
}


onMounted(async () => {
  if (!canvas.value) return

  // Debug
  document.body.appendChild(stats.dom)


  /**
   * Sizes
   */

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  }

  /**
  * Camera
  */
  // Base camera
  const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
  camera.position.z = POSITIONS.CAMERA.z
  camera.position.y = POSITIONS.CAMERA.y
  scene.add(camera)

  // Controls
  const controls = setupControls(camera)

  setupKeyboardControls(controls, camera)

  /**
   * Renderer
   */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value as HTMLCanvasElement,
    antialias: true
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(sizes.pixelRatio)

  // Handle resize
  const handleResize = () => {
    // Update sizes 
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
  }
  window.addEventListener('resize', handleResize)


  const [thresholdModelData, doorLeftNobModelData, doorRightModelData] = await Promise.all([
    loadModel('/model/threshold.glb'),
    loadModel('/model/left-door-nob/door.gltf'),
    loadModel('/model/right-door-nob/door.gltf')
  ])
  thresholdModel = thresholdModelData
  thresholdModel.scale.set(0.41, 0.5, 0.5)

  doorLeftNobModel = doorLeftNobModelData

  doorRightNobModel = doorRightModelData
  doorRightModelData.position.set(0.8, 0, 0)


  initFloors()
  initDoors()


  // Start game loop
  tick(renderer, camera, controls, stats)



})





</script>

<template>
  <canvas class="webgl" ref="canvas"></canvas>
</template>

<style>
* {
  margin: 0;
  padding: 0;
}

html,
body {
  overflow: hidden;
}

.webgl {
  position: fixed;
  top: 0;
  left: 0;
  outline: none;
}
</style>
