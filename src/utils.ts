import * as THREE from "three";
import { SIZES } from "./constants";

/**
 * Calculates a random position for shuriken in the first half of the next room
 * while maintaining safe spacing from the door
 *
 * @param doorZ - The Z position of the door where shuriken should appear
 * @param doorX - The X position of the door (shuriken matches door's X position)
 * @param roomZ - The Z position of the current room back
 * @returns Object with x and z coordinates for shuriken placement
 */
export function getRandomShurikenPosition(
  doorZ: number,
  doorX: number,
  roomZ: number
): { x: number; z: number } {
  const floorHalfHeight = SIZES.FLOOR.height / 2; // 3 units

  // Keep existing safe spacing behind door
  const behindDoor = doorZ - 0.2;

  // IMPORTANT: Room positioning context from Blender export
  // In Blender: Room Back (Y=0) -------- Room Front (Y=-6)
  // In Three.js: Room Back (Z=roomZ) -------- Room Front (Z=roomZ+6)
  // roomZ represents the BACK EDGE of the room, not the center

  // Next room back edge is one room depth further back
  const nextRoomBack = roomZ - SIZES.FLOOR.height; // Back of next room (roomZ - 6)
  const nextRoomCenter = nextRoomBack + floorHalfHeight; // Center of next room (roomZ - 3)

  // Random position calculation:
  // behindDoor + Math.random() * (nextRoomCenter - behindDoor)
  // - Math.random() gives 0-1 (like 0.3)
  // - (nextRoomCenter - behindDoor) calculates total distance between boundaries
  // - Math.random() * distance gives random offset within that distance
  // - behindDoor + offset positions the shuriken randomly in the range
  const randomZ = behindDoor + Math.random() * (nextRoomCenter - behindDoor);

  return {
    x: doorX, // Shuriken follows door's X position
    z: randomZ, // Random Z between door spacing and center of next room
  };
}
