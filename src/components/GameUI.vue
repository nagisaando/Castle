<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import type { LeaderboardEntry } from '../api'
import GameOverModal from './GameOverModal.vue'
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
  submitScore: [username: string, score: number],
  updateLeaderboard: [LeaderboardEntry[]]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const bestScore = computed(() => {
  // If leaderboard is empty or has less than 10 scores, it's always a high score
  if (!props.leaderBoard.length || props.leaderBoard.length < 10) {
    return true
  }

  // Check if current score is higher than the lowest score in top 10
  const lowestScore = props.leaderBoard[props.leaderBoard.length -
    1]?.score || 0
  return props.distance > lowestScore
})

const distanceText = useTemplateRef('distanceText')

watch(() => props.distance, (newDistance, oldDistance) => {
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
          color: 'white',
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

    <p v-if="!gameOver && gameStart" ref="distanceText" class="text-6xl text-center mt-26 font-bold text-white">{{
      distance
    }}</p>

    <p class="absolute bottom-4 right-8 text-white">Sound by <a href="https://www.zapsplat.com/" target="_blank"
        class="hover:text-amber-500">ZapSplat</a></p>

    <GameOverModal :show="showGameOverMessage" :distance="distance" :best-score="bestScore" :leader-board="leaderBoard"
      @restart-game="emit('restartGame')" @submit-score="(username, score) => emit('submitScore', username, score)"
      @updateLeaderboard="(leaderboard) => emit('updateLeaderboard', leaderboard)" />

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