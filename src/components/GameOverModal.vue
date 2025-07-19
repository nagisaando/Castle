<script setup lang="ts">
import type { LeaderboardEntry } from '../api'

interface Props {
  show: boolean
  distance: number
  bestScore: boolean
  leaderBoard: LeaderboardEntry[]
}

interface Emits {
  restartGame: []
  submitScore: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <div v-if="show" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
    <div class="bg-[#f1e8e0] py-8 px-15 w-4/5 mx-auto rounded-2xl">
      <p v-if="bestScore" class="text-amber-500 text-4xl font-bold">NEW HIGH SCORE</p>
      <p class="text-3xl mb-2 text-stone-800 font-bold">Your score: {{ Math.floor(distance) }}
      </p>
      <p class="mb-2 text-sm text-stone-800 font-medium">Top 10 Paw Dodgers</p>
      <ul class="list-none text-left text-stone-800 text-sm grid gap-x-3 grid-cols-2 grid-rows-5 grid-flow-dense">
        <li v-for="(i) in 10" :key="i" :class="i <= 5 ? `col-start-1` : `col-start-2`"
          class=" flex my-4 border-b border-stone-800">
          <span class="mr-2 font-medium">{{ i }} </span>
          <span class="name">{{ leaderBoard[i - 1]?.username }}</span>
          <span class="ml-auto font-extrabold">{{ leaderBoard[i - 1]?.score }}</span>
        </li>
      </ul>
    </div>
    <div class="flex justify-center mt-8 text-2xl">
      <button v-if="bestScore" @click="$emit('submitScore')"
        class="bg-amber-500 border-transparent font-medium w-[362px] mr-4 hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-base ">Leave
        your
        legacy</button>
      <button @click="$emit('restartGame')"
        class=" bg-stone-800 border-transparent font-medium w-[362px] hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-base">try
        again</button>
    </div>
  </div>
</template>