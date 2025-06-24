<script setup lang="ts">
import * as THREE from "three"
import GUI from 'lil-gui';
import { computed, onMounted, ref, useTemplateRef, watch, watchEffect } from 'vue'
import { DRACOLoader, GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from "three/examples/jsm/libs/stats.module.js";
import gsap from "gsap";


// TODO
// 1. Clean up
// 2. Restart game
// 3. count door
// 4. Sphere not copying in the beginning [DONE]
// 5. Speed really slow

const SIZES = {
  FLOOR: { width: 2.5, height: 6 },
  MOUSE: 0.2
}
const initialSpeed = 3.5
let SPEED = initialSpeed
const BASE_SPEED = initialSpeed
let speedMultiplier = 1.0;

const POSITIONS = {
  DOOR_X_OFFSET: SIZES.FLOOR.width / 3,
  DOOR_Y: 0.08,
  MOUSE_Y: 0,
  MOUSE_START_Z: 4,
  MOUSE_X: 0.8,
  CAMERA: { z: 8, y: 1.25, x: 0 },
  CAMERA_TO_START: { z: 55, y: 40, x: 30 }
  // CAMERA_TO_START: { z: 60, y: 60, x: 60 }
  // CAMERA_TO_START: { z: 8, y: 1.25, x: 0 },
}

// debug
// const gui = new GUI();
const stats = new Stats()

/**
 * Types
 */

type Door = {
  obj: THREE.Group,
  open: boolean,
  boundingBox: THREE.Box3,
  opened: boolean,
}

type DoorGroup = {
  door1: Door,
  door2: Door,
  door3: Door
}


// Canvas
const canvas = useTemplateRef('canvas')


// Gameover
let gameOver = ref(false)
const gameStart = ref(false)



/**
 * Base
 */


// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color().setHex(0x112233);

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


/**
 * Texture
 */

const textureLoader = new THREE.TextureLoader()
const tatamiColorTexture = textureLoader.load('/texture/tatami/Tatami_basecolor.png')
tatamiColorTexture.colorSpace = THREE.SRGBColorSpace

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xbda8a8, 1.2)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xbda8a8, 3)
directionalLight.position.set(1, 0, 1)
const directonalLightHelper = new THREE.DirectionalLightHelper(directionalLight)
scene.add(directionalLight)
scene.add(directonalLightHelper)


// Mouse

let mouseModel: THREE.Group
let mouseRightBackFoot: THREE.Object3D
let mouseLeftBackFoot: THREE.Object3D
let mouseModelBoundingBox: THREE.Box3
let initialBackFootPositionZ: number
let mouseBody: THREE.Object3D
let mouseBodyPositionY: number
let mouseTail: THREE.Object3D
let mouseTailPositionY: number

// const mouse = new THREE.Mesh(
//   new THREE.SphereGeometry(SIZES.MOUSE), new THREE.MeshBasicMaterial()
// )

// const mouseBoundSphere = new THREE.Sphere(mouse.position, SIZES.MOUSE * 1.25)

// mouse.position.set(0, POSITIONS.MOUSE_Y, POSITIONS.MOUSE_START_Z)
// scene.add(mouse)

function initMouse() {
  mouseModel.position.set(0, POSITIONS.MOUSE_Y, POSITIONS.MOUSE_START_Z)
  scene.add(mouseModel)
}




type RoomGroup = {
  doors: {
    door1: Door,
    door2: Door,
    door3: Door,
  },
  roomModel: THREE.Group,
  hide: boolean
}
const rooms = ref<RoomGroup[]>(new Array(6))

let roomModelSize: THREE.Vector3
let roomModel: THREE.Group;

// Ring buffer indices for rooms
const roomRecycleIndex = ref(0); // Tracks which rooms to replace next
const lastRoomIndex = ref(-1)


const lastRoomPosition = computed(() => {
  return rooms.value[lastRoomIndex.value]?.roomModel.position.z ?? 0
})


function getNextRoomPosition() {
  if (lastRoomIndex.value === -1) return -3; // Initial position
  return lastRoomPosition.value - roomModelSize.z + 0.1
}

