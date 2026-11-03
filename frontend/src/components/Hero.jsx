import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { project } from '../config/scene'
import Icon from './Icon'

export const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const LEAD = 34 // gap between the card and the point it's pinned to

// The single AR card: frosted glass, glowing edge in the state colour,
// pinned to a point in the scene by a thin leader line.
export default function Hero({ hero, hidden, vp, scene, onAct, bubbleRef }) {
  const last = useRef(hero)
  if (hero) last.current = hero
  const shown = last.current
  const visible = !!hero && !hidden
  const [box, setBox] = useState({ w: 260, h: 80 })
  const stackRef = useRef(null)
  const [instant, setInstant] = useState(true)
  const wasVisible = useRef(false)

  useLayoutEffect(() => {
    // Measure the whole stack (card + chips) so the leader starts below it.
    const el = stackRef.current
    if (el && (el.offsetWidth !== box.w || el.offsetHeight !== box.h)) setBox({ w: el.offsetWidth, h: el.offsetHeight })
  })
  useLayoutEffect(() => {
    if (visible && !wasVisible.current) {
      wasVisible.current = true
      setInstant(true)
      let id2
      const id = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setInstant(false)) })
      return () => { cancelAnimationFrame(id); cancelAnimationFrame(id2) }
    }
    if (!visible) wasVisible.current = false
  }, [visible])
  useEffect(() => {
    setInstant(true)
    const id = requestAnimationFrame(() => setInstant(false))
    return () => cancelAnimationFrame(id)
  }, [vp.W, vp.H])

  const sig = shown ? shown.title + (shown.sub || '') + shown.anchor : ''
  useEffect(() => {
    const el = bubbleRef.current
    if (el && visible && !reduceMotion() && el.animate)
      el.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1.04)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' })
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null
  const raw = project(shown.anchor, vp, scene)
  const ax = Math.max(44, Math.min(vp.W - 44, raw.x))
  const ay = Math.max(150, Math.min(vp.H - 190, raw.y))
  const M = 24
  const left = Math.max(M, Math.min(ax - box.w / 2, vp.W - box.w - M))
  const top = Math.max(70, ay - box.h - LEAD)
  const leadTop = top + box.h
  const leadLen = Math.max(0, ay - leadTop - 4)
  const chips = shown.chips || []
  const vars = { '--c': shown.color, '--ring': shown.ring || 'transparent' }

  return (
    <>
      <div className={`hero ${visible ? 'on' : ''} ${instant ? 'instant' : ''}`} style={{ transform: `translate3d(${left}px,${top}px,0)` }} aria-live="polite">
        <div className="appear">
          <div className="float">
            {shown.tag && <div className="tag">{shown.tag}</div>}
            <div ref={stackRef} className="stack">
              <div ref={bubbleRef} className="card" style={vars}>
                {shown.icon && <div className="card-ico"><Icon name={shown.icon} size={24} /></div>}
                <div className="card-text">
                  <div className="card-title">{shown.title}</div>
                  {shown.sub && <div className="card-sub">{shown.sub}</div>}
                  {shown.badge && <div className="card-badge"><Icon name="down" size={16} sw={2.4} />Loan estimate reduced</div>}
                </div>
              </div>
              {chips.length > 0 && (
                <div className="chips" style={{ pointerEvents: visible ? 'auto' : 'none' }}>
                  {chips.map((c) => (
                    <button key={c.label} className={`chip ${c.primary ? 'primary' : ''}`} onClick={(e) => { e.stopPropagation(); onAct(c.act, c.arg) }}>
                      {c.icon && <Icon name={c.icon} size={15} sw={2.2} />}{c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={`leader ${instant ? 'instant' : ''}`}
        style={{ ...vars, height: leadLen, transform: `translate3d(${ax}px,${leadTop}px,0)`, opacity: visible && leadLen > 6 ? 0.9 : 0 }} />
      <div className={`pin ${instant ? 'instant' : ''}`} style={{ ...vars, transform: `translate3d(${ax}px,${ay}px,0)`, opacity: visible ? 1 : 0 }} />
    </>
  )
}
