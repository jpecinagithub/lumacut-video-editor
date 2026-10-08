import { fetchFile } from '@ffmpeg/util'
import type { MusicId, Resolution, Subtitle, VideoClip, ExportPhase } from '../types'
import { projectDuration, transitionDuration } from '../utils'
import { getFFmpeg } from './ffmpeg'
import { effectiveDuration } from '../utils'

const safeName = (index: number, file: File) => `input-${index}.${file.name.split('.').pop()?.toLowerCase() || 'mp4'}`

function splitSubtitleLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  for (const paragraph of text.trim().split(/\n/)) {
    const words = paragraph.split(/\s+/)
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (line && context.measureText(candidate).width > maxWidth) { lines.push(line); line = word }
      else line = candidate
    }
    if (line) lines.push(line)
  }
  return lines.slice(0, 3)
}

async function renderSubtitle(subtitle: Subtitle, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Subtitle rendering is not supported in this browser.')
  const fontSize = Math.max(24, Math.round(height * .047))
  const lineHeight = Math.round(fontSize * 1.28)
  context.font = `700 ${fontSize}px Manrope, Arial, sans-serif`
  context.textAlign = 'center'; context.textBaseline = 'middle'
  const lines = splitSubtitleLines(context, subtitle.text, width * .78)
  const widest = Math.max(...lines.map(line => context.measureText(line).width), 0)
  const paddingX = Math.round(fontSize * .72), paddingY = Math.round(fontSize * .46)
  const boxWidth = Math.min(width * .88, widest + paddingX * 2)
  const boxHeight = lines.length * lineHeight + paddingY * 2
  const x = (width - boxWidth) / 2
  const y = subtitle.position === 'top' ? height * .09 : subtitle.position === 'center' ? (height - boxHeight) / 2 : height - boxHeight - height * .09
  const radius = Math.round(fontSize * .32)
  context.fillStyle = 'rgba(0,0,0,.72)'
  context.beginPath(); context.roundRect(x, y, boxWidth, boxHeight, radius); context.fill()
  context.fillStyle = subtitle.color
  lines.forEach((line, index) => context.fillText(line, width / 2, y + paddingY + lineHeight * (index + .5)))
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Subtitle image could not be created.')), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}

export async function exportVideo(options: { clips: VideoClip[]; subtitles: Subtitle[]; music: MusicId; customAudioFile: File | null; musicVolume: number; videoVolume: number; resolution: Resolution; onUpdate: (phase: ExportPhase, progress: number) => void }) {
  const { clips, subtitles, music, customAudioFile, musicVolume, videoVolume, resolution, onUpdate } = options
  onUpdate('loading', 3)
  const ffmpeg = await getFFmpeg(p => onUpdate('encoding', 58 + p * 32))
  const dimensions: Record<Resolution, [number, number]> = {
    '480p': [854, 480],
    '720p': [1280, 720],
    '1080p': [1920, 1080],
  }
  const [width, height] = dimensions[resolution]
  const tempFiles: string[] = []
  try {
    for (let i = 0; i < clips.length; i++) {
      onUpdate('preparing', 6 + (i / clips.length) * 34)
      const input = safeName(i, clips[i].file)
      const output = `normal-${i}.mp4`
      tempFiles.push(input, output)
      await ffmpeg.writeFile(input, await fetchFile(clips[i].file))
      const d = effectiveDuration(clips[i]).toFixed(3)
      const ss = clips[i].trimStart.toFixed(3)
      const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1,format=yuv420p`
      let hasAudio = false
      const listener = ({ message }: { message: string }) => { if (/Audio:/.test(message)) hasAudio = true }
      ffmpeg.on('log', listener)
      try { await ffmpeg.exec(['-i', input, '-hide_banner']) } catch { /* probing exits non-zero */ }
      ffmpeg.off('log', listener)
      const args = hasAudio
        ? ['-i', input, '-ss', ss, '-filter_complex', `[0:v]${videoFilter}[v];[0:a]aresample=48000,volume=${videoVolume / 100}[a]`, '-map', '[v]', '-map', '[a]', '-t', d, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-c:a', 'aac', '-b:a', '160k', output]
        : ['-i', input, '-ss', ss, '-f', 'lavfi', '-t', d, '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-filter_complex', `[0:v]${videoFilter}[v]`, '-map', '[v]', '-map', '1:a', '-t', d, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-c:a', 'aac', '-b:a', '160k', output]
      const code = await ffmpeg.exec(args)
      if (code !== 0) throw new Error(`Failed to normalize ${clips[i].name}`)
    }

    onUpdate('transitions', 44)
    const joinArgs = clips.flatMap((_, i) => ['-i', `normal-${i}.mp4`])
    let videoLabel = '0:v', audioLabel = '0:a', cursor = effectiveDuration(clips[0])
    const filters: string[] = []
    for (let i = 1; i < clips.length; i++) {
      const previous = clips[i - 1]
      if (previous.transitionAfter !== 'none') {
        const d = transitionDuration(previous, clips[i])
        const offset = cursor - d
        filters.push(`[${videoLabel}][${i}:v]xfade=transition=${previous.transitionAfter}:duration=${d.toFixed(3)}:offset=${offset.toFixed(3)}[v${i}]`)
        filters.push(`[${audioLabel}][${i}:a]acrossfade=d=${d.toFixed(3)}:c1=tri:c2=tri[a${i}]`)
        cursor += effectiveDuration(clips[i]) - d
      } else {
        filters.push(`[${videoLabel}][${audioLabel}][${i}:v][${i}:a]concat=n=2:v=1:a=1[v${i}][a${i}]`)
        cursor += effectiveDuration(clips[i])
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
    if (music !== 'none' && (music !== 'custom' || customAudioFile)) {
      onUpdate('audio', 76)
      const ext = music === 'custom' && customAudioFile?.name.toLowerCase().endsWith('.mp3') ? 'mp3' : 'wav'
      const musicFile = `music-${music}.${ext}`
      const output = 'mixed.mp4'
      tempFiles.push(musicFile, output)
      const audioData = music === 'custom' && customAudioFile
        ? await fetchFile(customAudioFile)
        : await fetchFile(`/music/${music}.wav`)
      await ffmpeg.writeFile(musicFile, audioData)
      const duration = projectDuration(clips)
      const fadeStart = Math.max(0, duration - 1.5)
      const musicFilter = `[1:a]atrim=0:${duration.toFixed(3)},asetpts=PTS-STARTPTS,volume=${musicVolume / 100},afade=t=out:st=${fadeStart.toFixed(3)}:d=1.5[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]`
      const musicCode = await ffmpeg.exec(['-i', joined, '-stream_loop', '-1', '-i', musicFile, '-filter_complex', musicFilter, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', output])
      if (musicCode !== 0) throw new Error('Audio mixing failed')
      finalFile = output
    }

    const usableSubtitles = subtitles.filter(subtitle => subtitle.text.trim() && subtitle.endTime > subtitle.startTime)
    if (usableSubtitles.length) {
      onUpdate('encoding', 86)
      const subtitleArgs: string[] = []
      const subtitleFilters: string[] = []
      let videoInput = '0:v'
      for (let index = 0; index < usableSubtitles.length; index++) {
        const subtitle = usableSubtitles[index]
        const imageFile = `subtitle-${index}.png`
        tempFiles.push(imageFile)
        await ffmpeg.writeFile(imageFile, await renderSubtitle(subtitle, width, height))
        subtitleArgs.push('-loop', '1', '-framerate', '1', '-i', imageFile)
        const outputLabel = `sub${index}`
        subtitleFilters.push(`[${videoInput}][${index + 1}:v]overlay=0:0:enable='between(t,${subtitle.startTime.toFixed(3)},${subtitle.endTime.toFixed(3)})'[${outputLabel}]`)
        videoInput = outputLabel
      }
      const output = 'final.mp4'
      tempFiles.push(output)
      const duration = projectDuration(clips)
      const subtitleCode = await ffmpeg.exec(['-i', finalFile, ...subtitleArgs, '-filter_complex', subtitleFilters.join(';'), '-map', `[${videoInput}]`, '-map', '0:a', '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'copy', output])
      if (subtitleCode !== 0) throw new Error('Subtitle rendering failed')
      finalFile = output
    }
    onUpdate('finalizing', 94)
    // Move the moov atom to the start of the file so it streams correctly
    // in WhatsApp, browsers and social apps (faststart). Stream copy: fast, lossless.
    const streamable = 'streamable.mp4'
    tempFiles.push(streamable)
    const faststartCode = await ffmpeg.exec(['-i', finalFile, '-c', 'copy', '-movflags', '+faststart', '-y', streamable])
    if (faststartCode !== 0) throw new Error('Could not finalize the video file')
    const data = await ffmpeg.readFile(streamable)
    onUpdate('done', 100)
    return URL.createObjectURL(new Blob([data instanceof Uint8Array ? data : new TextEncoder().encode(data)], { type: 'video/mp4' }))
  } finally {
    for (const file of tempFiles) { try { await ffmpeg.deleteFile(file) } catch { /* already gone */ } }
  }
}