let doorLeftNobModel: THREE.Group;
let doorRightNobModel: THREE.Group;

function createRoom(index: number) {
  const room = roomModel.clone()
  const door1 = doorLeftNobModel.clone()
  const door2 = doorLeftNobModel.clone()
  const door3 = doorRightNobModel.clone()

  if (index !== 0) {
    room.visible = false
    door1.visible = false
    door2.visible = false
    door3.visible = false
  }

  const zPosition = getNextRoomPosition()

  room.position.set(0, 0, zPosition);

  door1.position.y = POSITIONS.DOOR_Y

  door1!.position.z = zPosition + 0.03
  door1!.position.x = -POSITIONS.DOOR_X_OFFSET

  door2.position.y = POSITIONS.DOOR_Y
  door2!.position.z = zPosition - 0.02

  door3.position.y = POSITIONS.DOOR_Y
  door3!.position.z = zPosition + 0.03
  door3!.position.x = POSITIONS.DOOR_X_OFFSET

  scene.add(room)
  scene.add(door1)
  scene.add(door2)
  scene.add(door3)

  const roomGroup: RoomGroup = {
    doors: {
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
    },
    hide: false,
    roomModel: room
  }

  // Randomly open one door
  const doorsToOpen = ['door1', 'door2', 'door3'] as const
  const randomDoor = doorsToOpen[Math.floor(Math.random() * 3)]
  roomGroup.doors[randomDoor].open = true

  // Update ring buffer
  rooms.value[roomRecycleIndex.value] = roomGroup
  lastRoomIndex.value = roomRecycleIndex.value
  roomRecycleIndex.value = (roomRecycleIndex.value + 1) % rooms.value.length;
}

function initRooms() {
  // for (let i = 0; i < rooms.value.length - 1; i++) {
  for (let i = 0; i < rooms.value.length; i++) {
    createRoom(i)
  }
}



function setupControls(camera: THREE.PerspectiveCamera) {
  const controls = new OrbitControls(camera, canvas.value)
  controls.enableDamping = true
  // controls.enableZoom = false;    // Disable zoom
  // controls.enablePan = false;     // Disable pan
  // controls.enableRotate = false;  // Disable manual rotation
  return controls
}


// Jump
const jump = ref(false)

function animateCameraToCloseUp(controls: OrbitControls, camera: THREE.PerspectiveCamera) {



  // Animate to close-up view
  gsap.to(camera.position, {
    y: POSITIONS.CAMERA.y,
    z: POSITIONS.CAMERA.z,
    x: POSITIONS.CAMERA.x,
    duration: 5, // seconds
    ease: "power2.inOut",
  })
  gsap.to(controls.target, {
    z: -3,
    duration: 5, // seconds
    ease: "power2.inOut",
  });


}

const moveSounds: HTMLAudioElement[] = []
const MAX_SOUND_POOL = 3
let currentMoveSoundIndex = 0

for (let i = 0; i < MAX_SOUND_POOL; i++) {
  const moveSound = new Audio('/sound/zapsplat_cartoon_swoosh_swipe_whoosh_snatch_001_111185.mp3')
  moveSound.preload = 'auto'
  moveSound.volume = 0.2
  moveSounds.push(moveSound)
}

const jumpSounds: HTMLAudioElement[] = []
let currentJumpSoundIndex = 0

for (let i = 0; i < MAX_SOUND_POOL; i++) {
  const jumpSound = new Audio('/sound/haiaa.mp3')
  jumpSound.preload = 'auto'
  jumpSounds.push(jumpSound)
}


const doorSound = new Audio('/sound/zapsplat_foley_cupboard_closet_door_wooden_old_hinge_creak_squeak_very_short_slight_004_106659.mp3')
doorSound.volume = 0.1

