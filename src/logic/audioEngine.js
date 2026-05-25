const BGM_FILES = {
  boom: '/assets/audio/bgm/bg_music_boom.mp3',
  growth: '/assets/audio/bgm/bg_music_growth.mp3',
  stable: '/assets/audio/bgm/bg_music_stable.mp3',
  contraction: '/assets/audio/bgm/bg_music_contraction.mp3',
  recession: '/assets/audio/bgm/bg_music_recession.mp3',
  main: '/assets/audio/bgm/bg_music_main.mp3',
  strategy: '/assets/audio/bgm/bg_music_strategy.mp3',
  tension: '/assets/audio/bgm/bg_music_tension.mp3',
  boss: '/assets/audio/bgm/bg_music_boss.mp3',
}

const SFX_FILES = {
  click: '/assets/audio/sfx/sfx_click.mp3',
  event: '/assets/audio/sfx/sfx_event.mp3',
  warning: '/assets/audio/sfx/sfx_warning.mp3',
  profit: '/assets/audio/sfx/sfx_profit.mp3',
  loss: '/assets/audio/sfx/sfx_loss.mp3',
  nextfloor: '/assets/audio/sfx/sfx_nextfloor.mp3',
  rival: '/assets/audio/sfx/sfx_rival.mp3',
  boss: '/assets/audio/sfx/sfx_boss.mp3',
  clear: '/assets/audio/sfx/sfx_clear.mp3',
}

let currentBGM = null
let currentBGMKey = null
let bgmVolume = 1.0
let sfxVolume = 1.0
let bgmEnabled = true
let sfxEnabled = true

export function applyAudioSettings(settings) {
  bgmVolume = ((settings.masterVolume ?? 100) / 100) * ((settings.bgmVolume ?? 100) / 100)
  sfxVolume = ((settings.masterVolume ?? 100) / 100) * ((settings.sfxVolume ?? 100) / 100)
  bgmEnabled = settings.bgmOn !== false
  sfxEnabled = settings.sfxOn !== false
  if (currentBGM) currentBGM.volume = bgmVolume
}

export function playBGM(key, volume = null) {
  if (!bgmEnabled) return
  if (currentBGMKey === key && currentBGM && !currentBGM.paused) return

  const src = BGM_FILES[key]
  if (!src) return

  if (currentBGM) {
    fadeOut(currentBGM, () => {
      startBGM(src, key, volume)
    })
  } else {
    startBGM(src, key, volume)
  }
}

function startBGM(src, key, volume) {
  const audio = new Audio(src)
  audio.loop = true
  audio.volume = 0
  audio.play().catch(() => {})
  fadeIn(audio, volume !== null ? volume : bgmVolume)
  currentBGM = audio
  currentBGMKey = key
}

export function stopBGM(fade = true) {
  if (!currentBGM) return

  if (fade) {
    fadeOut(currentBGM, () => {
      currentBGM = null
      currentBGMKey = null
    })
  } else {
    currentBGM.pause()
    currentBGM = null
    currentBGMKey = null
  }
}

export function setBGMVolume(volume) {
  bgmVolume = volume
  if (currentBGM) currentBGM.volume = volume
}

export function playSFX(key) {
  if (!sfxEnabled) return

  const src = SFX_FILES[key]
  if (!src) return

  const audio = new Audio(src)
  audio.volume = sfxVolume
  audio.play().catch(() => {})
}

export function onPhaseChange(newPhase) {
  playBGM(newPhase)
}

function fadeIn(audio, targetVolume, duration = 1000) {
  audio.volume = 0
  const step = targetVolume / (duration / 50)
  const interval = setInterval(() => {
    if (audio.volume + step >= targetVolume) {
      audio.volume = targetVolume
      clearInterval(interval)
    } else {
      audio.volume += step
    }
  }, 50)
}

function fadeOut(audio, callback, duration = 800) {
  const step = audio.volume / (duration / 50)
  const interval = setInterval(() => {
    if (audio.volume - step <= 0) {
      audio.volume = 0
      audio.pause()
      clearInterval(interval)
      if (callback) callback()
    } else {
      audio.volume -= step
    }
  }, 50)
}

export function playSound(key) {
  playSFX(key)
}

export function stopSound() {
  stopBGM()
}
