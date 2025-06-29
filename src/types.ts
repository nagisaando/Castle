import * as THREE from "three"

export type Door = {
  obj: THREE.Group,
  open: boolean,
  boundingBox: THREE.Box3,
  opened: boolean,
}

export type DoorGroup = {
  door1: Door,
  door2: Door,
  door3: Door
}

export type RoomGroup = {
  doors: {
    door1: Door,
    door2: Door,
    door3: Door,
  },
  roomModel: THREE.Group,
  hide: boolean,
  shuriken: {
    obj: THREE.Group,
    boundingBox: THREE.Box3,
    show: boolean
  }
}
