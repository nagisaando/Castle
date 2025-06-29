import * as THREE from "three"
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { POSITIONS } from '../constants'
import type { Ref } from 'vue'

export interface ThreeSetup {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  handleResize: () => void
}

export function useThreeSetup(canvas: Ref<HTMLCanvasElement | null>): ThreeSetup {
  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color().setHex(0x112233)

  // Lights
  const ambientLight = new THREE.AmbientLight(0xbda8a8, 3)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xbda8a8, 3)
  directionalLight.position.set(1, 0, 1)
  scene.add(directionalLight)

  // Sizes
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  }

  // Camera
  const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 400)
  camera.position.z = POSITIONS.CAMERA_TO_START.z
  camera.position.y = POSITIONS.CAMERA_TO_START.y
  camera.position.x = POSITIONS.CAMERA_TO_START.x
  scene.add(camera)

  // Controls
  const controls = new OrbitControls(camera, canvas.value!)
  controls.enableDamping = true
  controls.enableZoom = false
  controls.enablePan = false
  controls.enableRotate = false

  // Mobile detection
  const isMobile = window.matchMedia("(max-width: 500px)").matches

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value as HTMLCanvasElement,
    antialias: !isMobile, // Disable antialias on mobile for performance concern
    powerPreference: "high-performance",
  });
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

  return {
    scene,
    camera,
    renderer,
    controls,
    handleResize
  }
}