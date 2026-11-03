import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { Parts } from '../components/Overlays'
import { C, MOMENTS, UID, demoStateFor, fromBubble } from '../config/moments'
import { connect } from '../lib/api'
import { openBus } from '../lib/bus'
import { cardsFrom, kindIcon, sourceLabel, usedIds } from './model'
import './cabinet.css'

// Window 2 - the Context Cabinet as the audience sees it: one card per
// context entry, reorganising as the story moves. Cards the agent used
// for the current answer are pulled to the top and highlighted.
// Self-driven: the stepper walks the same MOMENTS storyboard as the
// glasses (window 1); live follow-along arrives with the sync batch.

function Card({ card }) {
  const archived = card.status === 'archived'
  return (
    <div className={`card ${card.used ? 'used' : ''} ${archived ? 'archived' : ''}`}>
      <div className="card-icon" style={{ color: card.source === 'customer' ? C.green : C.blue }}>
        <Icon name={kindIcon(card.kind)} size={20} />
      </div>
      <div className="card-body">
        <div className="card-title">{card.title}</div>
        {card.detail && <div className="card-detail">{card.detail}</div>}
        <div className="card-tags">
          <span className={`tag src-${card.source}`}>{sourceLabel(card.source)}</span>
          {card.status && card.status !== 'active' && <span className={`tag st-${card.status}`}>{card.status.replace('_', ' ')}</span>}
          {card.synced_via === 'personal_ai' && <span className="tag synced">synced via Personal AI</span>}
          {card.override_reason && <span className="tag overridden">overridden</span>}
          {card.used && <span className="tag inuse">used in this answer</span>}
        </div>
      </div>
    </div>
  )
}

// /cabinet.html?follow=1 opens in follow mode (mirrors window 1).
const initialFollow = () => new URLSearchParams(window.location.search).get('follow') === '1'

// Deep-link a moment for presenters: /cabinet.html?m=3 opens at the 4th.
const initialM = () => {
  const n = parseInt(new URLSearchParams(window.location.search).get('m') || '0', 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), MOMENTS.length - 1) : 0
}

export default function CabinetApp() {
  const [api, setApi] = useState(null)
  const [m, setM] = useState(initialM)
  const [cabinet, setCabinet] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [err, setErr] = useState(null)
  // Follow mode: render window 1's state from the bus instead of stepping on our own.
  const [follow, setFollow] = useState(initialFollow)
  const [linked, setLinked] = useState(false)
  const apiRef = useRef(null)
  apiRef.current = api

  useEffect(() => { connect().then(setApi).catch((e) => setErr(String(e))) }, [])

  const goto = async (i) => {
    const a = apiRef.current
    if (follow || !a || i < 0 || i >= MOMENTS.length) return
    const res = await a.demoState(UID, demoStateFor(i))
    setM(i)
    setCabinet(res.cabinet)
    setAnswer(res)
  }
  useEffect(() => { if (api && !follow) goto(initialM()) }, [api]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play: advance through the storyboard like the glasses story does.
  useEffect(() => {
    if (!playing || !api || follow) return
    const t = setTimeout(() => goto((m + 1) % MOMENTS.length), 6000)
    return () => clearTimeout(t)
  }, [playing, m, api, follow])

  // Follow mode: listen to window 1. hello asks for a snapshot; channel is closed on cleanup (StrictMode-safe).
  useEffect(() => {
    if (!follow) { setLinked(false); return undefined }
    const bus = openBus((ev) => {
      if (ev.type === 'snapshot' || ev.type === 'state') {
        if (typeof ev.m === 'number') setM(Math.min(Math.max(ev.m, 0), MOMENTS.length - 1))
        if (ev.cabinet) setCabinet(ev.cabinet)
        if (ev.answer) setAnswer(ev.answer)
        setLinked(true)
      } else if (ev.type === 'moment' && typeof ev.m === 'number') {
        setM(Math.min(Math.max(ev.m, 0), MOMENTS.length - 1))
      }
    })
    const ask = () => bus.post({ type: 'hello' })
    ask()
    const t = setInterval(() => { if (!linkedRef.current) ask() }, 2000)
    return () => { clearInterval(t); bus.close() }
  }, [follow])
  const linkedRef = useRef(false)
  linkedRef.current = linked

  const citations = usedIds(answer)
  const { cited, other, archived } = cardsFrom(cabinet, citations)
  const hero = fromBubble(answer?.whisper?.bubble)
  const caption = answer?.whisper?.caption
  const moment = MOMENTS[m]

  return (
    <div className="cab">
      <header className="cab-head">
        <div>
          <h1>Context Cabinet</h1>
          <p className="sub">Window 2 - what the agent can read · concept demo, fictional data</p>
        </div>
        <div className="stepper">
          <button className={`follow ${follow ? 'on' : ''}`} onClick={() => setFollow(!follow)} aria-pressed={follow}
            title="Mirror the glasses window">{follow ? (linked ? 'Following glasses' : 'Waiting for glasses') : 'Follow glasses'}</button>
          <button onClick={() => goto(m - 1)} disabled={follow || !api || m === 0} aria-label="Previous moment"><Icon name="left" size={18} /></button>
          <button onClick={() => goto(m + 1)} disabled={follow || !api || m === MOMENTS.length - 1} aria-label="Next moment"><Icon name="right" size={18} /></button>
          <button className={`play ${playing ? 'on' : ''}`} disabled={follow} onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
        </div>
      </header>

      <div className="moment-bar">
        <span className="m-id">{moment.id}</span>
        <span className="m-name">{moment.name}</span>
        <span className="m-count">{m + 1} / {MOMENTS.length}</span>
      </div>

      {err && <div className="notice warn">Offline agent failed to start: {err}</div>}
      {cabinet && !cabinet.context_on && (
        <div className="notice warn">Context is off - the agent cannot read the Cabinet in this moment.</div>
      )}

      {hero && (
        <div className="answer-bar">
          <div className="answer-hero" style={{ borderColor: hero.color }}>
            <Icon name={hero.icon || 'home'} size={22} />
            <div>
              <div className="a-title">{hero.title}{hero.sub ? <span className="a-sub"> · {hero.sub}</span> : null}</div>
              {caption && <div className="a-cap"><Parts parts={caption} /></div>}
            </div>
            {hero.badge && <span className="tag badge">{hero.badge}</span>}
          </div>
          <p className="a-note">The agent's answer right now - and below, exactly which cards it read.</p>
        </div>
      )}

      <main className="lists">
        {cited.length > 0 && (
          <section>
            <h2>Used in this answer</h2>
            {cited.map((c) => <Card key={c.id} card={c} />)}
          </section>
        )}
        <section>
          <h2>{cited.length ? 'Also in the Cabinet' : 'In the Cabinet'}</h2>
          {other.length ? other.map((c) => <Card key={c.id} card={c} />) : <p className="empty">No other live cards.</p>}
        </section>
        {archived.length > 0 && (
          <section>
            <h2>Archived</h2>
            {archived.map((c) => <Card key={c.id} card={c} />)}
          </section>
        )}
      </main>

      <footer className="cab-foot">Nordea wordmark only · all customer data fictional · staged demo, no real backend</footer>
    </div>
  )
}
