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


let gameOver = false

/**
 * Materials
 */

const color = ['#5d2e8c', '#ccff66', '#2EC4B6']

const BoxGeometry = new THREE.BoxGeometry(1, 0.1, 1)


const boxes = ref<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>[]>(new Array(30))

let boxRecycleIndex = ref(0); // Tracks which box to replace next
let lastBoxIndex = ref(-1)

const lastBoxPosition = computed(() => {
  if (!boxes.value[lastBoxIndex.value]) {
    return 0
  }
  return boxes.value[lastBoxIndex.value].position.z
})

function createBox() {
  const BoxGeometry = new THREE.BoxGeometry(2.1, 0.1, 2.1)
  const BoxMaterial = new THREE.MeshBasicMaterial()

  let box: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap> | undefined


  box = new THREE.Mesh(BoxGeometry, BoxMaterial)
  box.material.color.set(color[lastBoxIndex.value === -1 ? 0 : lastBoxIndex.value % 3])
  scene.add(box)

  const spacing = lastBoxIndex.value === -1 ? -3 : 2.1

  box!.position.z = lastBoxPosition.value - spacing

  boxes.value[boxRecycleIndex.value] = box
  lastBoxIndex.value = boxRecycleIndex.value

  boxRecycleIndex.value = (boxRecycleIndex.value + 1) % boxes.value.length;

}


for (let i = 0; i < 30; i++) {
  createBox()
}


// obstacles
const walls = ref<{
  wall1: {
    obj: THREE.Mesh,
    open: boolean,
    boundingBox: THREE.Box3,
    opened: boolean,
  }
  wall2: {
    obj: THREE.Mesh,
    open: boolean,
    boundingBox: THREE.Box3,
    opened: boolean
  },
  wall3: {
    obj: THREE.Mesh,
    open: boolean,
    boundingBox: THREE.Box3,
    opened: boolean
  },
  hide: boolean

}[]>(new Array(6))

let wallRecycleIndex = ref(0); // Tracks which wall to replace next
let lastWallIndex = ref(-1)

const lastWallPosition = computed(() => {
  if (!walls.value[lastWallIndex.value]) {
    return 0
  }
  return walls.value[lastWallIndex.value].wall1.obj.position.z
})


const wallGeometry = new THREE.BoxGeometry(0.7, 1.5, 0.1)

function createWall() {
  const wallMaterial1 = new THREE.MeshBasicMaterial({
    color: '#CF5C36',
    transparent: true
  })
  const wallMaterial2 = new THREE.MeshBasicMaterial({
    color: '#EEE5E9',
    transparent: true
  })
  const wallMaterial3 = new THREE.MeshBasicMaterial({
    color: '#EFC88B',
    transparent: true
  })

  let wall1: THREE.Mesh
  let wall2: THREE.Mesh
  let wall3: THREE.Mesh

  wall1 = new THREE.Mesh(wallGeometry, wallMaterial1)
  wall1.position.y = 0.75

  wall2 = new THREE.Mesh(wallGeometry, wallMaterial2)
  wall2.position.y = 0.75

  wall3 = new THREE.Mesh(wallGeometry, wallMaterial3)
  wall3.position.y = 0.75

  const spacing = lastWallIndex.value === -1 ? 2 : 8 // lastWallIndex.value = -1 means no wall is assigned
  const zPosition = lastWallPosition.value - spacing


  wall1!.position.z = zPosition
  wall1!.position.x = -0.7

  wall2!.position.z = zPosition - 0.1

  wall3!.position.z = zPosition
  wall3!.position.x = 0.7


  scene.add(wall1)
  scene.add(wall2)
  scene.add(wall3)

  const wallGroup = {
    wall1: {
      obj: wall1,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false

    },
    wall2: {
      obj: wall2,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false
    },
    wall3: {
      obj: wall3,
      open: false,
      boundingBox: new THREE.Box3(),
      opened: false
    },
    hide: false
  }

  const wallsToOpen = ['wall1', 'wall2', 'wall3'] as const
  const randomWall = wallsToOpen[Math.floor(Math.random() * 3)]
  wallGroup[randomWall].open = true

  walls.value[wallRecycleIndex.value] = wallGroup;
  lastWallIndex.value = wallRecycleIndex.value

  wallRecycleIndex.value = (wallRecycleIndex.value + 1) % walls.value.length;


}
for (let i = 0; i < 6; i++) {
  createWall()
}


