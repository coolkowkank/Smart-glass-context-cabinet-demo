import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { C, CONFIG, partColor } from '../config/moments'
import { SCENE, projectPoint } from '../config/scene'
import { reduceMotion } from './Hero'
import Icon from './Icon'

export const Parts = ({ parts }) =>
  parts.map((p, i) => <span key={i} style={partColor(p) ? { color: partColor(p) } : null}>{p.text}</span>)

// Small neon voice icons, transparent background. Arcs pulse while active.
const NEON_GREEN = '#3DF26E'
export function VoiceIcon({ kind, active }) {
  const arc = (d, i) => <path key={d} className={`arc a${i}`} d={d} />
  return (
    <svg className={`vicon ${kind} ${active ? 'active' : ''}`} width="44" height="34" viewBox="0 0 44 34" aria-hidden="true"
      style={{ color: kind === 'mic' ? NEON_GREEN : C.cyan }}>
      {kind === 'mic' ? (
        <>
          <rect x="17.5" y="4" width="9" height="16" rx="4.5" fill="currentColor" />
          <path d="M19.5 8.5h5 M19.5 11.5h5 M19.5 14.5h5" stroke="rgba(0,0,0,.55)" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M13.5 15a8.5 8.5 0 0 0 17 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M22 23.5v4.5 M17.5 29.5h9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          {['M9.5 9.5a11 11 0 0 0 0 13', 'M5 6a16 16 0 0 0 0 20', 'M34.5 9.5a11 11 0 0 1 0 13', 'M39 6a16 16 0 0 1 0 20'].map((d, i) => arc(d, (i % 2) + 1))}
        </>
      ) : (
        <>
          <path d="M8 12.5h5l7.5-6v21l-7.5-6H8z" fill="currentColor" />
          {['M25 13a5 5 0 0 1 0 8', 'M29 9.5a10 10 0 0 1 0 15', 'M33 6a15 15 0 0 1 0 22'].map((d, i) => arc(d, i + 1))}
        </>
      )}
    </svg>
  )
}

// Subtitles: a small mic icon when Lauri speaks (the glasses always listen),
// a small speaker icon when the agent answers out loud. Text types on with a cursor.
export function Caption({ cap, hidden }) {
  const total = cap.parts.reduce((n, p) => n + p.text.length, 0)
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    let raf
    let start
    const tick = () => {
      const k = reduceMotion() ? total : Math.min(total, Math.floor(((performance.now() - start) * CONFIG.typeCps) / 1000))
      setN(k)
      if (k < total) raf = requestAnimationFrame(tick)
    }
    const t = setTimeout(() => { start = performance.now(); tick() }, CONFIG.crossfadeMs * 0.6)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [cap.key, total])
  let left = n
  const out = cap.parts.map((p, i) => {
    const sl = p.text.slice(0, Math.max(0, left))
    left -= p.text.length
    const c = partColor(p)
    return sl ? <span key={i} style={c ? { color: c } : null}>{sl}</span> : null
  })
  const listening = cap.dim && total === 0
  return (
    <div className={`caption ${hidden ? 'hide' : ''}`}>
      <div key={cap.key} className={`subtitle ${cap.dim ? 'voice' : 'agent'}`} aria-label={cap.parts.map((p) => p.text).join('')}>
        <VoiceIcon kind={cap.dim ? 'mic' : 'speaker'} active={listening || n < total} />
        <span className="cap-text">
          {listening ? <span className="listening">Listening</span> : out}
          <span className="cursor">▌</span>
        </span>
      </div>
    </div>
  )
}

