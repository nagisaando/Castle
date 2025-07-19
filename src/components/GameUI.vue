<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import type { LeaderboardEntry } from '../api'
interface Props {
  assetsLoaded: boolean
  totalProgress: number
  showButton: boolean
  gameStart: boolean
  gameOver: boolean
  distance: number
  showGameOverMessage: boolean,
  leaderBoard: LeaderboardEntry[]
}

interface Emits {
  startGame: []
  restartGame: []
  handleLeftMovement: []
  handleRightMovement: []
  handleJump: []
}

const props = defineProps<Props>()
defineEmits<Emits>()

const addScore = ref(false)
const distanceText = useTemplateRef('distanceText')
watch(() => Math.floor(props.distance), (newDistance, oldDistance) => {
  if (newDistance % 10 === 0 && newDistance !== 0 && newDistance !== oldDistance) {
    gsap.to(distanceText.value, {
      color: '#fd9a00',
      duration: 0.4,
      ease: "elastic.out(0.8,0.3)",
      scale: 1.5,
      y: -10,
      rotate: 2,
      onComplete: () => {
        gsap.to(distanceText.value, {
          duration: 0.2,
          ease: "elastic.out(0.8,0.3)",
          y: 0,
          scale: 1,
          color: 'rgba(255, 255, 255, 0.87)',
          rotate: 0
        }
        )
      }
    })
  }
})
</script>

<template>
  <div class="absolute inset-0">
    <div v-if="!assetsLoaded"
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center text-white text-3xl md:text-3xl">
      <p>Loading... {{ totalProgress }}%</p>
    </div>

    <div v-if="assetsLoaded && showButton"
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
      <button @click="$emit('startGame')"
        class="md:text-2xl border-2 border-white bg-transparent text-white hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2">Game
        Start</button>
      <div class="flex justify-center">
        <div class="text-sm text-left mt-8 text-white">
          <p class="py-2"><span class="border border-white px-4 py-2 mr-4">&lt;</span> move left</p>
          <p class="py-2 mt-0.5"><span class="border border-white px-4 py-2 mr-4">&gt;</span> move right</p>
          <p class="py-2 mt-0.5"><span class="border border-white px-4 py-2 mr-4">&#x22C0;</span> jump</p>
        </div>
      </div>
    </div>

    <p v-if="!gameOver && gameStart" ref="distanceText" class="text-6xl text-center mt-26 font-bold">{{
      Math.floor(distance)
      }}</p>

    <p class="absolute bottom-4 right-8 text-white">Sound by <a href="https://www.zapsplat.com/" target="_blank"
        class="hover:text-amber-500">ZapSplat</a></p>

    <div v-if="showGameOverMessage"
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
      <div class="bg-[#f1e8e0] py-8 px-15 w-4/5 mx-auto rounded-2xl">
        <p v-if="addScore" class="text-amber-500 text-4xl font-bold">NEW HIGH SCORE</p>
        <p class="text-3xl mb-2 text-stone-800 font-bold">Your score: {{ Math.floor(distance) }}
        </p>
        <p class="mb-2 text-sm text-stone-800 font-medium">Top 10 Paw Dodgers</p>
        <ul class="list-none text-left text-stone-800 text-sm grid gap-x-3 grid-cols-2 grid-rows-5 grid-flow-dense">
          <li v-for="(i) in 10" :key="i" :class="i <= 5 ? `col-start-1` : `col-start-2`"
            class=" flex my-4 border-b border-stone-800">
            <span class="mr-2 font-medium">{{ i }} </span>
            <span class="name">{{ leaderBoard[i]?.username }}</span>
            <span class="ml-auto font-extrabold">{{ leaderBoard[i]?.score }}</span>
          </li>
        </ul>
      </div>
      <div class="flex justify-center mt-8 text-2xl">
        <button v-if="addScore"
          class="bg-amber-500 border-transparent font-medium w-[362px] mr-4 hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-base ">Leave
          your
          legacy</button>
        <button @click="$emit('restartGame')"
          class=" bg-stone-800 border-transparent font-medium w-[362px] hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-base">try
          again</button>
      </div>
    </div>

    <!-- this is ui for mobile -->
    <div class="md:hidden absolute bottom-[10%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 block"
      v-if="gameStart && !gameOver">
      <button @click="$emit('handleLeftMovement')"
        class="p-4 text-2xl border-2 border-white bg-transparent text-white">&#9664;</button>
      <button @click="$emit('handleJump')"
        class="p-4 text-2xl border-2 border-white bg-transparent text-white">🔼</button>
      <button @click="$emit('handleRightMovement')"
        class="p-4 text-2xl border-2 border-white bg-transparent text-white"> &#9654;</button>
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";
</style>