function setupKeyboardControls(controls: OrbitControls, camera: THREE.PerspectiveCamera) {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.target !== document.body) return

    const { code } = e

    // Only prevent default for keys we actually handle
    const handledKeys = ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp'];
    if (handledKeys.includes(code)) {
      e.preventDefault();
    }


    // Only handle movement if game has started
    if (!gameStart.value || gameOver.value) return

    // Handle movement 
    if (code === 'ArrowLeft') handleLeftMovement()
    if (code === 'ArrowRight') handleRightMovement()
    if (code === 'ArrowUp' && !jump.value) handleJump()
    // if (code === 'ArrowDown') handleDown()
  }

  const handleLeftMovement = () => {
    if (mouseModel.position.x === 0) mouseMove(-POSITIONS.MOUSE_X)
    if (mouseModel.position.x === POSITIONS.MOUSE_X) mouseMove(0)
  }

  const handleRightMovement = () => {
    if (mouseModel.position.x === 0) mouseMove(POSITIONS.MOUSE_X)
    if (mouseModel.position.x === -POSITIONS.MOUSE_X) mouseMove(0)
  }

  const handleJump = () => {
    jump.value = true
    const jumpSpeedFactor = 1 / speedMultiplier

    const currentRightFootY = mouseRightBackFoot.position.y;
    const currentLeftFootRotationX = mouseLeftBackFoot.rotation.x;
    const currentRightFootRotationX = mouseRightBackFoot.rotation.x;
    const currentBodyRotationX = mouseBody.rotation.x
    const currentTailRotationY = mouseTail.rotation.y
    const currentTailPositionY = mouseTail.position.y

    const sound = jumpSounds[currentJumpSoundIndex]
    sound.playbackRate = sound.playbackRate >= 2 ? 2 : 1 + (speedMultiplier * 0.005)
    currentJumpSoundIndex = (currentJumpSoundIndex + 1) % MAX_SOUND_POOL;
    sound.currentTime = 0
    sound.play()

    const mouseModelPartSpeed = 0.2 * jumpSpeedFactor || 0.03

    gsap.to(
      mouseModel.position, {
      y: 0.2,
      duration: 0.5 * jumpSpeedFactor || 0.1,
      ease: "power1.out",
      onComplete: () => {
        gsap.to(mouseModel.position, {
          y: 0, // Return to original height
          duration: 0.25 * jumpSpeedFactor || 0.05,
          ease: "bounce.out",
          onComplete: () => {
            jump.value = false
          },
        });

        gsap.to(
          mouseLeftBackFoot.rotation, {
          x: currentLeftFootRotationX,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        })
        gsap.to(
          mouseRightBackFoot.rotation, {
          x: currentRightFootRotationX,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        })
        gsap.to(
          mouseRightBackFoot.position, {
          y: currentRightFootY,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        })
        gsap.to(
          mouseBody.rotation, {
          x: currentBodyRotationX,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        })
        gsap.to(
          mouseTail.rotation, {
          y: currentTailRotationY,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        })
        gsap.to(
          mouseTail.position, {
          y: currentTailPositionY,
          duration: mouseModelPartSpeed,
          ease: "power1.out",
        })


      }
    })

    gsap.to(
      mouseLeftBackFoot.rotation, {
      x: `-=${Math.PI / 2}`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    })

    gsap.to(
      mouseRightBackFoot.rotation, {
      x: `-=${Math.PI / 2.4}`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    })


    gsap.to(
      mouseRightBackFoot.position, {
      y: `+=0.01`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    })

    gsap.to(
      mouseBody.rotation, {
      x: -0.4,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    })

    gsap.to(
      mouseTail.rotation, {
      y: -0.1,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    })

    gsap.to(
      mouseTail.position, {
      y: `+=0.1`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    })






  }

  const mouseMove = (x: number) => {
    const moveDuration = 0.2 / speedMultiplier || 0.05;
    gsap.to(mouseModel.position, {
      duration: moveDuration,
      ease: "power2.out",
      x,
      onStart: () => {
        const sound = moveSounds[currentMoveSoundIndex]
        currentMoveSoundIndex = (currentMoveSoundIndex + 1) % MAX_SOUND_POOL;
        sound.currentTime = 0
        sound.playbackRate = sound.playbackRate >= 2 ? 2 : 1 + (speedMultiplier * 0.005)
        sound.play()
      }
    });
    gsap.to(controls.target, {
      duration: moveDuration,
      ease: "power2.out",
      x,
    });
    gsap.to(camera.position, {
      duration: moveDuration,
      ease: "power2.out",
      x,
    });
  }

  window.addEventListener('keydown', handleKeydown)
}



