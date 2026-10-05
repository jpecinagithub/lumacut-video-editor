import { useEffect, useState } from 'react'
import { Captions, Check, GripVertical, Plus, Trash2, WandSparkles } from 'lucide-react'
import type { Subtitle, TransitionType, VideoClip } from '../types'
import { clipStartTimes, formatTime, projectDuration, TRANSITION_LABELS, TRANSITION_ORDER, transitionDuration } from '../utils'

interface Props { clips: VideoClip[]; subtitles: Subtitle[]; playhead: number; onSeek: (time: number) => void; onMove: (from: number, to: number) => void; onDelete: (id: string) => void; onSelectTransition: (id: string, type: TransitionType) => void; onAdd: () => void }

export function Timeline({ clips, subtitles, playhead, onSeek, onMove, onDelete, onSelectTransition, onAdd }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [menuAbove, setMenuAbove] = useState(false)
  const total = projectDuration(clips)
  const starts = clipStartTimes(clips)
  const timelineWidth = Math.max(820, total * 48)
  const timelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, .clip-card')) return
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(((e.clientX - rect.left) / rect.width) * total)
  }
  const menuClip = menuId ? clips.find(c => c.id === menuId) : undefined
  const menuNext = menuClip ? clips[clips.indexOf(menuClip) + 1] : undefined
  const openMenu = (id: string, anchor: HTMLButtonElement) => {
    if (menuId === id) { setMenuId(null); return }
    const rect = anchor.getBoundingClientRect()
    const x = Math.max(95, Math.min(rect.left + rect.width / 2, window.innerWidth - 95))
    const below = rect.bottom + 8 + 240 <= window.innerHeight
    setMenuAbove(!below)
    setMenuPos({ x, y: below ? rect.bottom + 8 : rect.top - 8 })
    setMenuId(id)
  }
  useEffect(() => {
    if (!menuId) return
    const close = (e: Event) => {
      if ((e.target as HTMLElement).closest('.transition-menu, .transition-chip')) return
      setMenuId(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuId(null) }
    const onScroll = () => setMenuId(null)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuId])
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
              return <button key={`transition-${clip.id}`} className={`transition-chip ${d ? 'active transition-span' : ''}`} style={{ left: `${total ? starts[index + 1] / total * 100 : 0}%`, width: d ? `${d / total * 100}%` : undefined }} onClick={e => openMenu(clip.id, e.currentTarget)} title="Change transition"><WandSparkles /><span>{label}</span></button>
            })}
            {menuClip && menuNext && <div className="transition-menu" style={{ left: menuPos.x, top: menuPos.y, transform: menuAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)' }}>
              {TRANSITION_ORDER.map(t => {
                const active = menuClip.transitionAfter === t
                const dd = t === 'none' ? 0 : transitionDuration(menuClip, menuNext)
                return <button key={t} className={active ? 'current' : ''} onClick={() => { onSelectTransition(menuClip.id, t); setMenuId(null) }}>
                  <span className="t-name">{t === 'none' ? 'Cut' : TRANSITION_LABELS[t]}</span>
                  <span className="t-dur">{t === 'none' ? 'No transition' : `${dd.toFixed(1)}s`}</span>
                  {active && <Check />}
                </button>
              })}
            </div>}
          </div>
          <div className="subtitle-lane"><span className="subtitle-lane-label"><Captions /></span>{subtitles.map(subtitle => <button key={subtitle.id} title={subtitle.text} onClick={() => onSeek(subtitle.startTime)} style={{ left: `${total ? subtitle.startTime / total * 100 : 0}%`, width: `${total ? Math.max(1.5, (subtitle.endTime - subtitle.startTime) / total * 100) : 0}%`, borderColor: subtitle.color, color: subtitle.color }}>{subtitle.text || 'Untitled subtitle'}</button>)}</div>
          <div className="playhead" style={{ left: `${total ? (playhead / total) * 100 : 0}%` }}><i /><span /></div>
        </div>
      </div>
    </div>
  </section>
}
