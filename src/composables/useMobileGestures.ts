import { onMounted, onUnmounted, type Ref } from "vue";
import type GameUI from "../components/GameUI.vue";

export interface MobileGestureControls {
  setupMobileGestures: () => void;
}

export function useMobileGestures(
  uiLayer: Ref<InstanceType<typeof GameUI> | null>,
  handleJump: () => void,
  handleLeftMovement: () => void,
  handleRightMovement: () => void,
  gameStart: Ref<boolean>,
  gameOver: Ref<boolean>,
  jump: Ref<boolean>
): MobileGestureControls {
  
  // Handler variables for cleanup
  let touchStartHandler: (e: TouchEvent) => void;
  let touchEndHandler: (e: TouchEvent) => void;
  
  const setupMobileGestures = () => {
    //Swipe
    let touchstartX = 0;
    let touchendX = 0;
    let touchstartY = 0;
    let touchendY = 0;

    function checkDirection() {
      const swipeDistanceX = Math.abs(touchendX - touchstartX);
      const swipeDistanceY = Math.abs(touchendY - touchstartY);
      const minSwipeDistance = 30; // Minimum distance for a swipe

      // Determine if it's primarily a vertical or horizontal swipe
      if (swipeDistanceY > swipeDistanceX && swipeDistanceY > minSwipeDistance) {
        // Vertical swipe + it is swipe up
        if (touchstartY > touchendY && !jump.value) {
          // Swipe up (start Y > end Y)
          handleJump();
        }
      } else if (swipeDistanceX > minSwipeDistance) {
        // Horizontal swipe
        if (touchendX < touchstartX) handleLeftMovement();
        if (touchendX > touchstartX) handleRightMovement();
      }
    }

    if (uiLayer.value !== null) {
      touchStartHandler = (e: TouchEvent) => {
        touchstartX = e.changedTouches[0].screenX;
        touchstartY = e.changedTouches[0].screenY;
      };

      touchEndHandler = (e: TouchEvent) => {
        touchendX = e.changedTouches[0].screenX;
        touchendY = e.changedTouches[0].screenY;

        if (!gameStart.value || gameOver.value) {
          return;
        }

        checkDirection();
      };

      uiLayer.value.$el.addEventListener("touchstart", touchStartHandler, { passive: true });
      uiLayer.value.$el.addEventListener("touchend", touchEndHandler);
    }

  };

  // Cleanup function for removing event listeners
  const cleanup = () => {
    if (uiLayer.value !== null && touchStartHandler && touchEndHandler) {
      uiLayer.value.$el.removeEventListener("touchstart", touchStartHandler);
      uiLayer.value.$el.removeEventListener("touchend", touchEndHandler);
    }
  };

  // Register cleanup when component unmounts
  onUnmounted(cleanup);

  return {
    setupMobileGestures,
  };
}
