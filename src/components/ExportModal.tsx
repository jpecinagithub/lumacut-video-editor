import { Check, Download, LoaderCircle, X } from 'lucide-react'
import type { ExportPhase, Resolution } from '../types'

const labels: Record<ExportPhase, string> = { idle: '', loading: 'Loading the video engine…', preparing: 'Preparing clips…', transitions: 'Processing transitions…', audio: 'Mixing audio…', encoding: 'Encoding video…', finalizing: 'Finalizing…', done: 'Your video is ready', error: 'Export failed' }

export function ExportModal({ open, onClose, resolution, setResolution, phase, progress, onExport, downloadUrl, onReset, error }: { open: boolean; onClose: () => void; resolution: Resolution; setResolution: (r: Resolution) => void; phase: ExportPhase; progress: number; onExport: () => void; downloadUrl: string | null; onReset: () => void; error: string | null }) {
  if (!open) return null
  const working = !['idle', 'done', 'error'].includes(phase)
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && !working && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
      {!working && <button className="modal-close" onClick={onClose}><X /></button>}
      {phase === 'idle' && <>
        <span className="eyebrow">FINAL STEP</span><h2 id="export-title">Export video</h2><p className="modal-lead">Choose a resolution. Your files never leave this device.</p>
        <fieldset><legend>Resolution</legend><div className="resolution-grid">{(['720p', '1080p'] as Resolution[]).map(r => <button className={resolution === r ? 'active' : ''} onClick={() => setResolution(r)} key={r}><b>{r}</b><span>{r === '1080p' ? '1920 × 1080' : '1280 × 720'}</span>{resolution === r && <Check />}</button>)}</div></fieldset>
        <div className="format-row"><span>Format</span><b>MP4 · H.264</b></div>
        <button className="button primary full" onClick={onExport}>Start export</button>
      </>}
      {working && <div className="export-state"><div className="processing-mark"><LoaderCircle className="spin" /></div><span className="eyebrow">EXPORTING LOCALLY</span><h2 id="export-title">Creating your video…</h2><p>{labels[phase]}</p><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><div className="progress-meta"><span>{labels[phase]}</span><b>{Math.round(progress)}%</b></div><small>Keep this tab open. Larger projects can take several minutes.</small></div>}
      {phase === 'done' && <div className="export-state"><div className="success-mark"><Check /></div><span className="eyebrow">EXPORT COMPLETE</span><h2 id="export-title">Your video is ready</h2><p>Everything was processed privately in your browser.</p><a className="button primary full" href={downloadUrl ?? '#'} download="my-video.mp4"><Download /> Download video</a><button className="button secondary full" onClick={onReset}>Create another video</button></div>}
      {phase === 'error' && <div className="export-state"><div className="error-mark"><X /></div><span className="eyebrow">SOMETHING WENT WRONG</span><h2 id="export-title">We couldn't export this video</h2><p>{error}</p><button className="button primary full" onClick={onExport}>Try again</button><button className="button ghost full" onClick={onClose}>Back to editor</button></div>}
    </div>
  </div>
}
