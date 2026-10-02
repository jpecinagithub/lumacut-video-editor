import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { MusicId, Resolution, VideoClip, ExportPhase } from '../types'
import { fadeDuration, projectDuration } from '../utils'

let instance: FFmpeg | null = null

async function getFFmpeg(onProgress: (value: number) => void) {
  if (!instance) instance = new FFmpeg()
  instance.on('progress', ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))))
  if (!instance.loaded) {
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
    await instance.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm') })
  }
  return instance
}

const safeName = (index: number, file: File) => `input-${index}.${file.name.split('.').pop()?.toLowerCase() || 'mp4'}`

export async function exportVideo(options: { clips: VideoClip[]; music: MusicId; musicVolume: number; videoVolume: number; resolution: Resolution; onUpdate: (phase: ExportPhase, progress: number) => void }) {
  const { clips, music, musicVolume, videoVolume, resolution, onUpdate } = options
  onUpdate('loading', 3)
  const ffmpeg = await getFFmpeg(p => onUpdate('encoding', 58 + p * 32))
  const [width, height] = resolution === '1080p' ? [1920, 1080] : [1280, 720]
  const tempFiles: string[] = []
  try {
    for (let i = 0; i < clips.length; i++) {
      onUpdate('preparing', 6 + (i / clips.length) * 34)
      const input = safeName(i, clips[i].file)
      const output = `normal-${i}.mp4`
      tempFiles.push(input, output)
      await ffmpeg.writeFile(input, await fetchFile(clips[i].file))
      const d = clips[i].duration.toFixed(3)
      const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1,format=yuv420p`
      let hasAudio = false
      const listener = ({ message }: { message: string }) => { if (/Audio:/.test(message)) hasAudio = true }
      ffmpeg.on('log', listener)
      try { await ffmpeg.exec(['-i', input, '-hide_banner']) } catch { /* probing exits non-zero */ }
      ffmpeg.off('log', listener)
      const args = hasAudio
        ? ['-i', input, '-filter_complex', `[0:v]${videoFilter}[v];[0:a]aresample=48000,volume=${videoVolume / 100}[a]`, '-map', '[v]', '-map', '[a]', '-t', d, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-c:a', 'aac', '-b:a', '160k', output]
        : ['-i', input, '-f', 'lavfi', '-t', d, '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-filter_complex', `[0:v]${videoFilter}[v]`, '-map', '[v]', '-map', '1:a', '-t', d, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-c:a', 'aac', '-b:a', '160k', output]
      const code = await ffmpeg.exec(args)
      if (code !== 0) throw new Error(`Failed to normalize ${clips[i].name}`)
    }

    onUpdate('transitions', 44)
    const joinArgs = clips.flatMap((_, i) => ['-i', `normal-${i}.mp4`])
    let videoLabel = '0:v', audioLabel = '0:a', cursor = clips[0].duration
    const filters: string[] = []
    for (let i = 1; i < clips.length; i++) {
      const previous = clips[i - 1]
      if (previous.transitionAfter === 'fade') {
        const d = fadeDuration(previous, clips[i])
        const offset = cursor - d
        filters.push(`[${videoLabel}][${i}:v]xfade=transition=fade:duration=${d.toFixed(3)}:offset=${offset.toFixed(3)}[v${i}]`)
        filters.push(`[${audioLabel}][${i}:a]acrossfade=d=${d.toFixed(3)}:c1=tri:c2=tri[a${i}]`)
        cursor += clips[i].duration - d
      } else {
        filters.push(`[${videoLabel}][${audioLabel}][${i}:v][${i}:a]concat=n=2:v=1:a=1[v${i}][a${i}]`)
        cursor += clips[i].duration
      }
      videoLabel = `v${i}`; audioLabel = `a${i}`
    }
    const joined = 'joined.mp4'
    tempFiles.push(joined)
    const code = clips.length === 1
      ? await ffmpeg.exec(['-i', 'normal-0.mp4', '-c', 'copy', joined])
      : await ffmpeg.exec([...joinArgs, '-filter_complex', filters.join(';'), '-map', `[${videoLabel}]`, '-map', `[${audioLabel}]`, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-c:a', 'aac', '-b:a', '160k', joined])
    if (code !== 0) throw new Error('Transition processing failed')

    let finalFile = joined
    if (music !== 'none') {
      onUpdate('audio', 76)
      const musicFile = `music-${music}.wav`
      const output = 'final.mp4'
      tempFiles.push(musicFile, output)
      await ffmpeg.writeFile(musicFile, await fetchFile(`/music/${music}.wav`))
      const duration = projectDuration(clips)
      const fadeStart = Math.max(0, duration - 1.5)
      const musicFilter = `[1:a]atrim=0:${duration.toFixed(3)},asetpts=PTS-STARTPTS,volume=${musicVolume / 100},afade=t=out:st=${fadeStart.toFixed(3)}:d=1.5[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]`
      const musicCode = await ffmpeg.exec(['-i', joined, '-stream_loop', '-1', '-i', musicFile, '-filter_complex', musicFilter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', output])
      if (musicCode !== 0) throw new Error('Audio mixing failed')
      finalFile = output
    }
    onUpdate('finalizing', 94)
    const data = await ffmpeg.readFile(finalFile)
    onUpdate('done', 100)
    return URL.createObjectURL(new Blob([data instanceof Uint8Array ? data : new TextEncoder().encode(data)], { type: 'video/mp4' }))
  } finally {
    for (const file of tempFiles) { try { await ffmpeg.deleteFile(file) } catch { /* already gone */ } }
  }
}
