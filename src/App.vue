<script setup lang="ts">
import * as THREE from "three"
import { POSITIONS, initialSpeed } from './constants'
import type { Door, DoorGroup, RoomGroup } from './types';
import { computed, onMounted, ref, useTemplateRef, watchEffect } from 'vue'
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { useThreeSetup } from './composables/useThreeSetup'
import { useModelLoader } from './composables/useModelLoader'
import { useModelInitialization } from './composables/useModelInitialization'
import { useGameState } from './composables/useGameState'
import { useAudioManager } from './composables/useAudioManager'

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
  resetGameBackground,
  setGameBackgroundPlaybackRate,
  gameBackground
} = useAudioManager()



/**
 * Base
 */


// Scene
// Scene will be created by useThreeSetup composable

// Model loading will be handled by useModelLoader composable


/**
 * Texture
 */

const textureLoader = new THREE.TextureLoader()

// Lights will be created by useThreeSetup composable


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


function initMouse() {
  mouseModel.position.set(0, POSITIONS.MOUSE_Y, POSITIONS.MOUSE_START_Z)
  scene.add(mouseModel)

  // Calculate body size
  const bodySize = new THREE.Box3().setFromObject(mouseBody).getSize(new THREE.Vector3());
  const sphereRadius = Math.max(bodySize.x, bodySize.y, bodySize.z) * 0.5 * 0.8; // 80% of half the largest dimension


  // In 3D modeling, child objects (mouse body) often have local positions relative to their parent
  // to create the bounding sphere with the child object, I have to give a world coordinate to the mouse body object
  // so that it can properly update the bounding sphere


  // Get world position of the body
  mouseModel.updateMatrixWorld() // Ensure transforms are up-to-date
  const bodyWorldPosition = new THREE.Vector3()
  mouseBody.getWorldPosition(bodyWorldPosition)

  mouseBoundingSphere = new THREE.Sphere(bodyWorldPosition, sphereRadius);



  // we can remove this later, this is just visualize sphere 
  // const debugSphereGeometry = new THREE.SphereGeometry(1, 16, 16);
  // const debugSphereMaterial = new THREE.MeshBasicMaterial({
  //   color: 0xffff00,
  //   wireframe: true,
  //   transparent: true,
  //   opacity: 0.5
  // });
  // debugSphere = new THREE.Mesh(debugSphereGeometry, debugSphereMaterial);
  // debugSphere.position.copy(mouseBoundingSphere.center);
  // debugSphere.scale.setScalar(mouseBoundingSphere.radius);
  // scene.add(debugSphere);
}

