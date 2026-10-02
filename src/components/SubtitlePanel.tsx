import { Captions, Plus, Trash2 } from 'lucide-react'
import type { Subtitle, SubtitlePosition } from '../types'
import { formatTime } from '../utils'

const subtitleColors = [
  { value: '#FFFFFF', name: 'White' },
  { value: '#FFE66D', name: 'Yellow' },
  { value: '#D9FF43', name: 'Lime' },
  { value: '#76D7FF', name: 'Blue' },
  { value: '#FF8FCB', name: 'Pink' },
  { value: '#FF8A80', name: 'Coral' },
]

interface Props {
  subtitles: Subtitle[]
  duration: number
  playhead: number
  onAdd: () => void
  onUpdate: (id: string, changes: Partial<Omit<Subtitle, 'id'>>) => void
  onDelete: (id: string) => void
  onSeek: (time: number) => void
}

export function SubtitlePanel({ subtitles, duration, playhead, onAdd, onUpdate, onDelete, onSeek }: Props) {
  const updateTime = (subtitle: Subtitle, field: 'startTime' | 'endTime', value: number) => {
    if (!Number.isFinite(value)) return
    const next = Math.max(0, Math.min(duration, value))
    if (field === 'startTime') onUpdate(subtitle.id, { startTime: Math.min(next, subtitle.endTime - .1) })
    else onUpdate(subtitle.id, { endTime: Math.max(next, subtitle.startTime + .1) })
  }

  return <section className="subtitle-panel">
    <div className="section-heading">
      <div><span className="eyebrow">OPTIONAL</span><h2>Subtitles</h2></div>
      <button className="caption-add" onClick={onAdd}><Plus /> Add</button>
    </div>
    {!subtitles.length ? <button className="subtitle-empty" onClick={onAdd}>
      <Captions /><span><b>No subtitles</b>Add one at {formatTime(playhead)}</span>
    </button> : <div className="subtitle-list">
      {subtitles.map((subtitle, index) => <article className="subtitle-editor" key={subtitle.id}>
        <div className="subtitle-editor-head">
          <button onClick={() => onSeek(subtitle.startTime)}><Captions /> Caption {index + 1}</button>
          <button className="subtitle-delete" aria-label={`Delete caption ${index + 1}`} onClick={() => onDelete(subtitle.id)}><Trash2 /></button>
        </div>
        <textarea aria-label={`Caption ${index + 1} text`} rows={2} value={subtitle.text} maxLength={160} onChange={event => onUpdate(subtitle.id, { text: event.target.value })} />
        <div className="subtitle-color-row"><span>Color</span><div className="subtitle-palette">{subtitleColors.map(color => <button type="button" key={color.value} className={`color-swatch ${subtitle.color === color.value ? 'selected' : ''}`} style={{ backgroundColor: color.value }} aria-label={`${color.name} subtitle`} title={color.name} onClick={() => onUpdate(subtitle.id, { color: color.value })} />)}</div></div>
        <div className="subtitle-settings">
          <label><span>Start</span><input aria-label="Subtitle start time" type="number" min="0" max={duration} step="0.1" value={subtitle.startTime.toFixed(1)} onChange={event => updateTime(subtitle, 'startTime', Number(event.target.value))} /></label>
          <label><span>End</span><input aria-label="Subtitle end time" type="number" min="0" max={duration} step="0.1" value={subtitle.endTime.toFixed(1)} onChange={event => updateTime(subtitle, 'endTime', Number(event.target.value))} /></label>
          <label className="position-field"><span>Position</span><select aria-label="Subtitle position" value={subtitle.position} onChange={event => onUpdate(subtitle.id, { position: event.target.value as SubtitlePosition })}><option value="bottom">Bottom</option><option value="center">Center</option><option value="top">Top</option></select></label>
        </div>
      </article>)}
    </div>}
  </section>
}
