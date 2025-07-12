<script setup lang="ts">
import { ref } from 'vue'
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

defineProps<Props>()
defineEmits<Emits>()

const addScore = ref(false)
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
        class="md:text-3xl border-2 border-white bg-transparent text-white text-2xl">Game Start</button>
      <div class="text-xl text-left mt-8 text-white">
        <p class="py-4"><span class="border border-white px-8 py-4 mr-4">&lt;</span>: move left</p>
        <p class="py-4"><span class="border border-white px-8 py-4 mr-4">&gt;</span>: move right</p>
        <p class="py-4"><span class="border border-white px-8 py-4 mr-4">&#x22C0;</span>: jump</p>
      </div>
    </div>

    <div class="absolute top-4 right-8 text-white text-right">
      <p v-if="!gameOver" class="md:text-3xl text-2xl">Distance: {{ Math.floor(distance) }}</p>
      <div v-if="gameStart && false" class="text-left hidden md:block">
        <p class="py-1"><span class="border border-white px-2 py-1 mr-2">&lt;</span>: move left</p>
        <p class="py-1"><span class="border border-white px-2 py-1 mr-2">&gt;</span>: move right</p>
        <p class="py-1"><span class="border border-white px-2 py-1 mr-2">&#x22C0;</span>: jump</p>
      </div>
    </div>

    <p class="absolute bottom-4 right-8 text-white">Sound by <a href="https://www.zapsplat.com/"
        target="_blank">ZapSplat</a></p>

    <div v-if="showGameOverMessage"
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
      <div class="bg-stone-300 py-12 px-20 w-4/5 mx-auto rounded-2xl">
        <p class="text-3xl mb-2 text-stone-800 font-medium md:text-2xl">Score: {{ Math.floor(distance) }}</p>
        <p class="text-3xl mb-2 text-stone-800 font-medium md:text-2xl">Top 10 Paw Dodgers</p>
        <ul class="list-none text-left text-xl text-stone-800">
          <li v-for="(item, i) in leaderBoard" :key="i" class="flex my-4 border-b border-stone-800">
            <span class="mr-2 font-medium">{{ i + 1 }} </span>
            <span class="name">{{ item.username }}</span>
            <span class="ml-auto font-extrabold">{{ item.score }}</span>
          </li>
        </ul>
      </div>
      <div class="flex justify-center mt-8 text-2xl">
        <button v-if="addScore" class="bg-stone-800 border-transparent w-[362px] text-2xl mr-4">Leave your
          legacy</button>
        <button @click="$emit('restartGame')"
          :class="{ 'bg-stone-800 border-transparent w-[362px] text-2xl': addScore }"
          class="bg-stone-800 border-transparent w-[362px] text-2xl">try again</button>
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