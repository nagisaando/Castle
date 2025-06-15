<script setup lang="ts">
import * as THREE from "three"
import GUI from 'lil-gui';
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from "three/examples/jsm/libs/stats.module.js";
import gsap from "gsap";


// TODO
// 1. Clean up
// 2. Restart game
// 3. count door
// 4. Sphere not copying in the beginning
// 5. Speed really slow
const COLORS = {
  BOX: ['#5d2e8c', '#ccff66', '#2EC4B6'],
  WALLS: ['#CF5C36', '#EEE5E9', '#EFC88B']
}

const SIZES = {
  BOX: { width: 2.1, height: 0.1, depth: 2.1 },
  WALL: {
    width: 0.7, height: 1.5, depth: 0.1
  },
  MOUSE: 0.2
}


const POSITIONS = {
  WALL_X_OFFSET: 0.7,
  WALL_Y: 0.75,
  MOUSE_Y: 0.3,
  MOUSE_START_Z: 3,
  CAMERA: { z: 7, Y: 1 }
}


/**
 * Types
 */

type Wall = {
  obj: THREE.Mesh,
  open: boolean,
  boundingBox: THREE.Box3,
  opened: boolean,
}

type WallGroup = {
  wall1: Wall,
  wall2: Wall,
  wall3: Wall,
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




/**
 * Materials
 */

// Mouse
const mouse = new THREE.Mesh(
  new THREE.SphereGeometry(SIZES.MOUSE), new THREE.MeshBasicMaterial()
)
mouse.position.set(0, POSITIONS.MOUSE_Y, POSITIONS.MOUSE_START_Z)

const mouseBoundSphere = new THREE.Sphere(mouse.position, SIZES.MOUSE * 1.25)
scene.add(mouse)


// Boxes
const boxes = ref<THREE.Mesh[]>(new Array(30))

// Ring buffer indices for box
const boxRecycleIndex = ref(0); // Tracks which box to replace next
const lastBoxIndex = ref(-1)


const lastBoxPosition = computed(() => {
  return boxes.value[lastBoxIndex.value]?.position.z ?? 0;
})


function createBox() {
  const BoxGeometry = new THREE.BoxGeometry(
    SIZES.BOX.width,
    SIZES.BOX.height,
    SIZES.BOX.depth
  )
  const material = new THREE.MeshBasicMaterial()
  const box = new THREE.Mesh(BoxGeometry, material)

  // Set color based on position in sequence
  const colorIndex = lastBoxIndex.value === -1 ? 0 : lastBoxIndex.value % COLORS.BOX.length
  box.material.color.set(COLORS.BOX[colorIndex])

  // Position the box
  const spacing = lastBoxIndex.value === -1 ? -3 : 2.1
  box!.position.z = lastBoxPosition.value - spacing

  scene.add(box)

  // Update ring buffer
  boxes.value[boxRecycleIndex.value] = box
  lastBoxIndex.value = boxRecycleIndex.value
  boxRecycleIndex.value = (boxRecycleIndex.value + 1) % boxes.value.length;

}

function initBoxes() {
  for (let i = 0; i < boxes.value.length; i++) {
    createBox()
  }
}



// Walls 
const walls = ref<WallGroup[]>(new Array(6))

const lastWallPosition = computed(() => {
  return walls.value[lastWallIndex.value]?.wall1.obj.position.z ?? 0
})

// Ring buffer indices for wall
const wallRecycleIndex = ref(0); // Tracks which wall to replace next
const lastWallIndex = ref(-1)





const wallGeometry = new THREE.BoxGeometry(0.7, 1.5, 0.1)

function createWall() {
  const wallMaterial1 = new THREE.MeshBasicMaterial({
    color: '#CF5C36',
    transparent: true
  })
  const wallMaterial2 = new THREE.MeshBasicMaterial({
    color: '#EEE5E9',
    transparent: true
  })
  const wallMaterial3 = new THREE.MeshBasicMaterial({
    color: '#EFC88B',
    transparent: true
  })

  let wall1: THREE.Mesh
  let wall2: THREE.Mesh
  let wall3: THREE.Mesh

  // Position walls

  wall1 = new THREE.Mesh(wallGeometry, wallMaterial1)
  wall1.position.y = 0.75

  wall2 = new THREE.Mesh(wallGeometry, wallMaterial2)
  wall2.position.y = 0.75

  wall3 = new THREE.Mesh(wallGeometry, wallMaterial3)
  wall3.position.y = 0.75

  const spacing = lastWallIndex.value === -1 ? 2 : 8 // lastWallIndex.value = -1 means no wall is assigned
  const zPosition = lastWallPosition.value - spacing

  wall1!.position.z = zPosition
  wall1!.position.x = -0.7

  wall2!.position.z = zPosition - 0.1

  wall3!.position.z = zPosition
  wall3!.position.x = 0.7

  scene.add(wall1)
  scene.add(wall2)
  scene.add(wall3)

  const wallGroup: WallGroup = {
    wall1: {
      obj: wall1,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false

    },
    wall2: {
      obj: wall2,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false
    },
    wall3: {
      obj: wall3,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false
    },
    hide: false
  }

  // Randomly open one wall
  const wallsToOpen = ['wall1', 'wall2', 'wall3'] as const
  const randomWall = wallsToOpen[Math.floor(Math.random() * 3)]
  wallGroup[randomWall].open = true

  // Update ring buffer
  walls.value[wallRecycleIndex.value] = wallGroup;
  lastWallIndex.value = wallRecycleIndex.value
  wallRecycleIndex.value = (wallRecycleIndex.value + 1) % walls.value.length;
}

function initWalls() {
  for (let i = 0; i < walls.value.length; i++) {
    createWall()
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
    e.preventDefault()

    const { code } = e

    // Handle movement 
    if (code === 'ArrowLeft') handleLeftMovement()
    if (code === 'ArrowRight') handleRightMovement()
    if (code === 'ArrowUp' && !jump.value) handleJump()
    // if (code === 'ArrowDown') handleDown()
  }

  const handleLeftMovement = () => {
    if (mouse.position.x === 0) mouseMove(-0.65)
    if (mouse.position.x === 0.65) mouseMove(0)
  }

  const handleRightMovement = () => {
    if (mouse.position.x === 0) mouseMove(0.65)
    if (mouse.position.x === -0.65) mouseMove(0)
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


    if (gameStart && !gameOver) {
      updateBoxes(deltaTime)
      updateWalls(deltaTime)
      updateMouseBoundSphere()
    }

    // Update controls
    controls.update()
    controls.autoRotate = false

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

function updateBoxes(deltaTime: number) {
  // update materials
  boxes.value.forEach((box) => {
    box.position.z += 3.5 * deltaTime

    if (box.position.z > 5) {
      box.position.z = lastBoxPosition.value - 2.1
      boxes.value[boxRecycleIndex.value] = box
      lastBoxIndex.value = boxRecycleIndex.value
      boxRecycleIndex.value = (boxRecycleIndex.value + 1) % boxes.value.length;
    }
  })
}

function updateWalls(deltaTime: number) {
  walls.value.forEach((wall) => {
    wall.wall1.obj.position.z += 3.5 * deltaTime
    wall.wall2.obj.position.z += 3.5 * deltaTime
    wall.wall3.obj.position.z += 3.5 * deltaTime

    // check collisions
    checkWallCollisions(wall)

    // Handle wall opening animation
    handleWallOpening(wall)

    // Handle wall fading 
    if (!wall.hide && wall.wall2.obj.position.z > 2.5) {
      fadeWalls(wall)
    }

    // Recycle walls that go off screen
    if (wall.wall1.obj.position.z > 5) {
      recycleWall(wall)
    }

  })
}

function checkWallCollisions(wall: WallGroup) {
  if (Math.abs(wall.wall1.obj.position.z - mouse.position.z) < 1) {
    const wallsToCheck = [wall.wall1, wall.wall2, wall.wall3]
    // update bounding boxes 
    wallsToCheck.forEach(wall => wall.boundingBox.setFromObject(wall.obj))

    if (wallsToCheck.some(wall => mouseBoundSphere.intersectsBox(wall.boundingBox))) {
      gameOver = true
    }
  }
}

function handleWallOpening(wall: WallGroup) {
  const openWall = (wallPart: Wall, xOffset: number) => {
    if (!wallPart.opened && wallPart.open && wallPart.obj.position.z > -1) {
      wallPart.opened = true
      gsap.to(wallPart.obj.position, {
        x: `+=${xOffset}`,
        duration: 0.2,
        ease: "power2.out",
      })


    }
  }

  openWall(wall.wall1, 0.7)
  openWall(wall.wall2, 0.7)
  openWall(wall.wall3, -0.7)
}

function fadeWalls(wall: WallGroup) {
  wall.hide = true;
  [wall.wall1, wall.wall2, wall.wall3].forEach((wall) => {
    gsap.to(wall.obj.material, {
      opacity: '0',
      duration: 2,
      ease: "slow(0.9,0.4,false)",
    })
    gsap.set(wall.obj.material, {
      opacity: '1',
      delay: 2

    })
  })
}

function recycleWall(wall: WallGroup) {
  // Reposition walls 
  const newZ = lastWallPosition.value - 8
  wall.wall1.obj.position.z = newZ
  wall.wall1.obj.position.x = -0.7

  wall.wall2.obj.position.z = newZ - 0.1
  wall.wall2.obj.position.x = 0

  wall.wall3.obj.position.z = newZ
  wall.wall3.obj.position.x = 0.7

  // Reset wall state
  const wallGroup: WallGroup = {
    wall1: {
      ...wall.wall1,
      open: false,
      opened: false,
    },
    wall2: {
      ...wall.wall2,
      open: false,
      opened: false,
    },
    wall3: {
      ...wall.wall3,
      open: false,
      opened: false,
    },
    hide: false
  }

  // Randomly open one wall
  const wallsToOpen = ['wall1', 'wall2', 'wall3'] as const
  const randomWall = wallsToOpen[Math.floor(Math.random() * 3)]
  wallGroup[randomWall].open = true

  // Circular buffer replacement
  walls.value[wallRecycleIndex.value] = wallGroup;
  lastWallIndex.value = wallRecycleIndex.value
  wallRecycleIndex.value = (wallRecycleIndex.value + 1) % walls.value.length;
}

function updateMouseBoundSphere() {
  if (mouse.geometry.boundingSphere)
    mouseBoundSphere.copy(mouse.geometry.boundingSphere).applyMatrix4(mouse.matrixWorld)
}
onMounted(() => {

  if (!canvas.value) return

  // Debug
  const gui = new GUI();
  const stats = new Stats()
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
  camera.position.z = 7
  camera.position.y = 1
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

  initBoxes()
  initWalls()
  // initialize game objects
  window.addEventListener('keydown', (e) => {
    const { code } = e
    if (code === 'Space') {
      gameStart = true

    }
  })

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
