<script setup lang="ts">
import * as THREE from "three"
import { POSITIONS, initialSpeed } from './constants'
import type { Door, DoorGroup, RoomGroup } from './types';
import { onMounted, useTemplateRef, watchEffect } from 'vue'
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { useThreeSetup } from './composables/useThreeSetup'
import { useModelLoader } from './composables/useModelLoader'
import { useModelInitialization } from './composables/useModelInitialization'
import { useGameState } from './composables/useGameState'
import { useAudioManager } from './composables/useAudioManager'
import { useKeyboardControls, type MouseAnimationParams } from './composables/useKeyboardControls'
import { useEnvironment } from './composables/useEnvironment'
import { useCharacterManager } from './composables/useCharacterManager'
import { useRoomManager } from './composables/useRoomManager'
import GameUI from './components/GameUI.vue'

import gsap from "gsap";


const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Canvas
const canvas = useTemplateRef('canvas')

// Initialize game state
const isMobile = window.matchMedia("(max-width: 500px)").matches;
const roomBufferSize = isMobile ? 3 : 6;
const {
  // Core game state
  gameOver,
  gameStart,
  assetsLoaded,
  showButton,
  showGameOverMessage,
  jump,
  distance,

  // Speed and timing
  SPEED,
  BASE_SPEED,
  speedMultiplier,

  // Progress tracking
  modelProgress,
  totalProgress,

  // Room management
  roomRecycleIndex,
  lastRoomIndex,

  // Helper functions
  updateDistance,
} = useGameState()

// Initialize audio manager
const {
  playMoveSound,
  playJumpSound,
  playDoorSound,
  playCatSound,
  playGameBackground,
  pauseGameBackground,
  setGameBackgroundPlaybackRate,
  gameBackground
} = useAudioManager()

// Initialize keyboard controls at root level
const {
  setupKeyboardControls,
  handleLeftMovement,
  handleRightMovement,
  handleJump,
  initializeControls: initializeKeyboardControls
} = useKeyboardControls(
  gameStart,
  gameOver,
  jump,
  speedMultiplier,
  playMoveSound,
  playJumpSound
)

// Initialize environment setup
const {
  createFloor,
  setupSceneFog,
  cleanupEnvironment,
  removeFloorTextures
} = useEnvironment()

// Initialize character manager
const {
  initMouse: initCharacter,
  updateMouseBoundingSphere
} = useCharacterManager()

// Initialize room manager
const {
  rooms,
  getNextRoomPosition,
  initRooms: initRoomsFromManager
} = useRoomManager(roomBufferSize, roomRecycleIndex, lastRoomIndex)


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
// let debugSphere: THREE.Mesh
let mouseBoundingSphere: THREE.Sphere


let shurikenModel: THREE.Group;
let doorLeftNobBoundingBox: THREE.Box3;
let doorRightNobBoundingBox: THREE.Box3;
let shurikenBoundingBox: THREE.Box3;


let roomModelSize: THREE.Vector3
let roomModel: THREE.Group;


let doorLeftNobModel: THREE.Group;
let doorRightNobModel: THREE.Group;



// Controls setup moved to useThreeSetup composable


// Jump handled by gameState

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


// Game loop
function tick(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
) {
  const clock = new THREE.Clock()

  let previousTime = 0
  const walkingSpeed = 20;

  const SPEED_INCREASE_INTERVAL = 3; // seconds
  let speedIncreaseTimer = 0;


  const animate = () => {

    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update controls
    controls.update()
    controls.autoRotate = false

    if (gameStart.value && !gameOver.value) {
      if (castleModel)
        castleModel.position.z += SPEED.value * deltaTime

      updateRoom(deltaTime)
      updateDistance(deltaTime)
      if (!jump.value) {
        const walkingAnimationSpeed = walkingSpeed * speedMultiplier.value >= 50 ? 50 : walkingSpeed * speedMultiplier.value;

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
        speedMultiplier.value = speedMultiplier.value >= 4 ? 4 : speedMultiplier.value + 0.1
        SPEED.value = BASE_SPEED * speedMultiplier.value;
        if (speedMultiplier.value < 4) {
          speedIncreaseTimer = 0
        }
        // safari has issue with .playbackRate and it glitches the sound. 
        // instead for safari, we don't speed up
        if (!isSafari) {
          setGameBackgroundPlaybackRate(gameBackground.playbackRate >= 2 ? 2 : 1 + (speedMultiplier.value * 0.005))
        }
      }


    }

    // Renderer
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(animate)

  }

  animate()

}

