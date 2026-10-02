export type TransitionType = 'none' | 'fade'

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

export type MusicId = 'none' | 'calm' | 'positive' | 'cinematic'
export type Resolution = '720p' | '1080p'

export interface MusicTrack {
  id: Exclude<MusicId, 'none'>
  name: string
  description: string
  src: string
  tone: string
}

export type ExportPhase = 'idle' | 'loading' | 'preparing' | 'transitions' | 'audio' | 'encoding' | 'finalizing' | 'done' | 'error'
