import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let instance: FFmpeg | null = null

export async function getFFmpeg(onProgress: (value: number) => void = () => undefined) {
  if (!instance) instance = new FFmpeg()
  instance.on('progress', ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))))
  if (!instance.loaded) {
    // VITE_FFMPEG_CORE_BASE allows self-hosting the core (defaults to the unpkg CDN)
    const base = import.meta.env.VITE_FFMPEG_CORE_BASE || 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
    await instance.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
  }
  return instance
}

/**
 * Convert an MKV file to MP4 so every browser can preview and import it.
 * mode 'remux' does a fast stream-copy (fixes container issues only);
 * mode 'reencode' does a full H.264/AAC re-encode (fixes codec issues too).
 */
export async function convertMkvToMp4(file: File, mode: 'remux' | 'reencode'): Promise<File> {
  const ffmpeg = await getFFmpeg()
  const stamp = Date.now()
  const input = `convert-${stamp}.mkv`
  const output = `convert-${stamp}.mp4`
  try {
    await ffmpeg.writeFile(input, await fetchFile(file))
    const args = mode === 'remux'
      ? ['-i', input, '-c', 'copy', '-y', output]
      : ['-i', input, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-y', output]
    const code = await ffmpeg.exec(args)
    if (code !== 0) throw new Error(`"${file.name}" could not be converted to a playable format.`)
    const data = await ffmpeg.readFile(output)
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string)
    return new File([bytes], file.name.replace(/\.mkv$/i, '.mp4'), { type: 'video/mp4' })
  } finally {
    for (const name of [input, output]) { try { await ffmpeg.deleteFile(name) } catch { /* already gone */ } }
  }
}