// we update the position with deltaTime so the device frame rate won't cause the different speed 

function updateRoom(deltaTime: number) {
  rooms.value.forEach((room) => {
    const speed = SPEED.value * deltaTime
    room.roomModel.position.z += speed
    room.doors.door1.obj.position.z += speed
    room.doors.door2.obj.position.z += speed
    room.doors.door3.obj.position.z += speed
    room.shuriken.obj.position.z += speed


    // Handle door opening animation
    handleDoorOpening(room.doors)

    // check collisions
    checkCollisions(room)


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
  const lastRoomPositionValue = getNextRoomPosition(roomModelSize);

  // Recycle the oldest room
  const roomToRecycle = rooms.value[roomRecycleIndex.value];


  roomToRecycle.roomModel.position.z = lastRoomPositionValue;

  roomToRecycle.doors.door1.obj.position.z = lastRoomPositionValue + 0.03
  roomToRecycle.doors.door1.obj.position.x = -POSITIONS.DOOR_X_OFFSET

  roomToRecycle.doors.door2.obj.position.z = lastRoomPositionValue - 0.02
  roomToRecycle.doors.door2.obj.position.x = 0

  roomToRecycle.doors.door3.obj.position.z = lastRoomPositionValue + 0.03
  roomToRecycle.doors.door3.obj.position.x = POSITIONS.DOOR_X_OFFSET


  // we are updating the position of shuriken based on the updated door place so we need to place after the positioning door 
  // we probably need to refactor this
  resetRoomGroup(roomToRecycle,)

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

  // reset shuriken
  const randomDoorOffset = roomGroup.roomModel.position.z + (roomGroup.doors.door2.open ? - 0.02 : + 0.03)
  roomGroup.shuriken.obj.position.z = randomDoorOffset - 0.2
  let randomDoorXPosition = 0 // default is second door x position
  if (roomGroup.doors.door1.open) {
    randomDoorXPosition = -POSITIONS.DOOR_X_OFFSET
  } else if (roomGroup.doors.door3.open) {
    randomDoorXPosition = POSITIONS.DOOR_X_OFFSET
  }

  roomGroup.shuriken.obj.position.x = randomDoorXPosition

  // Add a shuriken in about 1 out of 4 rooms (25% chance)
  if (Math.random() < 0.25) {
    roomGroup.shuriken.show = true
    roomGroup.shuriken.obj.visible = true
  } else {
    roomGroup.shuriken.show = false
    roomGroup.shuriken.obj.visible = false
  }

  roomGroup.hide = false
}

function crashMouse(): Promise<void> {
  return new Promise((resolve) => {

    gsap.to(catFeetModel.position, {
      z: 4.5,
      x: mouseModel.position.x,
      duration: 0.7,

    })
    gsap.to(catFeetModel.rotation, {
      x: 0,
      duration: 0.7,
    })
    setTimeout(() => {
      playCatSound()
    }, 700)
    gsap.to(catFeetModel.position, {
      y: 0.2,
      duration: 0.3,
      ease: "power4.inOut",
      delay: 0.7,
    })
    gsap.to(mouseModel.scale, {
      y: 0,
      duration: 0.3,
      ease: "power4.inOut",
      delay: 0.7,
      onComplete: resolve
    })
  })

}
// Game over message handled by gameState
async function checkCollisions(room: RoomGroup) {
  if (Math.abs(room.doors.door1.obj.position.z - mouseModel.position.z) < 1) {
    const doorsToCheck = [room.doors.door1, room.doors.door2, room.doors.door3]

    updateMouseBoundingSphere(mouseModel, mouseBody, mouseBoundingSphere)

    // By applying the world matrix to the bounding box, we move the box to the correct position
    // without recalculating its geometry from scratch. This is much faster.
    const doorBoundingBoxes = doorsToCheck.map(door => {
      // `.copy(...)`: This takes our door's unique, reusable boundingBox and resets it to the shape and size of the master blueprint.
      // It's like stamping a fresh, perfectly - sized box at the world's origin.
      // `.applyMatrix4(door.obj.matrixWorld)`: This is the magic step. It takes the box we just stamped at the origin and applies the object's
      // unique matrixWorld to it.This single operation moves, rotates, and
      // scales the bounding box from the origin to the object's final
      // position and orientation in the 3D world.
      return door.boundingBox.copy(door.obj.userData.templateBoundingBox).applyMatrix4(door.obj.matrixWorld)
    })

    if (room.shuriken.show) {
      const shurikenBoundingBox = room.shuriken.boundingBox.copy(room.shuriken.obj.userData.templateBoundingBox).applyMatrix4(room.shuriken.obj.matrixWorld)
      doorBoundingBoxes.push(shurikenBoundingBox)
    }

    mouseModelBoundingBox.setFromObject(mouseModel)

    if (doorBoundingBoxes.some(boundBox => mouseBoundingSphere.intersectsBox(boundBox))) {
      gameOver.value = true
      await crashMouse()
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
        duration: 0.2 / speedMultiplier.value || 0.05,
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
let castleModel: THREE.Group | null
let trees: THREE.Group[] = []
let catFeetModel: THREE.Group;

let floor: THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
>

let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer

function startGame() {
  if (!showButton.value) return

  // Unlock audio context on user interaction
  // since mobile has difficulty to play sound when user did not interact the mobile screen well
  gameBackground.play();
  gameBackground.pause();

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
      playDoorSound()
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
        if (room.shuriken.show)
          room.shuriken.obj.visible = true
      }
    })
    catFeetModel.visible = true
    gameStart.value = true
    playGameBackground()
    return
  }, 6000)
}