// M7: a light line sweeps the view, small Nordea labels pop on objects, then collapse.
export function Scan({ phase, signals, vp }) {
  if (!phase || phase === 'done') return null
  return (
    <div className={`scan ${phase}`}>
      {phase === 'sweep' && <div className="sweep" />}
      {signals.map((s, i) => {
        const a = SCENE.signals[s.kind] || { x: 0.3 + i * 0.2, y: 0.3, delay: 300 + i * 450 }
        const p = projectPoint(a, vp)
        const x = Math.max(80, Math.min(p.x, vp.W - 80))
        return (
          <div key={s.id} className="tiny" style={{ left: x, top: p.y, '--dx': `${80 - x}px`, '--dy': `${40 - p.y}px`, transitionDelay: `${i * 80}ms` }}>
            <div className="tiny-in" style={{ animationDelay: `${a.delay}ms` }}><Icon name="pin" size={16} sw={2.2} />{s.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// Restaurant: one small marker per menu item, just right of its price.
// Green check = fits the plan; amber = over budget, with how much.
// Markers pop in top to bottom, and again when the rating changes.
export function MenuMarks({ rating, scene, vp, hidden }) {
  if (!rating?.known || !rating.items?.length) return null
  return (
    <div className={`marks ${hidden ? 'hide' : ''}`} aria-label={`${rating.over_count} items over budget`}>
      {rating.items.map((it) => {
        const a = scene.marks[it.id]
        if (!a) return null
        const p = projectPoint(a, vp, scene)
        if (p.x < 24 || p.x > vp.W - 24 || p.y < 24 || p.y > vp.H - 24) return null
        return (
          <div key={`${it.id}-${it.fits}`} className={`mark ${it.fits ? 'ok' : 'over'}`}
            style={{ left: p.x, top: p.y, animationDelay: `${Math.round(a.y * 900)}ms` }}
            title={`${it.name}: €${it.price.toFixed(2)}${it.fits ? ', fits' : `, €${it.over.toFixed(2)} over`}`}>
            <span className="mdot">{it.fits ? <Icon name="check" size={12} sw={3.2} /> : '!'}</span>
            {!it.fits && <span className="mtag">+€{it.over.toFixed(2)}</span>}
          </div>
        )
      })}
    </div>
  )
}

// Archived goal shrinks and flies into the vault.
export function Flyer({ fly }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    const v = document.getElementById('vault')
    if (!el || !v || !el.animate) return
    const vr = v.getBoundingClientRect()
    const r = fly.rect
    const tx = vr.left + vr.width / 2 - (r.left + r.width / 2)
    const ty = vr.top + vr.height / 2 - (r.top + r.height / 2)
    el.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${tx * 0.35}px,${ty * 0.55 - 30}px) scale(.55)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${tx}px,${ty}px) scale(.05)`, opacity: 0.3 },
      ],
      { duration: CONFIG.flyMs, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' },
    )
  }, [fly])
  const r = fly.rect
  return (
    <div ref={ref} className="flyer" style={{ left: r.left, top: r.top, width: r.width, height: r.height, '--c': fly.color }}>
      <span className="card-ic"><Icon name="clock" size={22} /></span>
      <span className="card-title">{fly.title}</span>
    </div>
  )
}

// The audit "X-ray": scene dims, three glass cards appear one at a time.
export function XRay({ lines, onClose }) {
  const isWarn = (l) => l.some((p) => p.tone === 'warn')
  const look = (l, i) =>
    i === 0 ? { icon: 'eye', color: C.cyan } : i === 1 ? { icon: 'bank', color: C.blue } : isWarn(l) ? { icon: 'alert', color: C.amber } : { icon: 'check', color: C.green }
  return (
    <div className="xray" onClick={onClose} role="dialog" aria-label="Why Nordea thinks this">
      <div className="xin">
        <div className="xkicker">Why Nordea thinks this</div>
        {lines.map((l, i) => {
          const { icon, color } = look(l, i)
          return (
            <div key={i} className="xcard" style={{ '--c': color, animationDelay: `${250 + i * CONFIG.xrayGapMs}ms` }}>
              <span className="card-ic"><Icon name={icon} size={20} /></span>
              <p><Parts parts={l} /></p>
            </div>
          )
        })}
        <div className="xhint" style={{ animationDelay: `${250 + lines.length * CONFIG.xrayGapMs}ms` }}>Tap anywhere to close</div>
      </div>
    </div>
  )
}
