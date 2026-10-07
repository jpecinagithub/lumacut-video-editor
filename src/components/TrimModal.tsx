import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Scissors, X } from 'lucide-react'
import type { VideoClip } from '../types'
import { effectiveDuration, formatTime } from '../utils'

interface Props {
  clip: VideoClip
  onClose: () => void
  onTrim: (cutTime: number, keep: 'left' | 'right') => void
  onReset: () => void
}

const MIN_KEEP = 0.5

export function TrimModal({ clip, onClose, onTrim, onReset }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [cut, setCut] = useState((clip.trimStart + clip.trimEnd) / 2)
  const eff = effectiveDuration(clip)
  const isTrimmed = clip.trimStart > 1e-6 || clip.trimEnd < clip.duration - 1e-6
  const canKeepLeft = cut >= clip.trimStart + MIN_KEEP && cut < clip.trimEnd - 1e-6
  const canKeepRight = cut <= clip.trimEnd - MIN_KEEP && cut > clip.trimStart + 1e-6

  useEffect(() => { if (video.current) video.current.currentTime = cut }, [cut])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const apply = (keep: 'left' | 'right') => { onTrim(cut, keep); onClose() }
  const reset = () => { onReset(); onClose() }
  const pct = (t: number) => `${(t / clip.duration) * 100}%`

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal trim-modal" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose} title="Close"><X /></button>
      <span className="eyebrow">TRIM CLIP</span>
      <h2>{clip.name.replace(/\.[^.]+$/, '')}</h2>
      <p className="modal-lead">Pick a cut point, then keep one side and discard the other. The original file is never modified.</p>
      <video ref={video} src={clip.url} muted playsInline preload="auto" className="trim-preview" />
      <div className="trim-bar">
        <div className="trim-kept" style={{ left: pct(clip.trimStart), width: pct(eff) }} />
        <div className="trim-cut" style={{ left: pct(cut) }} />
      </div>
      <input type="range" className="trim-slider" min={0} max={clip.duration} step={0.1} value={cut}
        onChange={e => setCut(Number(e.target.value))} aria-label="Cut point" />
      <div className="trim-times">
        <span>Cut at <b>{formatTime(cut)}</b></span>
        <span>Left <b>{formatTime(cut - clip.trimStart)}</b> · Right <b>{formatTime(clip.trimEnd - cut)}</b></span>
      </div>
      <div className="trim-actions">
        <button className="button primary" disabled={!canKeepLeft} onClick={() => apply('left')}><Scissors /> Keep left</button>
        <button className="button primary" disabled={!canKeepRight} onClick={() => apply('right')}><Scissors /> Keep right</button>
      </div>
      <div className="trim-foot">
        {isTrimmed
          ? <button className="text-button" onClick={reset}><RotateCcw /> Reset trim ({formatTime(eff)} of {formatTime(clip.duration)} kept)</button>
          : <span>Full clip · {formatTime(clip.duration)}</span>}
      </div>
    </div>
  </div>
}
