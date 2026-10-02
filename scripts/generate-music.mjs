import fs from 'node:fs'
import path from 'node:path'

const out = path.resolve('public/music')
fs.mkdirSync(out, { recursive: true })
const rate = 22050, duration = 16, count = rate * duration

function write(name, make) {
  const pcm = Buffer.alloc(count * 2)
  for (let i = 0; i < count; i++) {
    const t = i / rate
    const edge = Math.min(1, t / .6, (duration - t) / .8)
    const value = Math.max(-1, Math.min(1, make(t) * edge))
    pcm.writeInt16LE(Math.round(value * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8)
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34)
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40)
  fs.writeFileSync(path.join(out, `${name}.wav`), Buffer.concat([header, pcm]))
}

const tone = (f, t) => Math.sin(2 * Math.PI * f * t)
write('calm', t => .18 * tone(220, t) + .12 * tone(277.18, t) + .09 * tone(329.63, t) + .05 * tone(110, t) * Math.sin(Math.PI * t / 2))
write('positive', t => { const notes = [261.63,329.63,392,523.25]; const f = notes[Math.floor(t * 2) % notes.length]; return .19 * tone(f, t) * Math.pow(Math.max(0, 1 - (t * 2 % 1)), 1.5) + .06 * tone(130.81, t) })
write('cinematic', t => .16 * tone(82.41, t) + .1 * tone(123.47, t) + .07 * tone(164.81, t) + ((t % 2) < .12 ? .13 * Math.sin(2 * Math.PI * 48 * t) * (1 - (t % 2) / .12) : 0))
