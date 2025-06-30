export interface AudioPool {
  sounds: HTMLAudioElement[];
  currentIndex: number;
}

export interface AudioManager {
  // Sound pools
  moveSounds: AudioPool;
  jumpSounds: AudioPool;

  // Individual sounds
  doorSound: HTMLAudioElement;
  catSound: HTMLAudioElement;
  gameBackground: HTMLAudioElement;

  // Methods
  playMoveSound: (speedMultiplier: number) => void;
  playJumpSound: (speedMultiplier: number) => void;
  playDoorSound: () => void;
  playCatSound: () => void;
  playGameBackground: () => void;
  pauseGameBackground: () => void;
  setGameBackgroundPlaybackRate: (rate: number) => void;
}

export function useAudioManager(): AudioManager {
  const MAX_SOUND_POOL = 3;

  // Create sound pools
  const createSoundPool = (src: string, volume: number = 1): AudioPool => {
    const sounds: HTMLAudioElement[] = [];
    for (let i = 0; i < MAX_SOUND_POOL; i++) {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = volume;
      sounds.push(audio);
    }
    return {
      sounds,
      currentIndex: 0,
    };
  };

  // Initialize sound pools
  const moveSounds = createSoundPool(
    "/sound/zapsplat_cartoon_swoosh_swipe_whoosh_snatch_001_111185.mp3",
    0.2
  );
  const jumpSounds = createSoundPool("/sound/haiaa.mp3");

  // Initialize individual sounds
  const doorSound = new Audio(
    "/sound/zapsplat_foley_cupboard_closet_door_wooden_old_hinge_creak_squeak_very_short_slight_004_106659.mp3"
  );
  doorSound.volume = 0.1;

  const catSound = new Audio("/sound/Blastwave_FX_CatMeow_SFXB.203.mp3");
  catSound.volume = 0.4;
  catSound.playbackRate = 1.8;

  const gameBackground = new Audio(
    "/sound/music_zapsplat_game_music_action_retro_8_bit_repeating_016.mp3"
  );
  gameBackground.volume = 0.4;
  gameBackground.loop = true;

  // Sound pool methods
  const playFromPool = (pool: AudioPool, speedMultiplier: number = 1) => {
    const sound = pool.sounds[pool.currentIndex];
    sound.playbackRate =
      sound.playbackRate >= 2 ? 2 : 1 + speedMultiplier * 0.005;
    pool.currentIndex = (pool.currentIndex + 1) % MAX_SOUND_POOL;
    sound.currentTime = 0;
    sound.play();
  };

  // Public methods
  const playMoveSound = (speedMultiplier: number) => {
    playFromPool(moveSounds, speedMultiplier);
  };

  const playJumpSound = (speedMultiplier: number) => {
    playFromPool(jumpSounds, speedMultiplier);
  };

  const playDoorSound = () => {
    doorSound.play();
  };

  const playCatSound = () => {
    catSound.currentTime = 0;
    catSound.play();
  };

  const playGameBackground = () => {
    gameBackground.currentTime = 0;
    gameBackground.play();
  };

  const pauseGameBackground = () => {
    gameBackground.pause();
  };

  const setGameBackgroundPlaybackRate = (rate: number) => {
    gameBackground.playbackRate = rate;
  };

  return {
    moveSounds,
    jumpSounds,
    doorSound,
    catSound,
    gameBackground,
    playMoveSound,
    playJumpSound,
    playDoorSound,
    playCatSound,
    playGameBackground,
    pauseGameBackground,
    setGameBackgroundPlaybackRate,
  };
}
