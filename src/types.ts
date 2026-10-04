export type TransitionType = 'none' | 'fade' | 'fadeblack' | 'fadewhite' | 'wipeleft' | 'slideleft'

export interface VideoClip {
  id: string
  file: File
  name: string
  url: string
  duration: number
  thumbnail: string
  size: number
  transitionAfter: TransitionType
}

export type MusicId = 'none' | 'calm' | 'positive' | 'cinematic' | 'custom'
export type Resolution = '480p' | '720p' | '1080p'
export type SubtitlePosition = 'top' | 'center' | 'bottom'

export interface Subtitle {
  id: string
  text: string
  startTime: number
  endTime: number
  position: SubtitlePosition
  color: string
}

export interface MusicTrack {
  id: Exclude<MusicId, 'none' | 'custom'>
  name: string
  description: string
  src: string
  tone: string
}

export interface CustomAudio {
  file: File
  url: string
  name: string
}

export type ExportPhase = 'idle' | 'loading' | 'preparing' | 'transitions' | 'audio' | 'encoding' | 'finalizing' | 'done' | 'error'