const distance = ref(0)
function updateDistance(delta: number) {
  distance.value += delta * SPEED / 2;
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
  const walkingSpeed = 20; // Adjust as needed
  const stepHeight = 0.05; // How high the feet lift
  const stepLength = 0.03; // How far forward/back feet mo


  const SPEED_INCREASE_INTERVAL = 3; // seconds
  const SPEED_INCREMENT = 0.5;
  let speedIncreaseTimer = 0;


  const animate = () => {

    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update controls
    controls.update()
    controls.autoRotate = false

    if (gameStart.value && !gameOver.value) {

      updateRoom(deltaTime)
      updateDistance(deltaTime)
      if (!jump.value) {
        const walkingAnimationSpeed = walkingSpeed * speedMultiplier >= 50 ? 50 : walkingSpeed * speedMultiplier;

        mouseLeftBackFoot.position.z = initialBackFootPositionZ + Math.sin(elapsedTime * walkingAnimationSpeed) * 0.1
        mouseLeftBackFoot.rotation.x = Math.sin(elapsedTime * walkingAnimationSpeed) * 0.2;
        mouseRightBackFoot.position.z = initialBackFootPositionZ + Math.sin((elapsedTime) * walkingAnimationSpeed + Math.PI) * 0.1
        mouseRightBackFoot.rotation.x = Math.sin(elapsedTime * walkingAnimationSpeed) * 0.2;
        const bodyMovement = Math.sin(elapsedTime * walkingAnimationSpeed) * 0.005
        mouseBody.position.y = mouseBodyPositionY + bodyMovement
        mouseTail.position.y = mouseTailPositionY + bodyMovement

      }


      speedIncreaseTimer += deltaTime;
      if (speedIncreaseTimer >= SPEED_INCREASE_INTERVAL) {
        speedMultiplier = speedMultiplier >= 5 ? 5 : speedMultiplier + 0.1
        SPEED = BASE_SPEED * speedMultiplier;
        if (speedMultiplier < 5) {
          speedIncreaseTimer = 0
        }
        gameBackground.playbackRate = gameBackground.playbackRate >= 2 ? 2 : 1 + (speedMultiplier * 0.005)
      }


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

function updateRoom(deltaTime: number) {
  rooms.value.forEach((room) => {
    room.roomModel.position.z += SPEED * deltaTime
    room.doors.door1.obj.position.z += SPEED * deltaTime
    room.doors.door2.obj.position.z += SPEED * deltaTime
    room.doors.door3.obj.position.z += SPEED * deltaTime
    // check collisions
    checkDoorCollisions(room.doors)

    // Handle door opening animation
    handleDoorOpening(room.doors)

    // Handle door fading 
    if (!room.hide && room.doors.door2.obj.position.z > 5) {
      fadeDoors(room)
    }

    // Recycle doors that go off screen
    if (room.doors.door1.obj.position.z > 8) {
      recycleRoom()
    }
  })

}

function recycleRoom() {
  // Calculate the next position for the room
  const lastRoomPosition = getNextRoomPosition();

  // Recycle the oldest room
  const roomToRecycle = rooms.value[roomRecycleIndex.value];
  roomToRecycle.roomModel.position.z = lastRoomPosition;

  roomToRecycle.doors.door1.obj.position.z = lastRoomPosition + 0.03
  roomToRecycle.doors.door1.obj.position.x = -POSITIONS.DOOR_X_OFFSET

  roomToRecycle.doors.door2.obj.position.z = lastRoomPosition - 0.02
  roomToRecycle.doors.door2.obj.position.x = 0

  roomToRecycle.doors.door3.obj.position.z = lastRoomPosition + 0.03
  roomToRecycle.doors.door3.obj.position.x = POSITIONS.DOOR_X_OFFSET

  resetRoomGroup(roomToRecycle)

  // Update recycle indices
  lastRoomIndex.value = roomRecycleIndex.value
  roomRecycleIndex.value = (roomRecycleIndex.value + 1) % rooms.value.length;
}

function resetRoomGroup(roomGroup: RoomGroup) {
  // Close all doors
  roomGroup.doors.door1.open = false;
  roomGroup.doors.door1.opened = false;
  roomGroup.doors.door2.open = false;
  roomGroup.doors.door2.opened = false;
  roomGroup.doors.door3.open = false;
  roomGroup.doors.door3.opened = false;


  // make the doors visible 
  roomGroup.doors.door1.obj.visible = true;
  roomGroup.doors.door2.obj.visible = true;
  roomGroup.doors.door3.obj.visible = true;


  // Randomly open one door
  const doorsToOpen = ['door1', 'door2', 'door3'] as const
  const randomDoor = doorsToOpen[Math.floor(Math.random() * 3)]
  roomGroup.doors[randomDoor].open = true

  roomGroup.hide = false
}


const showGameOverMessage = ref(false)
function checkDoorCollisions(door: DoorGroup) {
  if (Math.abs(door.door1.obj.position.z - mouseModel.position.z) < 1) {
    const doorsToCheck = [door.door1, door.door2, door.door3]
    // update bounding floors 
    doorsToCheck.forEach(door => door.boundingBox.setFromObject(door.obj))
    mouseModelBoundingBox.setFromObject(mouseModel)
    if (doorsToCheck.some(door => mouseModelBoundingBox.intersectsBox(door.boundingBox))) {
      gameOver.value = true
      showGameOverMessage.value = true
    }
  }
}

function handleDoorOpening(door: DoorGroup) {
  const openDoor = (doorPart: Door, xOffset: number) => {
    if (!doorPart.opened && doorPart.open && doorPart.obj.position.z > -1) {
      doorPart.opened = true
      gsap.to(doorPart.obj.position, {
        x: `+=${xOffset}`,
        duration: 0.2 / speedMultiplier || 0.05,
        ease: "power2.out",
      })


    }
  }

  openDoor(door.door1, POSITIONS.DOOR_X_OFFSET)
  openDoor(door.door2, POSITIONS.DOOR_X_OFFSET)
  openDoor(door.door3, -POSITIONS.DOOR_X_OFFSET)
}

function fadeDoors(room: RoomGroup) {
  room.hide = true;
  [room.doors.door1, room.doors.door2, room.doors.door3].forEach((door) => {
    door.obj.visible = false
  })
}


// castle 

// floor 

const alphaTexture = textureLoader.load('/texture/alpha.jpg')
const floorColorTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_diff_1k.jpg')
floorColorTexture.colorSpace = THREE.SRGBColorSpace
const floorNormalTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_nor_gl_1k.png')
const floorARMTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_arm_1k.jpg')


floorColorTexture.repeat.set(10, 10)
floorARMTexture.repeat.set(10, 10)
floorNormalTexture.repeat.set(10, 10)

floorColorTexture.wrapS = THREE.RepeatWrapping
floorColorTexture.wrapT = THREE.RepeatWrapping

floorARMTexture.wrapS = THREE.RepeatWrapping
floorARMTexture.wrapT = THREE.RepeatWrapping

floorNormalTexture.wrapS = THREE.RepeatWrapping
floorNormalTexture.wrapT = THREE.RepeatWrapping

let floor: THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
> = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({
    alphaMap: alphaTexture,
    transparent: true,
    map: floorColorTexture,
    aoMap: floorARMTexture,
    roughnessMap: floorARMTexture,
    metalnessMap: floorARMTexture,
    normalMap: floorNormalTexture
  }

  ))
floor.rotation.x = -Math.PI / 2
scene.add(floor)


scene.fog = new THREE.FogExp2('#112233', 0.015)



let castleModel: THREE.Group | null
let trees: THREE.Group[] = []

let camera: THREE.PerspectiveCamera
let controls: OrbitControls

const showButton = ref(true)
function startGame() {
  if (!showButton.value) return

  showButton.value = false
  animateCameraToCloseUp(controls, camera)

  if (!castleModel) return
  const rightDoor = castleModel.getObjectByName("right-door") as THREE.Object3D
  const leftDoor = castleModel.getObjectByName("left-door") as THREE.Object3D


  gsap.to(rightDoor.rotation, {
    y: Math.PI / 2,
    ease: 'power1.out',
    duration: 1,
    delay: 3,
    onStart: () => {
      doorSound.play()
    }
  })
  gsap.to(leftDoor.rotation, {
    y: -Math.PI / 2,
    ease: 'power1.out',
    duration: 1,
    delay: 3
  })
  setTimeout(() => {
    rooms.value.forEach((room, i) => {
      if (i !== 0) {
        // since we were hiding the rest of the room from the castle view
        // we will show them right before game starts
        room.roomModel.visible = true
        room.doors.door1.obj.visible = true
        room.doors.door2.obj.visible = true
        room.doors.door3.obj.visible = true
      }
    })
    gameStart.value = true
    gameBackground.currentTime = 0
    gameBackground.play()
    return
  }, 6000)
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
  camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 400)
  camera.position.z = POSITIONS.CAMERA_TO_START.z
  camera.position.y = POSITIONS.CAMERA_TO_START.y
  camera.position.x = POSITIONS.CAMERA_TO_START.x
  scene.add(camera)

  // Controls
  controls = setupControls(camera)

  setupKeyboardControls(controls, camera)

  /**
   * Renderer
   */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value as HTMLCanvasElement,
    antialias: true,
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


  const [doorLeftNobModelData, doorRightModelData, castle, room, fakeTree, mouse] = await Promise.all([
    loadModel('/model/left-door-nob/door.gltf'),
    loadModel('/model/right-door-nob/door.gltf'),
    loadModel('/model/castle/castle.gltf'),
    loadModel('/model/interior/interior.gltf'),
    loadModel('/model/tree-fake/tree-fake.gltf'),
    loadModel('/model/mouse/mouse.gltf'),
  ])


  const size = new THREE.Vector3()

  mouseModel = mouse
  mouseRightBackFoot = mouseModel.getObjectByName("right-rear-foot") as THREE.Object3D
  mouseLeftBackFoot = mouseModel.getObjectByName("left-rear-foot") as THREE.Object3D
  initialBackFootPositionZ = mouseLeftBackFoot.position.z
  mouseModelBoundingBox = new THREE.Box3().setFromObject(mouseModel)

  mouseBody = mouseModel.getObjectByName('body') as THREE.Object3D
  mouseBodyPositionY = mouseBody.position.y

  mouseTail = mouseModel.getObjectByName('tail') as THREE.Object3D
  mouseTailPositionY = mouseTail.position.y

  roomModel = room
  const roomBoundingBox = new THREE.Box3().setFromObject(roomModel)

  roomModelSize = roomBoundingBox.getSize(size)

  doorLeftNobModel = doorLeftNobModelData

  doorRightNobModel = doorRightModelData
  doorRightModelData.position.set(0.8, 0, 0)

  initRooms()
  initMouse()



  castleModel = castle
  scene.add(castleModel)

  const minDist = 10; // Closest trees are 10 units away
  const maxDist = 70; // Farthest trees are 80 units away
  const exclusionZone = { x: [-5, 5], z: [0, 30] }; // No trees spawn here
  for (let i = 0; i < 400; i++) {
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
      (x >= exclusionZone.x[0] && x <= exclusionZone.x[1] &&
        z >= exclusionZone.z[0] && z <= exclusionZone.z[1]) &&
      attempts < maxAttempts
    );

    // Skip if too many attempts (optional)
    if (attempts >= maxAttempts) continue;

    tree.position.set(x, 0, z);
    scene.add(tree);
    trees.push(tree)
  }


  // Start game loop
  tick(renderer, camera, controls, stats)



})

