<script setup lang="ts">
interface Props {
  assetsLoaded: boolean
  totalProgress: number
  showButton: boolean
  gameStart: boolean
  gameOver: boolean
  distance: number
  showGameOverMessage: boolean
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

// CSS variables for v-bind
const textColor = 'white'
const fontSizeL = '2rem'
const fontSizeM = '1.5rem'
const fontSizeS = '1rem'
const spacingM = '1rem'
const spacingL = '2rem'
</script>

<template>
  <div class="layer">
    <div v-if="!assetsLoaded" class="loading-overlay">
      <p>Loading... {{ totalProgress }}%</p>
    </div>

    <div v-if="assetsLoaded && showButton" class="game-start">
      <button @click="$emit('startGame')">Game Start</button>
      <div class="key-info">
        <p><span class="key">&lt;</span>: move left</p>
        <p><span class="key">&gt;</span>: move right</p>
        <p><span class="key">&#x22C0;</span>: jump</p>
      </div>
    </div>

    <div class="info">
      <p class="distance">Distance: {{ Math.floor(distance) }}</p>
      <div v-if="gameStart" class="key-info">
        <p><span class="key">&lt;</span>: move left</p>
        <p><span class="key">&gt;</span>: move right</p>
        <p><span class="key">&#x22C0;</span>: jump</p>
      </div>
    </div>

    <p class="credit">Sound by <a href="https://www.zapsplat.com/" target="_blank">ZapSplat</a></p>

    <div v-if="showGameOverMessage" class="game-over">
      <p>Game over...</p>
      <button @click="$emit('restartGame')">try again</button>
    </div>

    <!-- this is ui for mobile -->
    <div class="mobile-handle-buttons" v-if="gameStart && !gameOver">
      <button @click="$emit('handleLeftMovement')">&#9664;</button>
      <button @click="$emit('handleJump')">🔼</button>
      <button @click="$emit('handleRightMovement')"> &#9654;</button>
    </div>
  </div>
</template>

<style scoped>
/* Variables now use v-bind */

/* UI Elements */
.layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

button {
  font-size: v-bind(fontSizeL);
  border: 2px solid v-bind(textColor);
  background-color: transparent;
  color: v-bind(textColor);
}

.key {
  border: 1px solid v-bind(textColor);
  padding: v-bind(spacingM) v-bind(spacingL);
  margin-right: v-bind(spacingM);
}

/* Layout & Containers */
.credit {
  position: absolute;
  right: v-bind(spacingL);
  bottom: v-bind(spacingM);
  color: v-bind(textColor);
}

.info {
  position: absolute;
  right: v-bind(spacingL);
  top: v-bind(spacingM);
  color: v-bind(textColor);
  text-align: right;
}

.info .distance {
  font-size: v-bind(fontSizeL);
}

.info .key-info {
  text-align: left;
  color: v-bind(textColor);
}

.info .key-info p {
  padding: 0.2rem 0;
}

.info .key-info .key {
  padding: 0.2rem 0.4rem;
  margin-right: 0.6rem;
}

/* Overlays */
.loading-overlay,
.game-start,
.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.loading-overlay {
  color: v-bind(textColor);
  font-size: v-bind(fontSizeL);
}

.game-start .key-info {
  font-size: 1.3rem;
  text-align: left;
  margin-top: v-bind(spacingL);
  color: v-bind(textColor);
}

.game-start .key-info p {
  padding: v-bind(spacingM) 0;
}

.game-over p {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: black;
  font-weight: 500;
}

.game-over button {
  text-wrap: nowrap;
}

/* Mobile Specific */
.mobile-handle-buttons {
  display: none;
  /* Hidden by default */
}

@media only screen and (max-width: 500px) {
  button {
    font-size: v-bind(fontSizeM);
  }

  .game-over p {
    font-size: v-bind(fontSizeM);
  }

  .info .distance {
    font-size: v-bind(fontSizeM);
  }

  .key-info {
    display: none;
  }

  .mobile-handle-buttons {
    display: block;
    position: absolute;
    bottom: 10%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .mobile-handle-buttons button {
    padding: 1rem;
  }
}
</style>