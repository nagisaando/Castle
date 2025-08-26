<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import type { LeaderboardEntry } from '../api'
import gsap from 'gsap'

interface Props {
  show: boolean
  distance: number
  bestScore: boolean
  leaderBoard: LeaderboardEntry[]
}

interface Emits {
  restartGame: []
  submitScore: [username: string, score: number],
  updateLeaderboard: [LeaderboardEntry[]]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const leaderBoardListEl = useTemplateRef('leaderBoardListEL')

// hide username if user has the data in localstorage already
const username = ref()

const showForm = ref(false)
const submitted = ref(false)

function handleSubmit() {
  if (!username.value?.trim()) {
    return
  }

  const distance = Math.min(props.distance, 1000)

  localStorage.setItem('username', username.value)
  emit('submitScore', username.value, distance)

  // Find insertion position
  const insertPosition = props.leaderBoard.findIndex((item, i) => {
    return distance > item.score
  })
  const finalPosition = insertPosition === -1 ?
    props.leaderBoard.length : insertPosition



  const tl = gsap.timeline()
  // Animate out the item being replaced (if leaderboard is full)
  const item = leaderBoardListEl.value!.children[finalPosition]

  function updateLeaderboard() {
    // Create new entry
    const newEntry = {
      username: username.value,
      score: distance,
      created_at: new Date().toISOString()
    }

    // Update leaderboard data
    const updatedLeaderboard = [...props.leaderBoard]
    updatedLeaderboard.splice(finalPosition, 0, newEntry)
    // Emit the updated leaderboard to parent
    emit('updateLeaderboard', updatedLeaderboard.slice(0, 10))
  }



  if (props.leaderBoard[finalPosition] && item) {
    tl.fromTo(item, { opacity: 1 }, { opacity: 0, duration: 0.5 })
    tl.call(updateLeaderboard)

  } else {
    updateLeaderboard()
    tl.set(item, { opacity: 0 })
  }



  tl.to(item, { opacity: 1, x: 0, scale: 1.05, duration: 0.5 })
  tl.to(item, { scale: 1, duration: 0.4 })

  showForm.value = false
  submitted.value = true
}

function handleShowForm() {
  const name = localStorage.getItem('username')
  if (!name || !name.trim()) {
    showForm.value = true
  } else {
    username.value = name
    handleSubmit()
  }
}

function restartGame() {
  showForm.value = false
  submitted.value = false
  emit('restartGame')
}
</script>

<template>
  <div v-if="show" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
    <div class="bg-[#f1e8e0] py-4 px-8 md:py-8 md:px-15 w-4/5 mx-auto rounded-2xl">
      <div>
        <p v-if="bestScore" class="text-amber-500 text-2xl md:text-4xl font-bold">NEW HIGH SCORE</p>
        <p class="text-xl md:text-3xl mb-2 text-stone-800 font-bold">Your score: {{ distance }}
        </p>
        <p class="mb-2 text-sm text-stone-800 font-medium">Top 10 Paw Dodgers</p>
        <ul ref="leaderBoardListEL"
          class="list-none text-left text-stone-800 text-sm grid gap-x-3 grid-cols-2 grid-rows-5 grid-flow-dense">
          <li v-for="(i) in 10" :key="i" :class="i <= 5 ? `col-start-1` : `col-start-2`"
            class=" flex my-4 border-b border-stone-800">
            <span class="mr-2 font-medium">{{ i }} </span>
            <span class="name">{{ leaderBoard[i - 1]?.username }}</span>
            <span class="ml-auto font-extrabold">{{ leaderBoard[i - 1]?.score }}</span>
          </li>
        </ul>
      </div>
      <div v-if="showForm">
        <label for="name" class="text-stone-800 text-2xl block mt-5">YOUR NAME</label>
        <input v-model="username" type="text" id="name" name="name" maxlength="10"
          class="border-b border-b-stone-800 text-stone-800 text-2xl focus:outline-0">
      </div>

      <div v-if="!showForm" class="flex justify-center mt-8 text-2xl">
        <button v-if="bestScore && !submitted" @click="handleShowForm"
          class="bg-amber-500 border-transparent font-medium w-[362px] mr-4 hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-sm md:text-base">Leave
          your legacy
        </button>
        <button @click="restartGame"
          class=" bg-stone-800 border-transparent font-medium w-[362px] hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-sm md:text-base">try
          again</button>
      </div>
      <div v-else="showForm" class="flex justify-center mt-8 text-2xl">
        <button v-if="bestScore" @click="handleSubmit"
          class="bg-amber-500 border-transparent font-medium w-[362px] mr-4 hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-sm md:text-base">
          Submit</button>
        <button @click="showForm = false"
          class=" bg-stone-800 border-transparent font-medium w-[362px] hover:-translate-y-0.5 cursor-pointer rounded px-6 py-2 text-sm md:text-base">
          Cancel</button>
      </div>
    </div>

  </div>
</template>