// mouse

const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial())
mouse.position.y = 0.3
mouse.position.z = 3

const mouseBoundSphere = new THREE.Sphere(mouse.position, 0.25)
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
        switch (code) {
          case arrowLeft:

            if (mouse.position.x === 0) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "-0.65"
              });
              gsap.to(Controls.target, {
                duration: 0.2,
                ease: "power2.out",
                x: "-0.65",
                onUpdate: () => { Controls.update() }
              });
              gsap.to(camera.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "-0.65",
                onUpdate: () => { Controls.update() }
              });
            }
            if (mouse.position.x === 0.65) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0"
              });
              gsap.to(Controls.target, {
                duration: 0.2,
                ease: "power2.out",
                x: "0",
                onUpdate: () => { Controls.update() }
              });
              gsap.to(camera.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0",
                onUpdate: () => { Controls.update() }
              });

            }

            break;
          case arrowRight:
            if (mouse.position.x === 0) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0.65"
              });
              gsap.to(Controls.target, {
                duration: 0.2,
                ease: "power2.out",
                x: "0.65",
                onUpdate: () => { Controls.update() }
              });
              gsap.to(camera.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0.65",
                onUpdate: () => { Controls.update() }
              });
            }
            if (mouse.position.x === -0.65) {
              gsap.to(mouse.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0"
              });
              gsap.to(Controls.target, {
                duration: 0.2,
                ease: "power2.out",
                x: "0",
                onUpdate: () => { Controls.update() }
              });
              gsap.to(camera.position, {
                duration: 0.2,
                ease: "power2.out",
                x: "0",
                onUpdate: () => { Controls.update() }
              })
            }
            break;
          case arrowUp:
            if (!jump.value) {
              jump.value = true
              gsap.to(
                mouse.position, {
                y: 0.6,
                duration: 0.25,
                ease: "power1.out",
                onComplete: () => {
                  gsap.to(mouse.position, {
                    y: 0.4, // Return to original height
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
    Controls.autoRotate = false

    // Renderer
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
    if (!gameOver) {
      // update materials
      boxes.value.forEach((box) => {
        box.position.z += 0.04

        if (box.position.z > 5) {
          box.position.z = lastBoxPosition.value - 2.1
          boxes.value[boxRecycleIndex.value] = box
          lastBoxIndex.value = boxRecycleIndex.value
          boxRecycleIndex.value = (boxRecycleIndex.value + 1) % boxes.value.length;
        }
      })


      walls.value.forEach((wall) => {
        wall.wall1.obj.position.z += 0.04
        wall.wall2.obj.position.z += 0.04
        wall.wall3.obj.position.z += 0.04

        if (Math.abs(wall.wall1.obj.position.z - mouse.position.z) < 1) {


          // Ensure transforms are current
          wall.wall1.obj.updateMatrixWorld()
          wall.wall2.obj.updateMatrixWorld()
          wall.wall3.obj.updateMatrixWorld()

          // Auto-update world bounds
          wall.wall1.boundingBox.setFromObject(wall.wall1.obj)
          wall.wall2.boundingBox.setFromObject(wall.wall2.obj)
          wall.wall3.boundingBox.setFromObject(wall.wall3.obj)

          if (mouseBoundSphere.intersectsBox(wall.wall1.boundingBox)) {
            // (wall.wall1.obj.material as THREE.MeshBasicMaterial).color.set(0xff0000);
            gameOver = true
          } else {
            // (wall.wall1.obj.material as THREE.MeshBasicMaterial).color.set(0xffffff);
          }
          if (mouseBoundSphere.intersectsBox(wall.wall2.boundingBox)) {
            (wall.wall2.obj.material as THREE.MeshBasicMaterial).color.set(0xff0000);
            gameOver = true
          } else {
            (wall.wall2.obj.material as THREE.MeshBasicMaterial).color.set(0xffffff);
          }
          if (mouseBoundSphere.intersectsBox(wall.wall3.boundingBox)) {
            (wall.wall3.obj.material as THREE.MeshBasicMaterial).color.set(0xff0000);
            gameOver = true
          } else {
            (wall.wall2.obj.material as THREE.MeshBasicMaterial).color.set(0xffffff);
          }

        }



        if (wall.wall1.obj.position.z > -1 && wall.wall1.open && !wall.wall1.opened) {
          wall.wall1.opened = true
          gsap.to(wall.wall1.obj.position, {
            x: '+=0.7',
            duration: 0.2,
            ease: "power2.out",
          })

        }

        if (wall.wall2.obj.position.z > -1 && wall.wall2.open && !wall.wall2.opened) {
          wall.wall2.opened = true
          gsap.to(wall.wall2.obj.position, {
            x: '+=0.7',
            duration: 0.2,
            ease: "power2.out",
          })

        }

        if (wall.wall3.obj.position.z > -1 && wall.wall3.open && !wall.wall3.opened) {
          wall.wall3.opened = true
          gsap.to(wall.wall3.obj.position, {
            x: '-=0.7',
            duration: 0.2,
            ease: "power2.out",
          })

        }




        if (!wall.hide && wall.wall2.obj.position.z > 2.5) {
          wall.hide = true
          gsap.to(wall.wall1.obj.material, {
            opacity: '0',
            duration: 2,
            ease: "slow(0.9,0.4,false)",
            yoyo: true,

          })
          gsap.set(wall.wall1.obj.material, {
            opacity: '1',
            delay: 2

          })
          gsap.to(wall.wall2.obj.material, {
            opacity: '0',
            duration: 2,
            ease: "slow(0.9,0.4,false)",
            yoyo: true
          })

          gsap.set(wall.wall2.obj.material, {
            opacity: '1',
            delay: 2

          })

          gsap.to(wall.wall3.obj.material, {
            opacity: '0',
            duration: 2,
            ease: "slow(0.9,0.4,false)",
            yoyo: true
          })

          gsap.set(wall.wall3.obj.material, {
            opacity: '1',
            delay: 2

          })

        }


        if (wall.wall1.obj.position.z > 5) {
          wall.wall1.obj.position.z = lastWallPosition.value - 8
          wall.wall1.obj.position.x = -0.7


          wall.wall2.obj.position.z = lastWallPosition.value - 8.1
          wall.wall2.obj.position.x = 0



          wall.wall3.obj.position.z = lastWallPosition.value - 8
          wall.wall3.obj.position.x = 0.7





          const wallGroup = {
            wall1: {
              obj: wall.wall1.obj,
              open: false,
              opened: false,
              boundingBox: wall.wall1.boundingBox
            },
            wall2: {
              obj: wall.wall2.obj,
              open: false,
              opened: false,
              boundingBox: wall.wall2.boundingBox
            },
            wall3: {
              obj: wall.wall3.obj,
              open: false,
              opened: false,
              boundingBox: wall.wall3.boundingBox
            },
            hide: false
          }
          const wallsToOpen = ['wall1', 'wall2', 'wall3'] as const
          const randomWall = wallsToOpen[Math.floor(Math.random() * 3)]
          wallGroup[randomWall].open = true



          // Circular buffer replacement
          walls.value[wallRecycleIndex.value] = wallGroup;
          lastWallIndex.value = wallRecycleIndex.value
          wallRecycleIndex.value = (wallRecycleIndex.value + 1) % walls.value.length;


        }


      })
      // spawner()

      // update boundbox
      mouseBoundSphere.copy(mouse.geometry.boundingSphere!).applyMatrix4(mouse.matrixWorld)

    }
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
