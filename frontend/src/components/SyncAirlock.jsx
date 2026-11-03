// Personal AI sync: the Zero-Trust "airlock", shown inside the Context Cabinet.
//
// The proposals sit in a deck of cards at the bottom of the screen, stacked like books
// seen from above, while the Cabinet's orbit stays visible behind. Only ONE layer shows
// at a time: the handshake, the deck, a card's "Why?", or the safeguards. Closing a
// pop-up returns to the deck on the same card. Nothing is saved until "Approve & sync".
import { useEffect, useRef, useState } from 'react'
import { C } from '../config/moments'
import Icon from './Icon'

const HANDSHAKE_STEP_MS = 420
const SOURCE_ICON = { calendar: 'calendar', notes: 'note', chat: 'chat', files: 'note', nordea: 'bank' }
const sideColor = (p) => (p.side === 'nordea' ? C.blue : C.green)

// How much room the airlock takes at the bottom; the orbit shrinks above it.
export const deckSpace = (W) => (W < 640 ? 404 : 346)

// existingIds: entries already in the Cabinet. A goal Lauri typed by hand is "completed"
// by the Personal AI rather than added, so its card reads differently (when_exists).
export default function SyncAirlock({ sync, onToggle, onIndex, onPopup, onApprove, onClose, existingIds = new Set() }) {
  const staging = sync.staging
  const proposals = (staging?.proposals || []).map((p) => (p.when_exists && existingIds.has(p.target_entry_id) ? { ...p, ...p.when_exists } : p))
  const n = proposals.length
  const index = Math.min(sync.index || 0, Math.max(0, n - 1))
  const selected = new Set(sync.selected)
  const current = proposals[index]

  return (
    <div className="airlock" role="dialog" aria-label="Sync with your Personal AI">
      {sync.phase === 'handshake' && <Handshake steps={staging?.handshake} onClose={onClose} />}
      {sync.phase === 'review' && !sync.popup && (
        <Deck proposals={proposals} index={index} selected={selected} staging={staging}
          onToggle={onToggle} onIndex={onIndex} onPopup={onPopup} onApprove={onApprove} onClose={onClose} />
      )}
      {sync.phase === 'review' && sync.popup?.type === 'why' && current && (
        <WhyCard proposal={proposals.find((p) => p.id === sync.popup.id) || current} onBack={() => onPopup(null)} />
      )}
      {sync.phase === 'review' && sync.popup?.type === 'safeguards' && (
        <Safeguards staging={staging} onBack={() => onPopup(null)} />
      )}
    </div>
  )
}

function Shell({ children, className = '', label }) {
  return <section className={`al-shell ${className}`} aria-label={label}>{children}</section>
}

function Handshake({ steps = ['Face ID verified', 'Context request sent', 'Proposals extracted on-device'], onClose }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => s + 1), HANDSHAKE_STEP_MS)
    return () => clearInterval(t)
  }, [])
  return (
    <Shell className="handshake" label="Connecting to your Personal AI">
      <header className="al-top">
        <span className="al-who"><Icon name="sparkle" size={16} sw={2} />Connecting to your Personal AI</span>
        <button className="al-x" aria-label="Cancel sync" onClick={onClose}><Icon name="close" size={16} /></button>
      </header>
      <ol className="al-steps">
        {steps.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
            <span className="al-tick">{i < step ? <Icon name="check" size={12} sw={3.2} /> : <span className="spin" />}</span>{s}
          </li>
        ))}
      </ol>
    </Shell>
  )
}

