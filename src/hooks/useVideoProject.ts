import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CustomAudio, MusicId, Resolution, Subtitle, VideoClip } from '../types'
import { projectDuration } from '../utils'

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/webm']

async function readClip(file: File): Promise<VideoClip> {
  if (!ACCEPTED.includes(file.type) && !/\.(mp4|mov|webm)$/i.test(file.name)) throw new Error(`${file.name} is not a supported video.`)
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.src = url
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error(`${file.name} could not be decoded.`))
  })
  const seekTo = Math.min(Math.max(video.duration * 0.18, 0.05), Math.max(0.05, video.duration - 0.05))
  video.currentTime = seekTo
  await new Promise<void>((resolve) => { video.onseeked = () => resolve() })
  const canvas = document.createElement('canvas')
  canvas.width = 420
  canvas.height = 236
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#15161a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
  const w = video.videoWidth * scale
  const h = video.videoHeight * scale
  ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
  return { id: crypto.randomUUID(), file, name: file.name, url, duration: video.duration, thumbnail: canvas.toDataURL('image/jpeg', .78), size: file.size, transitionAfter: 'none' }
}

async function makeDemoClip(label: string, color: string, accent: string, index: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 960
  canvas.height = 540
  const ctx = canvas.getContext('2d')!
  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
  const chunks: Blob[] = []
  recorder.ondataavailable = event => chunks.push(event.data)
  recorder.start()
  const duration = 3.6
  const start = performance.now()
  await new Promise<void>(resolve => {
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      const gradient = ctx.createLinearGradient(0, 0, 960, 540)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, '#08090b')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 960, 540)
      ctx.globalAlpha = .2
      ctx.fillStyle = accent
      ctx.beginPath(); ctx.arc(780 - t * 180, 110 + Math.sin(t * 5) * 35, 150, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#fff'
      ctx.font = '600 28px system-ui'; ctx.fillText(`SCENE 0${index + 1}`, 66, 82)
      ctx.font = '700 76px system-ui'; ctx.fillText(label, 62, 300)
      ctx.fillStyle = accent; ctx.fillRect(64, 337, 140 + 280 * t, 8)
      if (t < 1) requestAnimationFrame(draw); else resolve()
    }
    requestAnimationFrame(draw)
  })
  recorder.stop()
  await new Promise<void>(resolve => { recorder.onstop = () => resolve() })
  return new File([new Blob(chunks, { type: 'video/webm' })], `Demo ${index + 1} — ${label}.webm`, { type: 'video/webm' })
}

export function useVideoProject() {
  const [clips, setClips] = useState<VideoClip[]>([])
  const [music, setMusic] = useState<MusicId>('none')
  const [musicVolume, setMusicVolume] = useState(30)
  const [videoVolume, setVideoVolume] = useState(100)
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [customAudio, setCustomAudio] = useState<CustomAudio | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clipsRef = useRef(clips)
  clipsRef.current = clips
  const customAudioRef = useRef(customAudio)
  customAudioRef.current = customAudio

  useEffect(() => () => {
    clipsRef.current.forEach(clip => URL.revokeObjectURL(clip.url))
    if (customAudioRef.current) URL.revokeObjectURL(customAudioRef.current.url)
  }, [])

  const addFiles = useCallback(async (files: File[]) => {
    setIsImporting(true); setError(null)
    try {
      const results: VideoClip[] = []
      for (const file of files) results.push(await readClip(file))
      setClips(current => [...current, ...results])
    } catch (e) { setError(e instanceof Error ? e.message : 'The video could not be imported.') }
    finally { setIsImporting(false) }
  }, [])

  const removeClip = useCallback((id: string) => setClips(current => {
    const target = current.find(c => c.id === id)
    if (target) URL.revokeObjectURL(target.url)
    return current.filter(c => c.id !== id)
  }), [])

  const moveClip = useCallback((from: number, to: number) => setClips(current => {
    const next = [...current]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  }), [])

  const toggleTransition = useCallback((id: string) => setClips(current => current.map(c => c.id === id ? { ...c, transitionAfter: c.transitionAfter === 'fade' ? 'none' : 'fade' } : c)), [])

  const addSubtitle = useCallback((startTime: number, projectLength: number) => {
    const safeStart = Math.max(0, Math.min(startTime, Math.max(0, projectLength - .2)))
    const subtitle: Subtitle = {
      id: crypto.randomUUID(),
      text: 'New subtitle',
      startTime: safeStart,
      endTime: Math.min(projectLength, safeStart + 3),
      position: 'bottom',
      color: '#FFFFFF',
    }
    setSubtitles(current => [...current, subtitle].sort((a, b) => a.startTime - b.startTime))
    return subtitle.id
  }, [])

  const updateSubtitle = useCallback((id: string, changes: Partial<Omit<Subtitle, 'id'>>) => setSubtitles(current => current.map(subtitle => subtitle.id === id ? { ...subtitle, ...changes } : subtitle).sort((a, b) => a.startTime - b.startTime)), [])
  const removeSubtitle = useCallback((id: string) => setSubtitles(current => current.filter(subtitle => subtitle.id !== id)), [])

  const setCustomAudioFile = useCallback((file: File) => {
    if (!/audio\/(mpeg|wav|x-wav)/.test(file.type) && !/\.(mp3|wav)$/i.test(file.name)) {
      setError('Please choose an MP3 or WAV audio file.')
      return
    }
    setCustomAudio(current => {
      if (current) URL.revokeObjectURL(current.url)
      return { file, url: URL.createObjectURL(file), name: file.name }
    })
    setMusic('custom')
  }, [])

  const clearCustomAudio = useCallback(() => {
    setCustomAudio(current => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
    setMusic(current => (current === 'custom' ? 'none' : current))
  }, [])

  const loadDemo = useCallback(async () => {
    if (clips.length) return
    setIsImporting(true); setError(null)
    try {
      const files = await Promise.all([
        makeDemoClip('MAKE IT', '#163b37', '#baff67', 0),
        makeDemoClip('FEEL EASY', '#3d2238', '#ff8ecc', 1),
        makeDemoClip('SHIP IT', '#1d2f51', '#76b7ff', 2),
      ])
      const demo = await Promise.all(files.map(readClip))
      setClips(demo.map((clip, i) => ({ ...clip, transitionAfter: i < 2 ? 'fade' : 'none' })))
      setMusic('positive')
    } catch { setError('The demo could not be created in this browser.') }
    finally { setIsImporting(false) }
  }, [clips.length])

  const totalSize = useMemo(() => clips.reduce((n, c) => n + c.size, 0), [clips])
  const duration = useMemo(() => projectDuration(clips), [clips])

  return { clips, subtitles, addSubtitle, updateSubtitle, removeSubtitle, music, setMusic, customAudio, setCustomAudioFile, clearCustomAudio, musicVolume, setMusicVolume, videoVolume, setVideoVolume, resolution, setResolution, isImporting, error, setError, addFiles, removeClip, moveClip, toggleTransition, loadDemo, totalSize, duration }
}
