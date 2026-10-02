import type { VideoClip } from './types'

export function formatTime(value: number) {
  if (!Number.isFinite(value)) return '00:00'
  const seconds = Math.max(0, Math.floor(value))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export const fadeDuration = (a: VideoClip, b: VideoClip) =>
  Math.min(3, Math.max(0.15, a.duration / 2), Math.max(0.15, b.duration / 2))

export function projectDuration(clips: VideoClip[]) {
  return Math.max(0, clips.reduce((sum, clip) => sum + clip.duration, 0) - clips.slice(0, -1).reduce((sum, clip, index) => sum + (clip.transitionAfter === 'fade' ? fadeDuration(clip, clips[index + 1]) : 0), 0))
}

export function clipStartTimes(clips: VideoClip[]) {
  let cursor = 0
  return clips.map((clip, index) => {
    const start = cursor
    cursor += clip.duration
    if (clip.transitionAfter === 'fade' && clips[index + 1]) cursor -= fadeDuration(clip, clips[index + 1])
    return start
  })
}

export function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/memory|allocation|abort/i.test(message)) return 'Your browser ran out of memory while processing this project. Try 720p or use smaller clips.'
  if (/codec|decode|invalid data/i.test(message)) return "We couldn't process one of the videos. Try an MP4 encoded with H.264."
  return 'The export could not be completed. Check the clips and try again, preferably at 720p.'
}