function Deck({ proposals, index, selected, staging, onToggle, onIndex, onPopup, onApprove, onClose }) {
  const n = proposals.length
  const drag = useRef(null)
  const [dx, setDx] = useState(0)
  const breaks = (staging.filtered_out?.length || 0) + (staging.reality_checks?.length || 0)
  const go = (i) => onIndex(Math.max(0, Math.min(n - 1, i)))

  const down = (e) => { if (e.target.closest('button')) return; drag.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId) }
  const move = (e) => { if (drag.current != null) setDx(e.clientX - drag.current) }
  const up = () => {
    if (drag.current == null) return
    drag.current = null
    if (dx < -60) go(index + 1)
    else if (dx > 60) go(index - 1)
    setDx(0)
  }

  // The deck in stack order: the current card on top, the rest behind it in sequence.
  const order = proposals.map((_, k) => (index + k) % n)

  return (
    <Shell className="deck" label="Proposals from your Personal AI">
      <header className="al-top">
        <span className="al-who"><Icon name="sparkle" size={16} sw={2} />{staging.agent_name}<em>{n} updates</em></span>
        <span className="al-top-r">
          <button className="pill" onClick={() => onPopup({ type: 'safeguards' })}><Icon name="alert" size={14} sw={2.2} />Safeguards {breaks}</button>
          <button className="al-x" aria-label="Cancel sync" onClick={onClose}><Icon name="close" size={16} /></button>
        </span>
      </header>

      <div className="stack" style={{ '--depth': Math.min(n - 1, 3) }}>
        {order.map((pi, k) => {
          const p = proposals[pi]
          const on = selected.has(p.id)
          const front = k === 0
          if (k > 3) return null
          return (
            <article key={p.id} className={`dcard ${front ? 'front' : ''} ${on ? 'on' : 'off'} ${p.side}`}
              style={{ '--c': sideColor(p), '--k': k, zIndex: 10 - k, ...(front && dx ? { transform: `translateX(${dx}px) rotate(${dx / 40}deg)`, transition: 'none' } : null) }}
              aria-hidden={!front}
              onPointerDown={front ? down : undefined} onPointerMove={front ? move : undefined} onPointerUp={front ? up : undefined} onPointerCancel={front ? up : undefined}>
              <div className="dc-row">
                <span className="dc-badge">{p.source_badge}</span>
                {front && (
                  <button className={`dc-toggle ${on ? 'on' : ''}`} onClick={() => onToggle(p.id)} aria-pressed={on}>
                    {on ? <><Icon name="check" size={13} sw={3} />Included</> : 'Skipped'}
                  </button>
                )}
              </div>
              {front && (
                <>
                  <h4>{p.title}</h4>
                  <p className="dc-sum">{p.summary}</p>
                  <p className="dc-impact"><Icon name="right" size={14} sw={2.6} />{p.impact}</p>
                  <div className="dc-foot">
                    <button className="pill" onClick={() => onPopup({ type: 'why', id: p.id })}>Why?</button>
                    <span className="dc-nav">
                      <button aria-label="Previous card" onClick={() => go(index - 1)} disabled={index === 0}><Icon name="left" size={16} /></button>
                      <span className="dc-count">{index + 1} / {n}</span>
                      <button aria-label="Next card" onClick={() => go(index + 1)} disabled={index === n - 1}><Icon name="right" size={16} /></button>
                    </span>
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>

      <footer className="al-foot">
        <span className="al-privacy"><Icon name="vault" size={14} sw={2} />Raw chats, calendar and notes stay on your device</span>
        <span className="al-actions">
          <button className="chip" onClick={onClose}>Cancel</button>
          <button className="chip primary" disabled={selected.size === 0} onClick={() => onApprove([...selected])}>Approve &amp; sync ({selected.size})</button>
        </span>
      </footer>
    </Shell>
  )
}

function WhyCard({ proposal: p, onBack }) {
  return (
    <Shell className="why" label={`Why: ${p.title}`}>
      <header className="al-top">
        <span className="al-who" style={{ color: sideColor(p) }}><Icon name="question" size={16} sw={2.2} />Why this card?</span>
        <button className="al-x" aria-label="Back to the cards" onClick={onBack}><Icon name="close" size={16} /></button>
      </header>
      <h4>{p.title}</h4>
      <p className="why-reason">{p.why?.reason}</p>
      <div className="why-cited">
        <span className="why-label">Cited from</span>
        {(p.why?.cited || []).map((c) => (
          <div key={c.label + c.detail} className={`cite ${c.source === 'nordea' ? 'nordea' : 'mine'}`}>
            <Icon name={SOURCE_ICON[c.source] || 'note'} size={15} sw={2} />
            <b>{c.label}</b><span>{c.detail}</span>
          </div>
        ))}
      </div>
      <button className="chip back" onClick={onBack}><Icon name="left" size={14} sw={2.4} />Back to cards</button>
    </Shell>
  )
}

function Safeguards({ staging, onBack }) {
  return (
    <Shell className="why" label="Where the model breaks">
      <header className="al-top">
        <span className="al-who" style={{ color: '#FCD34D' }}><Icon name="alert" size={16} sw={2.2} />Where the model breaks</span>
        <button className="al-x" aria-label="Back to the cards" onClick={onBack}><Icon name="close" size={16} /></button>
      </header>
      <div className="guards">
        {(staging.filtered_out || []).map((f) => (
          <div key={f.id} className="guard blocked">
            <b>Blocked · {f.category}</b>
            <span className="q">{f.raw_snippet}</span>
            <span>{f.reason_blocked}</span>
          </div>
        ))}
        {(staging.reality_checks || []).map((r) => (
          <div key={r.id} className="guard check">
            <b><Icon name="clock" size={13} sw={2.2} /> {r.category}</b>
            <span>{r.rule}</span>
          </div>
        ))}
      </div>
      <button className="chip back" onClick={onBack}><Icon name="left" size={14} sw={2.4} />Back to cards</button>
    </Shell>
  )
}
