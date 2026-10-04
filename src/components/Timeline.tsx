import { useState } from 'react'
import { Captions, GripVertical, Plus, Trash2, WandSparkles } from 'lucide-react'
import type { Subtitle, VideoClip } from '../types'
import { clipStartTimes, formatTime, projectDuration, TRANSITION_LABELS, transitionDuration } from '../utils'

interface Props { clips: VideoClip[]; subtitles: Subtitle[]; playhead: number; onSeek: (time: number) => void; onMove: (from: number, to: number) => void; onDelete: (id: string) => void; onCycleTransition: (id: string) => void; onAdd: () => void }

export function Timeline({ clips, subtitles, playhead, onSeek, onMove, onDelete, onCycleTransition, onAdd }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const total = projectDuration(clips)
  const starts = clipStartTimes(clips)
  const timelineWidth = Math.max(820, total * 48)
  const timelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, .clip-card')) return
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(((e.clientX - rect.left) / rect.width) * total)
  }
  return <section className="timeline-panel">
    <div className="section-heading"><div><span className="eyebrow">SEQUENCE</span><h2>Timeline</h2></div><button className="icon-label-button" onClick={onAdd}><Plus /> Add clip</button></div>
    <div className="timeline-scroll">
      <div className="timeline-track" style={{ minWidth: timelineWidth }}>
        <div className="time-ruler"><span>00:00</span><span>{formatTime(total / 2)}</span><span>{formatTime(total)}</span></div>
        <div className="timeline-body" onClick={timelineClick}>
          <div className="clips-row">
            {clips.map((clip, index) => <article key={clip.id} className={`clip-card ${dragIndex === index ? 'is-dragging' : ''}`} style={{ left: `${total ? starts[index] / total * 100 : 0}%`, width: `${total ? clip.duration / total * 100 : 0}%`, zIndex: index + 1 }} draggable onDragStart={() => setDragIndex(index)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIndex !== null && dragIndex !== index) onMove(dragIndex, index); setDragIndex(null) }} onDragEnd={() => setDragIndex(null)}>
              <img src={clip.thumbnail} alt="" />
              <span className="clip-drag"><GripVertical /></span>
              <button className="clip-delete" title={`Delete ${clip.name}`} onClick={() => onDelete(clip.id)}><Trash2 /></button>
              <div className="clip-meta"><strong>{clip.name.replace(/\.[^.]+$/, '')}</strong><span>{formatTime(clip.duration)}</span></div>
            </article>)}
            {clips.slice(0, -1).map((clip, index) => {
              const type = clip.transitionAfter
              const d = type === 'none' ? 0 : transitionDuration(clip, clips[index + 1])
              const label = type === 'none' ? 'Cut' : `${TRANSITION_LABELS[type]} ${d.toFixed(1)}s`
              return <button key={`transition-${clip.id}`} className={`transition-chip ${d ? 'active transition-span' : ''}`} style={{ left: `${total ? starts[index + 1] / total * 100 : 0}%`, width: d ? `${d / total * 100}%` : undefined }} onClick={() => onCycleTransition(clip.id)} title="Cycle transition"><WandSparkles /><span>{label}</span></button>
            })}
          </div>
          <div className="subtitle-lane"><span className="subtitle-lane-label"><Captions /></span>{subtitles.map(subtitle => <button key={subtitle.id} title={subtitle.text} onClick={() => onSeek(subtitle.startTime)} style={{ left: `${total ? subtitle.startTime / total * 100 : 0}%`, width: `${total ? Math.max(1.5, (subtitle.endTime - subtitle.startTime) / total * 100) : 0}%`, borderColor: subtitle.color, color: subtitle.color }}>{subtitle.text || 'Untitled subtitle'}</button>)}</div>
          <div className="playhead" style={{ left: `${total ? (playhead / total) * 100 : 0}%` }}><i /><span /></div>
        </div>
      </div>
    </div>
  </section>
}
