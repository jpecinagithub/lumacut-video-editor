import { useState } from 'react'
import { GripVertical, Plus, Trash2, WandSparkles } from 'lucide-react'
import type { VideoClip } from '../types'
import { fadeDuration, formatTime, projectDuration } from '../utils'

interface Props { clips: VideoClip[]; playhead: number; onSeek: (time: number) => void; onMove: (from: number, to: number) => void; onDelete: (id: string) => void; onToggleTransition: (id: string) => void; onAdd: () => void }

export function Timeline({ clips, playhead, onSeek, onMove, onDelete, onToggleTransition, onAdd }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const total = projectDuration(clips)
  const timelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, .clip-card')) return
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(((e.clientX - rect.left) / rect.width) * total)
  }
  return <section className="timeline-panel">
    <div className="section-heading"><div><span className="eyebrow">SEQUENCE</span><h2>Timeline</h2></div><button className="icon-label-button" onClick={onAdd}><Plus /> Add clip</button></div>
    <div className="timeline-scroll" onClick={timelineClick}>
      <div className="timeline-track" style={{ minWidth: Math.max(820, clips.reduce((s, c) => s + Math.max(150, c.duration * 22), 0) + clips.length * 58) }}>
        <div className="time-ruler"><span>00:00</span><span>{formatTime(total / 2)}</span><span>{formatTime(total)}</span></div>
        <div className="clips-row">
          {clips.map((clip, index) => <div className="clip-with-transition" key={clip.id}>
            <article className={`clip-card ${dragIndex === index ? 'is-dragging' : ''}`} style={{ width: Math.max(150, clip.duration * 22) }} draggable onDragStart={() => setDragIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIndex !== null && dragIndex !== index) onMove(dragIndex, index); setDragIndex(null) }} onDragEnd={() => setDragIndex(null)}>
              <img src={clip.thumbnail} alt="" />
              <span className="clip-drag"><GripVertical /></span>
              <button className="clip-delete" title={`Delete ${clip.name}`} onClick={() => onDelete(clip.id)}><Trash2 /></button>
              <div className="clip-meta"><strong>{clip.name.replace(/\.[^.]+$/, '')}</strong><span>{formatTime(clip.duration)}</span></div>
            </article>
            {index < clips.length - 1 && <button className={`transition-chip ${clip.transitionAfter === 'fade' ? 'active' : ''}`} onClick={() => onToggleTransition(clip.id)} title="Toggle fade transition"><WandSparkles /><span>{clip.transitionAfter === 'fade' ? `Fade ${fadeDuration(clip, clips[index + 1]).toFixed(1)}s` : 'No fade'}</span></button>}
          </div>)}
        </div>
        <div className="playhead" style={{ left: `${total ? (playhead / total) * 100 : 0}%` }}><i /><span /></div>
      </div>
    </div>
  </section>
}
