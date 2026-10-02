import { Music2, Pause, Play } from 'lucide-react'
import { useRef, useState } from 'react'
import type { MusicId, MusicTrack } from '../types'

export const tracks: MusicTrack[] = [
  { id: 'calm', name: 'Calm', description: 'Soft ambient textures', src: '/music/calm.wav', tone: 'mint' },
  { id: 'positive', name: 'Positive', description: 'Bright, light momentum', src: '/music/positive.wav', tone: 'peach' },
  { id: 'cinematic', name: 'Cinematic', description: 'Wide, dramatic pulse', src: '/music/cinematic.wav', tone: 'blue' },
]

export function MusicPanel({ selected, onSelect, musicVolume, setMusicVolume, videoVolume, setVideoVolume }: { selected: MusicId; onSelect: (id: MusicId) => void; musicVolume: number; setMusicVolume: (n: number) => void; videoVolume: number; setVideoVolume: (n: number) => void }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [previewing, setPreviewing] = useState<MusicId>('none')
  const preview = async (track: MusicTrack) => {
    if (!audio.current) return
    if (previewing === track.id) { audio.current.pause(); setPreviewing('none'); return }
    audio.current.src = track.src; audio.current.volume = .55; await audio.current.play(); setPreviewing(track.id)
  }
  return <section className="music-panel">
    <div className="section-heading"><div><span className="eyebrow">SOUNDTRACK</span><h2>Background music</h2></div><button className={`no-music ${selected === 'none' ? 'active' : ''}`} onClick={() => onSelect('none')}>No music</button></div>
    <audio ref={audio} onEnded={() => setPreviewing('none')} />
    <div className="music-grid">{tracks.map(track => <article className={`music-card ${selected === track.id ? 'selected' : ''}`} key={track.id} onClick={() => onSelect(track.id)}>
      <div className={`music-art ${track.tone}`}><Music2 /><span className="wave">||||||||||</span></div>
      <div className="music-copy"><strong>{track.name}</strong><span>{track.description}</span></div>
      <button className="round-button" onClick={e => { e.stopPropagation(); preview(track) }} aria-label={`Preview ${track.name}`}>{previewing === track.id ? <Pause /> : <Play />}</button>
    </article>)}</div>
    <div className="mixers">
      <label><span><b>Music volume</b><output>{musicVolume}%</output></span><input type="range" min="0" max="100" value={musicVolume} onChange={e => setMusicVolume(+e.target.value)} disabled={selected === 'none'} /></label>
      <label><span><b>Original video audio</b><output>{videoVolume}%</output></span><input type="range" min="0" max="100" value={videoVolume} onChange={e => setVideoVolume(+e.target.value)} /></label>
    </div>
  </section>
}