const { loadAllModels } = useModelLoader()

onMounted(async () => {
  if (!canvas.value) return

  // Initialize Three.js setup
  const threeSetup = useThreeSetup(canvas)
  scene = threeSetup.scene
  camera = threeSetup.camera
  renderer = threeSetup.renderer
  controls = threeSetup.controls

  // Create floor and setup environment
  floor = createFloor(scene)
  setupSceneFog(scene)

  const isMobile = window.matchMedia("(max-width: 500px)").matches;

  // Load all models

  const models = await loadAllModels((progress, index) => {
    modelProgress.value[index] = progress;
  })

  // Initialize all models using composable
  const {
    initializeMouseModel,
    initializeCatFeetModel,
    initializeRoomModel,
    initializeDoorModels,
    initializeShurikenModel,
    initializeCastleModel,
    createTrees,
  } = useModelInitialization()

  catFeetModel = initializeCatFeetModel(models.catFeet, scene)

  const mouseData = initializeMouseModel(models.mouse)
  mouseModel = mouseData.mouseModel
  mouseRightBackFoot = mouseData.mouseRightBackFoot
  mouseLeftBackFoot = mouseData.mouseLeftBackFoot
  initialBackFootPositionZ = mouseData.initialBackFootPositionZ
  mouseModelBoundingBox = mouseData.mouseModelBoundingBox
  mouseBody = mouseData.mouseBody
  mouseBodyPositionY = mouseData.mouseBodyPositionY
  mouseTail = mouseData.mouseTail
  mouseTailPositionY = mouseData.mouseTailPositionY

  const roomData = initializeRoomModel(models.room)
  roomModel = roomData.roomModel
  roomModelSize = roomData.roomModelSize

  const doorData = initializeDoorModels(models.doorLeftNob, models.doorRightNob)
  doorLeftNobModel = doorData.doorLeftNobModel
  doorRightNobModel = doorData.doorRightNobModel
  doorLeftNobBoundingBox = doorData.doorLeftNobBoundingBox
  doorRightNobBoundingBox = doorData.doorRightNobBoundingBox

  const shurikenData = initializeShurikenModel(models.shuriken)
  shurikenModel = shurikenData.shurikenModel
  shurikenBoundingBox = shurikenData.shurikenBoundingBox

  castleModel = initializeCastleModel(models.castle, scene)
  trees = createTrees(models.fakeTree, scene, isMobile)

  assetsLoaded.value = true;

  initRoomsFromManager(
    roomModel,
    doorLeftNobModel,
    doorRightNobModel,
    shurikenModel,
    doorLeftNobBoundingBox,
    doorRightNobBoundingBox,
    shurikenBoundingBox,
    roomModelSize,
    scene
  )
  mouseBoundingSphere = initCharacter(mouseModel, mouseBody, scene)

  // Initialize keyboard controls after mouse model is available
  const animationParams: MouseAnimationParams = {
    mouseModel,
    mouseRightBackFoot,
    mouseLeftBackFoot,
    mouseBody,
    mouseTail,
    camera,
    controls
  }

  initializeKeyboardControls(animationParams)
  setupKeyboardControls()

  // Start game loop
  tick(renderer, camera, controls)
})