function updateMouseBoundingSphere() {
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





let shurikenModel: THREE.Group;
let doorLeftNobBoundingBox: THREE.Box3;
let doorRightNobBoundingBox: THREE.Box3;
let shurikenBoundingBox: THREE.Box3;

const rooms = ref<RoomGroup[]>(new Array(roomBufferSize))

let roomModelSize: THREE.Vector3
let roomModel: THREE.Group;

// Room position computed property
const lastRoomPosition = computed(() => {
  return rooms.value[lastRoomIndex.value]?.roomModel.position.z ?? 0
})


function getNextRoomPosition() {
  if (lastRoomIndex.value === -1) return -3; // Initial position
  return lastRoomPosition.value - roomModelSize.z + 0.1
}

let doorLeftNobModel: THREE.Group;
let doorRightNobModel: THREE.Group;

// const obj = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.1), new THREE.MeshBasicMaterial({}))
// obj.position.y = 0.1
// scene.add(obj)
function createRoom(index: number) {
  const room = roomModel.clone()
  const door1 = doorLeftNobModel.clone()
  // This gets the master blueprint for the door's shape. This blueprint is centered at the origin(0, 0, 0) and has no rotation.It just defines the size.
  door1.userData.templateBoundingBox = doorLeftNobBoundingBox;
  const door2 = doorLeftNobModel.clone()
  door2.userData.templateBoundingBox = doorLeftNobBoundingBox;
  const door3 = doorRightNobModel.clone()
  door3.userData.templateBoundingBox = doorRightNobBoundingBox;

  const shuriken = shurikenModel.clone()
  shuriken.userData.templateBoundingBox = shurikenBoundingBox;




  if (index !== 0) {
    room.visible = false
    door1.visible = false
    door2.visible = false
    door3.visible = false
    shuriken.visible = false
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
  scene.add(shuriken)

  const roomGroup: RoomGroup = {
    doors: {
      door1: {
        obj: door1,
        open: false,
        boundingBox: doorLeftNobBoundingBox.clone(),
        opened: false

      },
      door2: {
        obj: door2,
        open: false,
        boundingBox: doorLeftNobBoundingBox.clone(),
        opened: false
      },
      door3: {
        obj: door3,
        open: false,
        boundingBox: doorRightNobBoundingBox.clone(),
        opened: false
      },
    },
    shuriken: {
      obj: shuriken,
      boundingBox: shurikenBoundingBox.clone(),
      show: false
    },
    hide: false,
    roomModel: room,
  }

  // Randomly open one door
  const doorsToOpen = ['door1', 'door2', 'door3'] as const
  const randomDoor = doorsToOpen[Math.floor(Math.random() * 3)]
  roomGroup.doors[randomDoor].open = true

  // place the shuriken behind the door to open

  shuriken.position.z = roomGroup.doors[randomDoor].obj.position.z - 0.2
  shuriken.position.x = roomGroup.doors[randomDoor].obj.position.x



  // Add a shuriken in about 1 out of 4 rooms (25% chance)
  if (Math.random() < 0.25) {
    roomGroup.shuriken.show = true
  } else {
    roomGroup.shuriken.show = false
    // if shuriken is in the first index AND if Math.random() is bigger than 0.25, 
    // we will hide shuriken
    shuriken.visible = false
  }

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


function setupKeyboardControls() {
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



  window.addEventListener('keydown', handleKeydown)
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
  const jumpSpeedFactor = 1 / speedMultiplier.value

  const currentRightFootY = mouseRightBackFoot.position.y;
  const currentLeftFootRotationX = mouseLeftBackFoot.rotation.x;
  const currentRightFootRotationX = mouseRightBackFoot.rotation.x;
  const currentBodyRotationX = mouseBody.rotation.x
  const currentTailRotationY = mouseTail.rotation.y
  const currentTailPositionY = mouseTail.position.y

  playJumpSound(speedMultiplier.value)

  const mouseModelPartSpeed = 0.2 * jumpSpeedFactor || 0.03

  gsap.to(
    mouseModel.position, {
    y: 0.23,
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
  const moveDuration = 0.2 / speedMultiplier.value || 0.05;
  gsap.to(mouseModel.position, {
    duration: moveDuration,
    ease: "power2.out",
    x,
    onStart: () => {
      playMoveSound(speedMultiplier.value)
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



// Distance handled by gameState
// Game loop
function tick(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  // stats: Stats
) {
  const clock = new THREE.Clock()

  let previousTime = 0
  const walkingSpeed = 20; // Adjust as needed
  // const stepHeight = 0.05; // How high the feet lift
  // const stepLength = 0.03; // How far forward/back feet mo


  const SPEED_INCREASE_INTERVAL = 3; // seconds
  // const SPEED_INCREMENT = 0.5;
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

    // debug
    // stats.update()

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

    updateMouseBoundingSphere()

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

// Floor will be created in onMounted



let castleModel: THREE.Group | null
let trees: THREE.Group[] = []
let catFeetModel: THREE.Group;

// Floor and textures will be initialized in onMounted
let floor: THREE.Mesh<
  THREE.PlaneGeometry,
  THREE.MeshStandardMaterial | THREE.MeshBasicMaterial
>
let alphaTexture: THREE.Texture
let floorColorTexture: THREE.Texture
let floorNormalTexture: THREE.Texture
let floorARMTexture: THREE.Texture

let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer

// UI state handled by gameState
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

// Progress tracking handled by gameState


onMounted(async () => {
  if (!canvas.value) return

  // Debug
  // document.body.appendChild(stats.dom)

  // Initialize Three.js setup
  const threeSetup = useThreeSetup(canvas)
  scene = threeSetup.scene
  camera = threeSetup.camera
  renderer = threeSetup.renderer
  controls = threeSetup.controls

  setupKeyboardControls()

  // Create floor
  alphaTexture = textureLoader.load('/texture/alpha.jpg')
  floorColorTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_diff_1k.jpg')
  floorColorTexture.colorSpace = THREE.SRGBColorSpace
  floorNormalTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_nor_gl_1k.png')
  floorARMTexture = textureLoader.load('/texture/ground/brown_mud_leaves_01_arm_1k.jpg')

  floorColorTexture.repeat.set(10, 10)
  floorARMTexture.repeat.set(10, 10)
  floorNormalTexture.repeat.set(10, 10)

  floorColorTexture.wrapS = THREE.RepeatWrapping
  floorColorTexture.wrapT = THREE.RepeatWrapping

  floorARMTexture.wrapS = THREE.RepeatWrapping
  floorARMTexture.wrapT = THREE.RepeatWrapping

  floorNormalTexture.wrapS = THREE.RepeatWrapping
  floorNormalTexture.wrapT = THREE.RepeatWrapping

  floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({
      alphaMap: alphaTexture,
      transparent: true,
      map: floorColorTexture,
      aoMap: floorARMTexture,
      roughnessMap: floorARMTexture,
      metalnessMap: floorARMTexture,
      normalMap: floorNormalTexture
    }))
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  scene.fog = new THREE.FogExp2('#112233', 0.015)

  const isMobile = window.matchMedia("(max-width: 500px)").matches;

  // Load all models
  const { loadAllModels } = useModelLoader()
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

  initRooms()
  initMouse()

  // Start game loop
  tick(renderer, camera, controls)



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


watchEffect(() => {
  if (gameStart.value) {
    setTimeout(() => {
      cleanUpSceneWhenGameStarts()
      removeFloorTexture()
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

  <canvas class="webgl" ref="canvas">

  </canvas>
  <div v-if="!assetsLoaded" class="loading-overlay">
    <p>Loading... {{ totalProgress }}%</p>
  </div>

  <div v-if="assetsLoaded && showButton" class="game-start">
    <button @click="startGame">Game Start</button>
    <div class="key-info">
      <p><span class="key">&lt;</span>: move left</p>
      <p><span class="key">&gt;</span>: move right</p>
      <p><span class="key">&#x22C0;</span>: jump</p>
    </div>
  </div>

  <div class="info">
    <p class="distance">Distance: {{ Math.floor(distance) }}</p>
    <div v-if="gameStart" class="key-info">
      <p><span class="key">&lt;</span>: move left</p>
      <p><span class="key">&gt;</span>: move right</p>
      <p><span class="key">&#x22C0;</span>: jump</p>
    </div>
  </div>


  <p class="credit">Sound by <a href="https://www.zapsplat.com/" target="_blank">ZapSplat</a></p>

  <div v-if="showGameOverMessage" class="game-over">
    <p>Game over...</p>
    <button @click="restartGame">try again</button>
  </div>


  <!-- this is ui for mobile -->
  <div class="mobile-handle-buttons" v-if="gameStart && !gameOver">
    <button @click="handleLeftMovement">&#9664;</button>
    <button @click="handleJump">🔼</button>
    <button @click="handleRightMovement"> &#9654;</button>
  </div>


</template>

<style>
/* Variables */
:root {
  --text-color: white;
  --font-size-l: 2rem;
  --font-size-m: 1.5rem;
  --font-size-s: 1rem;
  --spacing-m: 1rem;
  --spacing-l: 2rem;
}

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

/* UI Elements */
button {
  font-size: var(--font-size-l);
  border: 2px solid var(--text-color);
  background-color: transparent;
  color: var(--text-color);
}

.key {
  border: 1px solid var(--text-color);
  padding: var(--spacing-m) var(--spacing-l);
  margin-right: var(--spacing-m);
}

/* Layout & Containers */
.credit {
  position: absolute;
  right: var(--spacing-l);
  bottom: var(--spacing-m);
  color: var(--text-color);
}

.info {
  position: absolute;
  right: var(--spacing-l);
  top: var(--spacing-m);
  color: var(--text-color);
  text-align: right;
}

.info .distance {
  font-size: var(--font-size-l);
}

.info .key-info {
  text-align: left;
  color: var(--text-color);
}

.info .key-info p {
  padding: 0.2rem 0;
}

.info .key-info .key {
  padding: 0.2rem 0.4rem;
  margin-right: 0.6rem;
}

/* Overlays */
.loading-overlay,
.game-start,
.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.loading-overlay {
  color: var(--text-color);
  font-size: var(--font-size-l);
}

.game-start .key-info {
  font-size: 1.3rem;
  text-align: left;
  margin-top: var(--spacing-l);
  color: var(--text-color);
}

.game-start .key-info p {
  padding: var(--spacing-m) 0;
}

.game-over p {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: black;
  font-weight: 500;
}

.game-over button {
  text-wrap: nowrap;
}

/* Mobile Specific */
.mobile-handle-buttons {
  display: none;
  /* Hidden by default */
}

@media only screen and (max-width: 500px) {
  button {
    font-size: var(--font-size-m);
  }

  .game-over p {
    font-size: var(--font-size-m);
  }

  .info .distance {
    font-size: var(--font-size-m);
  }

  .key-info {
    display: none;
  }

  .mobile-handle-buttons {
    display: block;
    position: absolute;
    bottom: 10%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .mobile-handle-buttons button {
    padding: 1rem;
  }
}
</style>
