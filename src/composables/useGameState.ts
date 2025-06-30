import { ref, computed, type ComputedRef, type Ref } from "vue";
import { initialSpeed } from "../constants";

export interface GameStateSetup {
  // Core game state
  gameOver: Ref<boolean>;
  gameStart: Ref<boolean>;
  assetsLoaded: Ref<boolean>;
  showButton: Ref<boolean>;
  showGameOverMessage: Ref<boolean>;
  jump: Ref<boolean>;
  distance: Ref<number>;

  // Speed and timing
  SPEED: { value: number };
  BASE_SPEED: number;
  speedMultiplier: { value: number };

  // Progress tracking
  modelProgress: Ref<number[]>;
  totalProgress: ComputedRef<number>;

  // Room management
  roomRecycleIndex: Ref<number>;
  lastRoomIndex: Ref<number>;

  // Helper functions
  updateDistance: (delta: number) => void;
}

export function useGameState(): GameStateSetup {
  // Core game state
  const gameOver = ref(false);
  const gameStart = ref(false);
  const assetsLoaded = ref(false);
  const showButton = ref(true);
  const showGameOverMessage = ref(false);
  const jump = ref(false);
  const distance = ref(0);

  // Speed and timing - using objects to make them mutable
  const SPEED = { value: initialSpeed };
  const BASE_SPEED = initialSpeed;
  const speedMultiplier = { value: 1.0 };

  // Progress tracking
  const modelProgress = ref<number[]>(new Array(8).fill(0));
  const totalProgress = computed(() => {
    const sum = modelProgress.value.reduce((acc, curr) => acc + curr, 0);
    return Math.floor(sum / modelProgress.value.length);
  });

  // Room management
  const roomRecycleIndex = ref(0);
  const lastRoomIndex = ref(-1);

  // Helper functions
  const updateDistance = (delta: number) => {
    distance.value += (delta * initialSpeed) / 2;
  };

  return {
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
  };
}
