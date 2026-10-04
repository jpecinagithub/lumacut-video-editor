import { FileAudio, Music2, Pause, Play, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { CustomAudio, MusicId, MusicTrack } from '../types'

export const tracks: MusicTrack[] = [
  { id: 'calm', name: 'Calm', description: 'Soft ambient textures', src: '/music/calm.wav', tone: 'mint' },
  { id: 'positive', name: 'Positive', description: 'Bright, light momentum', src: '/music/positive.wav', tone: 'peach' },
  { id: 'cinematic', name: 'Cinematic', description: 'Wide, dramatic pulse', src: '/music/cinematic.wav', tone: 'blue' },
]

export function MusicPanel({ selected, onSelect, musicVolume, setMusicVolume, videoVolume, setVideoVolume, customAudio, onUploadAudio, onClearAudio }: { selected: MusicId; onSelect: (id: MusicId) => void; musicVolume: number; setMusicVolume: (n: number) => void; videoVolume: number; setVideoVolume: (n: number) => void; customAudio: CustomAudio | null; onUploadAudio: (file: File) => void; onClearAudio: () => void }) {
  const audio = useRef<HTMLAudioElement>(null)
  const uploadInput = useRef<HTMLInputElement>(null)
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
    <input ref={uploadInput} hidden type="file" accept="audio/wav,audio/mpeg,.wav,.mp3" onChange={e => { const file = e.target.files?.[0]; if (file) onUploadAudio(file); e.target.value = '' }} />
    {customAudio
      ? <article className={`music-card custom-audio ${selected === 'custom' ? 'selected' : ''}`} onClick={() => onSelect('custom')}>
        <div className="music-art custom"><FileAudio /></div>
        <div className="music-copy"><strong>{customAudio.name}</strong><span>Your upload · this project only</span></div>
        <button className="round-button" aria-label="Remove uploaded audio" onClick={e => { e.stopPropagation(); onClearAudio() }}><X /></button>
      </article>
      : <button className="upload-audio-card" onClick={() => uploadInput.current?.click()}>
        <Upload /><span><b>Upload audio</b>MP3 or WAV · for this project only</span>
      </button>}
    <div className="mixers">
      <label><span><b>Music volume</b><output>{musicVolume}%</output></span><input type="range" min="0" max="100" value={musicVolume} onChange={e => setMusicVolume(+e.target.value)} disabled={selected === 'none'} />{selected === 'none' && <small className="mixer-hint">Select a music track above to enable volume control</small>}</label>
      <label><span><b>Original video audio</b><output>{videoVolume}%</output></span><input type="range" min="0" max="100" value={videoVolume} onChange={e => setVideoVolume(+e.target.value)} /></label>
    </div>
  </section>
}