function cleanUpSceneWhenGameStarts() {
  if (castleModel) {
    scene.remove(castleModel);
    castleModel = null; // Allow garbage collection
  }
  trees.forEach(tree => {
    scene.remove(tree)
    trees = []
  })

  scene.fog = null
}

// https://www.zapsplat.com/music/game-music-action-retro-8-bit-style-bouncy-hard-dance-track-with-electronic-synths-and-drums/
// need credit page
const gameBackground = new Audio('/sound/music_zapsplat_game_music_action_retro_8_bit_repeating_016.mp3')
gameBackground.volume = 0.4
gameBackground.loop = true


watchEffect(() => {
  if (gameStart.value) {
    cleanUpSceneWhenGameStarts()
    removeFloorTexture()
  }
  if (gameStart.value && gameOver.value) {
    gameBackground.pause()
  }
})

function moveRoomsToStartPlace(): Promise<void> {
  return new Promise((resolve) => {
    const initialRoomPosition = -2.5
    const firstRoomIndex = roomRecycleIndex.value
    const firstRoom = rooms.value[roomRecycleIndex.value];
    distance.value = 0
    const distanceToMove = firstRoom.roomModel.position.z - initialRoomPosition

    let tl = gsap.timeline({
      onComplete: () => resolve()
    });
    tl.add('reset')

    tl.to(mouseModel.position, {
      x: 0,
      y: 0,
      duration: 3,
    }, 'reset')
    tl.to(controls.target, {
      x: 0,
      duration: 3,
    }, 'reset')
    tl.to(camera.position, {
      x: 0,
      duration: 3,
    }, 'reset')

    rooms.value.forEach((room, index) => {
      tl.to(room.roomModel.position, {
        z: `-=${distanceToMove}`,
        duration: 3,
      }, 'reset')


      const roomPosition = room.roomModel.position.z - distanceToMove
      tl.to(room.doors.door1.obj.position, {
        z: roomPosition + 0.03,
        x: -POSITIONS.DOOR_X_OFFSET,
        duration: 3,
      }, 'reset')

        .to(room.doors.door2.obj.position, {
          z: roomPosition - 0.02,
          x: 0,
          duration: 3,
        }, 'reset')

        .to(room.doors.door3.obj.position, {
          z: roomPosition + 0.03,
          x: POSITIONS.DOOR_X_OFFSET,
          duration: 3,
        }, 'reset')

      if (index === firstRoomIndex) {
        resetRoomGroup(room)
      }
    })
  })






}