watchEffect(() => {
  if (gameStart.value) {
    setTimeout(() => {
      cleanupEnvironment(scene, castleModel, trees)
      removeFloorTextures(floor)
    }, 500)

  }
  if (gameStart.value && gameOver.value) {
    pauseGameBackground()
  }
})

function moveRoomsToStartPlace(): Promise<void> {
  return new Promise((resolve) => {
    const initialRoomPosition = -0.8
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

      let openDoorPosition: number = 0
      if (room.doors.door1.open) openDoorPosition = roomPosition + 0.03;
      else if (room.doors.door2.open) openDoorPosition = roomPosition - 0.02;
      else if (room.doors.door3.open) openDoorPosition = roomPosition + 0.03;

      tl.to(room.shuriken.obj.position, {
        z: openDoorPosition - 0.2,
        duration: 3,
      }, 'reset')

      if (index === firstRoomIndex) {
        resetRoomGroup(room)
      }
    })
  })






}


async function restartGame() {
  showGameOverMessage.value = false

  gsap.to(catFeetModel.position, {
    z: 8,
    x: Math.PI / 8,
    y: 0.7,
    duration: 2,

  })
  gsap.to(catFeetModel.rotation, {
    x: 0,
    duration: 2,
  })
  gsap.to(mouseModel.scale, {
    y: 1,
    duration: 2,
  })

  await moveRoomsToStartPlace()

  SPEED.value = initialSpeed
  speedMultiplier.value = 1.0
  gameOver.value = false
  setGameBackgroundPlaybackRate(1.0)
  playGameBackground()
  gameStart.value = true

}
</script>

<template>
  <canvas class="webgl" ref="canvas"></canvas>
  
  <GameUI 
    :assetsLoaded="assetsLoaded"
    :totalProgress="totalProgress"
    :showButton="showButton"
    :gameStart="gameStart"
    :gameOver="gameOver"
    :distance="distance"
    :showGameOverMessage="showGameOverMessage"
    @startGame="startGame"
    @restartGame="restartGame"
    @handleLeftMovement="handleLeftMovement"
    @handleRightMovement="handleRightMovement"
    @handleJump="handleJump"
  />
</template>

<style>
/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  overflow: hidden;
  touch-action: none;
}

.webgl {
  position: fixed;
  top: 0;
  left: 0;
  outline: none;
}
</style>
