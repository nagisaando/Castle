import { onMounted, onUnmounted, type Ref } from "vue";

export interface KeyboardControls {
  setupKeyboardControls: () => void;
}

export function useKeyboard(
  gameStart: Ref<boolean>,
  gameOver: Ref<boolean>,
  jump: Ref<boolean>,
  handleLeftMovement: () => void,
  handleRightMovement: () => void,
  handleJump: () => void
): KeyboardControls {
  
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.target !== document.body) return;

    const { code } = e;

    // Only prevent default for keys we actually handle
    const handledKeys = ["ArrowLeft", "ArrowRight", "ArrowUp"];
    if (handledKeys.includes(code)) {
      e.preventDefault();
    }

    // Only handle movement if game has started
    if (!gameStart.value || gameOver.value) return;

    // Handle movement
    if (code === "ArrowLeft") handleLeftMovement();
    if (code === "ArrowRight") handleRightMovement();
    if (code === "ArrowUp" && !jump.value) handleJump();
  };

  const setupKeyboardControls = () => {
    window.addEventListener("keydown", handleKeydown);
  };

  // Cleanup function for removing event listeners
  const cleanup = () => {
    window.removeEventListener("keydown", handleKeydown);
  };

  // Register cleanup when component unmounts
  onUnmounted(cleanup);

  return {
    setupKeyboardControls,
  };
}