<script setup lang="ts">
import * as THREE from "three"
import GUI from 'lil-gui';
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from "three/examples/jsm/libs/stats.module.js";
import gsap from "gsap";
/**
 * Base
 */
// Debug
const gui = new GUI();
const stats = new Stats()
document.body.appendChild(stats.dom)

// Canvas
const canvas = useTemplateRef('canvas')

// Scene
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()




/**
 * Materials
 */
const closestDistance = -50;
const farDistance = 50
const unusedBoxes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>[] = []
const color = ['#5d2e8c', '#ccff66', '#2EC4B6']

const BoxGeometry = new THREE.BoxGeometry(1, 0.1, 1)


const boxes = ref<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>[]>([])


const lastBoxPosition = computed(() => {
  if (boxes.value.length === 0) {
    return 0
  }
  return boxes.value[boxes.value.length - 1].position.z
})

function createBox() {
  const BoxGeometry = new THREE.BoxGeometry(1, 0.1, 1)
  const BoxMaterial = new THREE.MeshBasicMaterial()

  let box: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap> | undefined
  if (unusedBoxes.length > 0) {
    box = unusedBoxes.pop()
  }
  else {
    box = new THREE.Mesh(BoxGeometry, BoxMaterial)
    box.material.color.set(color[Math.min(Math.round(Math.random() * color.length), 2)])
    scene.add(box)
  }

  box!.position.z = lastBoxPosition.value - (boxes.value.length ? 1 : -3)
  boxes.value.push(box!)

}

function spawner() {
  const closest = lastBoxPosition.value
  if (closest > closestDistance) {
    createBox()
  }
}

for (let i = 0; i < 30; i++) {
  createBox()
}



// mouse

const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial())
mouse.position.y = 0.2
mouse.position.z = 3

scene.add(mouse)
onMounted(() => {


  /**
   * Sizes
   */

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  }

  /**
  * Camera
  */


  // Base camera

  const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
  camera.position.z = 7
  camera.position.y = 1
  scene.add(camera)

  // Controls
  const Controls = new OrbitControls(camera, canvas.value)
  Controls.enableDamping = true


  /**
   * Renderer
   */
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value as HTMLCanvasElement,
    antialias: true
  })

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(sizes.pixelRatio)


  window.addEventListener('resize', () => {
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
  })



  // keyboard event 
  const jump = ref(false)
  window.addEventListener('keydown', (e) => {
    if (e.target === document.body) {
      const code = e.code

      const arrowRight = 'ArrowRight'
      const arrowLeft = 'ArrowLeft'
      const arrowUp = 'ArrowUp'
      const arrowDown = 'ArrowDown'

      if ([arrowRight, arrowLeft, arrowUp, arrowDown].includes(code)) {
        e.preventDefault()
        const step = 0.3
        switch (code) {
          case arrowLeft:

            if (mouse.position.x === 0) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "-0.3"
              });
            }
            if (mouse.position.x === 0.3) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0"
              });
            }

            break;
          case arrowRight:
            if (mouse.position.x === 0) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0.3"
              });
            }
            if (mouse.position.x === -0.3) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0"
              });
            }
            break;
          case arrowUp:
            if (!jump.value) {
              jump.value = true
              gsap.to(
                mouse.position, {
                y: 0.4,
                duration: 0.25,
                ease: "power1.out",
                onComplete: () => {
                  gsap.to(mouse.position, {
                    y: 0.2, // Return to original height
                    duration: 0.25,
                    ease: "bounce.out",
                    onComplete: () => {
                      jump.value = false
                    }
                  });
                }
              }
              )

            }
            console.log('up')
            break;
          case arrowDown:
            console.log('down')
            break;

        }
      }
    }
  })

  const clock = new THREE.Clock()
  const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    Controls.update()

    // Renderer
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)

    // update materials
    boxes.value.forEach((box) => {
      box.position.z += 0.01

      if (box.position.z > 5) {
        box.position.z = lastBoxPosition.value - 1
        // unusedBoxes.push(box)
        boxes.value.push(box)
        boxes.value.shift()
      }
    })
    // spawner()

    // debug
    stats.update()

  }

  tick()
})





</script>

<template>
  <canvas class="webgl" ref="canvas"></canvas>
</template>

<style>
* {
  margin: 0;
  padding: 0;
}

html,
body {
  overflow: hidden;
}

.webgl {
  position: fixed;
  top: 0;
  left: 0;
  outline: none;
}
</style>
