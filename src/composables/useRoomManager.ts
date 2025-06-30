import * as THREE from 'three'
import { ref, computed, type Ref } from 'vue'
import { POSITIONS } from '../constants'
import type { RoomGroup } from '../types'

export function useRoomManager(
  roomBufferSize: number,
  roomRecycleIndex: Ref<number>,
  lastRoomIndex: Ref<number>
) {
  const rooms = ref<RoomGroup[]>(new Array(roomBufferSize))

  // Room position computed property
  const lastRoomPosition = computed(() => {
    return rooms.value[lastRoomIndex.value]?.roomModel.position.z ?? 0
  })

  const getNextRoomPosition = (roomModelSize: THREE.Vector3) => {
    if (lastRoomIndex.value === -1) return -3 // Initial position
    return lastRoomPosition.value - roomModelSize.z + 0.1
  }

  const createRoom = (
    index: number,
    roomModel: THREE.Group,
    doorLeftNobModel: THREE.Group,
    doorRightNobModel: THREE.Group,
    shurikenModel: THREE.Group,
    doorLeftNobBoundingBox: THREE.Box3,
    doorRightNobBoundingBox: THREE.Box3,
    shurikenBoundingBox: THREE.Box3,
    roomModelSize: THREE.Vector3,
    scene: THREE.Scene
  ) => {
    const room = roomModel.clone()
    const door1 = doorLeftNobModel.clone()
    // This gets the master blueprint for the door's shape. This blueprint is centered at the origin(0, 0, 0) and has no rotation.It just defines the size.
    door1.userData.templateBoundingBox = doorLeftNobBoundingBox
    const door2 = doorLeftNobModel.clone()
    door2.userData.templateBoundingBox = doorLeftNobBoundingBox
    const door3 = doorRightNobModel.clone()
    door3.userData.templateBoundingBox = doorRightNobBoundingBox

    const shuriken = shurikenModel.clone()
    shuriken.userData.templateBoundingBox = shurikenBoundingBox

    if (index !== 0) {
      room.visible = false
      door1.visible = false
      door2.visible = false
      door3.visible = false
      shuriken.visible = false
    }

    const zPosition = getNextRoomPosition(roomModelSize)

    room.position.set(0, 0, zPosition)

    door1.position.y = POSITIONS.DOOR_Y
    door1.position.z = zPosition + 0.03
    door1.position.x = -POSITIONS.DOOR_X_OFFSET

    door2.position.y = POSITIONS.DOOR_Y
    door2.position.z = zPosition - 0.02

    door3.position.y = POSITIONS.DOOR_Y
    door3.position.z = zPosition + 0.03
    door3.position.x = POSITIONS.DOOR_X_OFFSET

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
    roomRecycleIndex.value = (roomRecycleIndex.value + 1) % rooms.value.length
  }

  const initRooms = (
    roomModel: THREE.Group,
    doorLeftNobModel: THREE.Group,
    doorRightNobModel: THREE.Group,
    shurikenModel: THREE.Group,
    doorLeftNobBoundingBox: THREE.Box3,
    doorRightNobBoundingBox: THREE.Box3,
    shurikenBoundingBox: THREE.Box3,
    roomModelSize: THREE.Vector3,
    scene: THREE.Scene
  ) => {
    for (let i = 0; i < rooms.value.length; i++) {
      createRoom(
        i,
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
    }
  }

  return {
    rooms,
    lastRoomPosition,
    getNextRoomPosition,
    createRoom,
    initRooms
  }
}