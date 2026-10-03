import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Film, Mail, RotateCcw, ShieldCheck, SkipBack, UserRound, Volume2, VolumeX } from 'lucide-react'
import { VideoUploader } from './components/VideoUploader'
import { Timeline } from './components/Timeline'
import { MusicPanel, tracks } from './components/MusicPanel'
import { SubtitlePanel } from './components/SubtitlePanel'
import { ExportModal } from './components/ExportModal'
import { useVideoProject } from './hooks/useVideoProject'
import { useIsMobile } from './hooks/useIsMobile'
import { clipStartTimes, formatTime, friendlyError, projectDuration } from './utils'
import { exportVideo } from './services/exportVideo'
import type { ExportPhase } from './types'

declare global { interface Document { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } } }

export default function App() {
  const project = useVideoProject()
  const isMobile = useIsMobile()
  const { resolution, setResolution } = project
  useEffect(() => { if (isMobile && resolution !== '480p') setResolution('480p') }, [isMobile, resolution, setResolution])
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [playerMuted, setPlayerMuted] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPhase, setExportPhase] = useState<ExportPhase>('idle')
  const [exportProgress, setExportProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const videoA = useRef<HTMLVideoElement>(null)
  const videoB = useRef<HTMLVideoElement>(null)
  const musicAudio = useRef<HTMLAudioElement>(null)
  const animation = useRef<number>(0)
  const demoRequested = useRef(false)
  const startedAt = useRef(0)
  const initialTime = useRef(0)
  const total = projectDuration(project.clips)
  const starts = clipStartTimes(project.clips)

  const activeIndex = Math.max(0, project.clips.findIndex((clip, index) => playhead >= starts[index] && playhead < starts[index] + clip.duration))
  const active = project.clips[activeIndex]
  const next = project.clips[activeIndex + 1]
  const localTime = active ? Math.max(0, playhead - starts[activeIndex]) : 0
  const fadeLength = active && next && active.transitionAfter === 'fade' ? Math.min(3, active.duration / 2, next.duration / 2) : 0
  const fadeProgress = fadeLength ? Math.max(0, Math.min(1, (localTime - (active.duration - fadeLength)) / fadeLength)) : 0
  const activeSubtitle = project.subtitles.find(subtitle => subtitle.text.trim() && playhead >= subtitle.startTime && playhead < subtitle.endTime)

  useEffect(() => {
    const sync = (el: HTMLVideoElement | null, time: number, shouldPlay: boolean) => {
      if (!el) return
      if (Math.abs(el.currentTime - time) > .18) el.currentTime = Math.max(0, time)
      el.volume = playerMuted ? 0 : project.videoVolume / 100
      if (shouldPlay) el.play().catch(() => undefined); else el.pause()
    }
    sync(videoA.current, localTime, playing)
    if (next && fadeProgress > 0) sync(videoB.current, Math.max(0, playhead - starts[activeIndex + 1]), playing)
  }, [active?.id, next?.id, localTime, playing, fadeProgress, playerMuted, project.videoVolume, starts, activeIndex, playhead])

  useEffect(() => {
    const audio = musicAudio.current
    if (!audio) return
    const track = tracks.find(t => t.id === project.music)
    if (!track) { audio.pause(); return }
    if (!audio.src.endsWith(track.src)) audio.src = track.src
    audio.volume = playerMuted ? 0 : project.musicVolume / 100
    if (Math.abs(audio.currentTime - (playhead % Math.max(audio.duration || 12, 1))) > .4 && Number.isFinite(audio.duration)) audio.currentTime = playhead % audio.duration
    if (playing) audio.play().catch(() => undefined); else audio.pause()
  }, [project.music, project.musicVolume, playhead, playing, playerMuted])

  useEffect(() => {
    cancelAnimationFrame(animation.current)
    if (!playing) return
    startedAt.current = performance.now(); initialTime.current = playhead
    const tick = (now: number) => {
      const time = initialTime.current + (now - startedAt.current) / 1000
      if (time >= total) { setPlayhead(0); setPlaying(false); return }
      setPlayhead(time); animation.current = requestAnimationFrame(tick)
    }
    animation.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animation.current)
  }, [playing, total])

  useEffect(() => { if (playhead > total) setPlayhead(0) }, [playhead, total])

  useEffect(() => {
    if (demoRequested.current || new URLSearchParams(window.location.search).get('demo') !== '1') return
    demoRequested.current = true
    void project.loadDemo()
  }, [project.loadDemo])

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    try {
      void Promise.resolve(context.registerTool({ name: 'configure_video_project', title: 'Configure video project', description: 'Change music and audio levels in the visible LumaCut project.', inputSchema: { type: 'object', properties: { music: { type: 'string', enum: ['none', 'calm', 'positive', 'cinematic'] }, musicVolume: { type: 'number', minimum: 0, maximum: 100 }, videoVolume: { type: 'number', minimum: 0, maximum: 100 } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input: unknown) { const value = input as { music?: typeof project.music; musicVolume?: number; videoVolume?: number }; if (value.music) project.setMusic(value.music); if (typeof value.musicVolume === 'number') project.setMusicVolume(value.musicVolume); if (typeof value.videoVolume === 'number') project.setVideoVolume(value.videoVolume); return { configured: true, music: value.music ?? project.music } } }, { signal: lifecycle.signal })).catch(() => undefined)
    } catch { /* unsupported preview */ }
    return () => lifecycle.abort()
  }, [project.music, project.setMusic, project.setMusicVolume, project.setVideoVolume])

  const seek = (time: number) => { setPlayhead(Math.max(0, Math.min(total, time))); if (playing) { startedAt.current = performance.now(); initialTime.current = time } }
  const startExport = async () => {
    setExportError(null); setDownloadUrl(current => { if (current) URL.revokeObjectURL(current); return null })
    try {
      const url = await exportVideo({ clips: project.clips, subtitles: project.subtitles, music: project.music, musicVolume: project.musicVolume, videoVolume: project.videoVolume, resolution: project.resolution, onUpdate: (phase, progress) => { setExportPhase(phase); setExportProgress(progress) } })
      setDownloadUrl(url); setExportPhase('done')
    } catch (error) { setExportError(friendlyError(error)); setExportPhase('error') }
  }
  const resetProject = () => { setExportOpen(false); setExportPhase('idle'); window.location.reload() }
  const large = project.totalSize > 500 * 1024 * 1024

  return <main>
    <header className="app-header">
      <div className="brand"><span className="brand-mark"><Film /></span><b>LumaCut</b><em>STUDIO</em></div>
      <div className="project-name">
        <a className="demo-project-link" href="?demo=1" target="_blank" rel="noreferrer" aria-label="Open demo project in a new tab">Demo Project</a>
        <details className="author-menu">
          <summary><UserRound />Author</summary>
          <div className="author-card">
            <span className="eyebrow">AUTHOR · AUTOR</span>
            <strong>Jon Peciña</strong>
            <p><b>ES</b> Soy el creador de LumaCut, un editor de vídeo privado que funciona directamente en tu navegador.</p>
            <p><b>EN</b> I’m the creator of LumaCut, a private video editor that runs directly in your browser.</p>
            <a href="mailto:jpecina@gmail.com"><Mail />jpecina@gmail.com</a>
          </div>
        </details>
      </div>
      <button className="button primary export-button" disabled={!project.clips.length} onClick={() => { setExportPhase('idle'); setExportOpen(true) }}>Export video <ArrowUpRight /></button>
    </header>

    {!project.clips.length ? <div className="empty-shell">
      <VideoUploader onFiles={project.addFiles} loading={project.isImporting} onDemo={project.loadDemo} />
      {project.error && <div className="notice error">{project.error}</div>}
      <div className="privacy-note"><ShieldCheck /><span><b>Private by design</b>Your media stays on this device.</span></div>
    </div> : <div className="workspace">
      <section className="preview-section">
        <div className="preview-toolbar"><div><span className="eyebrow">PREVIEW</span><b>{active?.name.replace(/\.[^.]+$/, '')}</b></div><VideoUploader onFiles={project.addFiles} loading={project.isImporting} compact /></div>
        <div className="video-stage">
          <div className="video-stack">
            <video ref={videoA} key={active?.id} src={active?.url} playsInline style={{ opacity: 1 - fadeProgress }} />
            {next && <video ref={videoB} key={next.id} src={next.url} playsInline style={{ opacity: fadeProgress }} />}
          </div>
          {activeSubtitle && <div className={`preview-subtitle ${activeSubtitle.position}`}><span style={{ color: activeSubtitle.color }}>{activeSubtitle.text}</span></div>}
          <span className="canvas-size">16:9</span>
        </div>
        <div className="player-controls">
          <button onClick={() => seek(0)} aria-label="Back to start"><SkipBack /></button>
          <button className="play-control" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <span className="pause-symbol">Ⅱ</span> : <span className="play-symbol">▶</span>}</button>
          <b>{formatTime(playhead)}</b>
          <input className="scrubber" aria-label="Project position" type="range" min="0" max={total || 1} step="0.01" value={playhead} onChange={e => seek(+e.target.value)} />
          <span>{formatTime(total)}</span>
          <button onClick={() => setPlayerMuted(!playerMuted)} aria-label="Mute preview">{playerMuted ? <VolumeX /> : <Volume2 />}</button>
        </div>
        <audio ref={musicAudio} loop />
      </section>

      <aside className="project-sidebar">
        <div className="sidebar-title"><span className="eyebrow">PROJECT</span><h2>Finishing touches</h2></div>
        <MusicPanel selected={project.music} onSelect={project.setMusic} musicVolume={project.musicVolume} setMusicVolume={project.setMusicVolume} videoVolume={project.videoVolume} setVideoVolume={project.setVideoVolume} />
        <SubtitlePanel subtitles={project.subtitles} duration={total} playhead={playhead} onAdd={() => { setPlaying(false); project.addSubtitle(playhead, total) }} onUpdate={project.updateSubtitle} onDelete={project.removeSubtitle} onSeek={seek} />
        <div className="project-info"><div><span>Duration</span><b>{formatTime(total)}</b></div><div><span>Clips</span><b>{project.clips.length}</b></div><div><span>Music</span><b>{project.music === 'none' ? 'None' : project.music[0].toUpperCase() + project.music.slice(1)}</b></div><div><span>Subtitles</span><b>{project.subtitles.length || 'None'}</b></div></div>
        <div className="local-badge"><ShieldCheck /><span><b>Browser-only editing</b>No uploads. No waiting for servers.</span></div>
      </aside>

      <Timeline clips={project.clips} subtitles={project.subtitles} playhead={playhead} onSeek={seek} onMove={project.moveClip} onDelete={project.removeClip} onToggleTransition={project.toggleTransition} onAdd={() => fileInput.current?.click()} />
      <input ref={fileInput} hidden type="file" multiple accept="video/mp4,video/quicktime,video/webm,.mov" onChange={e => e.target.files && project.addFiles(Array.from(e.target.files))} />
    </div>}

    {(large || project.error) && <div className={`toast ${project.error ? 'error' : ''}`}><b>{project.error ? 'Import issue' : 'Large project'}</b><span>{project.error ?? 'Processing large videos in your browser may require significant memory and can take longer.'}</span><button onClick={() => project.setError(null)}>×</button></div>}
    <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} resolution={project.resolution} setResolution={project.setResolution} phase={exportPhase} progress={exportProgress} onExport={startExport} downloadUrl={downloadUrl} onReset={resetProject} error={exportError} isMobile={isMobile} />
  </main>
}
