import { useRef, useState } from 'react'
import { Film, LoaderCircle, Upload } from 'lucide-react'

interface Props { onFiles: (files: File[]) => void; loading: boolean; compact?: boolean; onDemo?: () => void }

export function VideoUploader({ onFiles, loading, compact, onDemo }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const receive = (list: FileList | null) => list?.length && onFiles(Array.from(list))
  if (compact) return <>
    <input ref={input} hidden type="file" multiple accept="video/mp4,video/quicktime,video/webm,.mov" onChange={e => receive(e.target.files)} />
    <button className="button secondary" onClick={() => input.current?.click()} disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <Upload />} Add videos</button>
  </>
  return <div className={`empty-uploader ${dragging ? 'dragging' : ''}`} onDragEnter={e => { e.preventDefault(); setDragging(true) }} onDragOver={e => e.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); receive(e.dataTransfer.files) }}>
    <input ref={input} hidden type="file" multiple accept="video/mp4,video/quicktime,video/webm,.mov" onChange={e => receive(e.target.files)} />
    <div className="upload-icon"><Film /></div>
    <h1>Create your video</h1>
    <p>Upload your clips, arrange them, add transitions and music, then export one finished video.</p>
    <button className="button primary large" onClick={() => input.current?.click()} disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <Upload />} {loading ? 'Reading videos…' : 'Upload videos'}</button>
    <span>or drag & drop MP4, MOV, or WebM files here</span>
    {onDemo && <button className="text-button" onClick={onDemo} disabled={loading}>Load demo project</button>}
  </div>
}
