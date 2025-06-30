import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { POSITIONS } from "../constants";
import gsap from "gsap";
import type { Ref } from "vue";

export interface KeyboardControls {
  setupKeyboardControls: () => void;
  handleLeftMovement: () => void;
  handleRightMovement: () => void;
  handleJump: () => void;
}

export interface MouseAnimationParams {
  mouseModel: THREE.Group;
  mouseRightBackFoot: THREE.Object3D;
  mouseLeftBackFoot: THREE.Object3D;
  mouseBody: THREE.Object3D;
  mouseTail: THREE.Object3D;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

export function useKeyboardControls(
  gameStart: Ref<boolean>,
  gameOver: Ref<boolean>,
  jump: Ref<boolean>,
  speedMultiplier: { value: number },
  playMoveSound: (speedMultiplier: number) => void,
  playJumpSound: (speedMultiplier: number) => void
): KeyboardControls & { initializeControls: (animationParams: MouseAnimationParams) => void } {
  let mouseModel: THREE.Group;
  let mouseRightBackFoot: THREE.Object3D;
  let mouseLeftBackFoot: THREE.Object3D;
  let mouseBody: THREE.Object3D;
  let mouseTail: THREE.Object3D;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;

  const initializeControls = (animationParams: MouseAnimationParams) => {
    mouseModel = animationParams.mouseModel;
    mouseRightBackFoot = animationParams.mouseRightBackFoot;
    mouseLeftBackFoot = animationParams.mouseLeftBackFoot;
    mouseBody = animationParams.mouseBody;
    mouseTail = animationParams.mouseTail;
    camera = animationParams.camera;
    controls = animationParams.controls;
  };

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

  const handleLeftMovement = () => {
    if (!mouseModel) return;
    if (mouseModel.position.x === 0) mouseMove(-POSITIONS.MOUSE_X);
    if (mouseModel.position.x === POSITIONS.MOUSE_X) mouseMove(0);
  };

  const handleRightMovement = () => {
    if (!mouseModel) return;
    if (mouseModel.position.x === 0) mouseMove(POSITIONS.MOUSE_X);
    if (mouseModel.position.x === -POSITIONS.MOUSE_X) mouseMove(0);
  };

  const handleJump = () => {
    if (!mouseModel || !mouseRightBackFoot || !mouseLeftBackFoot || !mouseBody || !mouseTail) return;
    jump.value = true;
    const jumpSpeedFactor = 1 / speedMultiplier.value;

    const currentRightFootY = mouseRightBackFoot.position.y;
    const currentLeftFootRotationX = mouseLeftBackFoot.rotation.x;
    const currentRightFootRotationX = mouseRightBackFoot.rotation.x;
    const currentBodyRotationX = mouseBody.rotation.x;
    const currentTailRotationY = mouseTail.rotation.y;
    const currentTailPositionY = mouseTail.position.y;

    playJumpSound(speedMultiplier.value);

    const mouseModelPartSpeed = 0.2 * jumpSpeedFactor || 0.03;

    gsap.to(mouseModel.position, {
      y: 0.23,
      duration: 0.5 * jumpSpeedFactor || 0.1,
      ease: "power1.out",
      onComplete: () => {
        gsap.to(mouseModel.position, {
          y: 0, // Return to original height
          duration: 0.25 * jumpSpeedFactor || 0.05,
          ease: "bounce.out",
          onComplete: () => {
            jump.value = false;
          },
        });

        gsap.to(mouseLeftBackFoot.rotation, {
          x: currentLeftFootRotationX,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        });
        gsap.to(mouseRightBackFoot.rotation, {
          x: currentRightFootRotationX,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        });
        gsap.to(mouseRightBackFoot.position, {
          y: currentRightFootY,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        });
        gsap.to(mouseBody.rotation, {
          x: currentBodyRotationX,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        });
        gsap.to(mouseTail.rotation, {
          y: currentTailRotationY,
          duration: mouseModelPartSpeed,
          ease: "power1.inOut",
        });
        gsap.to(mouseTail.position, {
          y: currentTailPositionY,
          duration: mouseModelPartSpeed,
          ease: "power1.out",
        });
      },
    });

    gsap.to(mouseLeftBackFoot.rotation, {
      x: `-=${Math.PI / 2}`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    });

    gsap.to(mouseRightBackFoot.rotation, {
      x: `-=${Math.PI / 2.4}`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    });

    gsap.to(mouseRightBackFoot.position, {
      y: `+=0.01`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    });

    gsap.to(mouseBody.rotation, {
      x: -0.4,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    });

    gsap.to(mouseTail.rotation, {
      y: -0.1,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    });

    gsap.to(mouseTail.position, {
      y: `+=0.1`,
      duration: mouseModelPartSpeed,
      ease: "power1.out",
    });
  };

  const mouseMove = (x: number) => {
    if (!mouseModel || !controls || !camera) return;
    const moveDuration = 0.2 / speedMultiplier.value || 0.05;
    gsap.to(mouseModel.position, {
      duration: moveDuration,
      ease: "power2.out",
      x,
      onStart: () => {
        playMoveSound(speedMultiplier.value);
      },
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
  };

  return {
    setupKeyboardControls,
    handleLeftMovement,
    handleRightMovement,
    handleJump,
    initializeControls,
  };
}