function removeFloorTexture() {
  floor.material.alphaMap?.dispose()
  floor.material.alphaMap = null

  floor.material.map?.dispose()
  floor.material.map = null

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


  floorARMTexture.dispose()
  floorNormalTexture.dispose()
  floorColorTexture.dispose()
  alphaTexture.dispose()

  floor.material.dispose()
  floor.geometry.dispose()

  floor.material = new THREE.MeshBasicMaterial({
    color: '#787464',
  })

  floor.material.needsUpdate = true
}

async function restartGame() {
  showGameOverMessage.value = false
  await moveRoomsToStartPlace()
  gameBackground.currentTime = 0
  SPEED = initialSpeed
  speedMultiplier = 1.0
  gameOver.value = false
  gameBackground.playbackRate = 1.0
  gameBackground.play()
  gameStart.value = true

}
</script>

<template>

  <canvas class="webgl" ref="canvas">

  </canvas>
  <button v-if="showButton" @click="startGame" class="game-start">Game Start</button>
  <p class="distance">Distance: {{ Math.floor(distance) }}</p>
  <div v-if="showGameOverMessage" class="game-over">
    <p>Game over...</p>
    <button @click="restartGame">try again</button>
  </div>
</template>

<style>
button {
  font-size: 2rem;
  border: 2px white solid;
}

button.game-start {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  p {

    font-size: 3rem;
    margin-bottom: 0.5rem;
    color: black;
    font-weight: 500;


  }

  button {
    text-wrap: nowrap;
  }
}

p.distance {
  position: absolute;
  font-size: 2rem;
  right: 2rem;
  top: 1rem;
  color: white;

}

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
