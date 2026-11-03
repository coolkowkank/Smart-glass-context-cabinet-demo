import { useEffect, useReducer, useRef, useState } from 'react'
import { openBus } from '../lib/bus'
import { MOMENTS } from '../config/moments'
import { reduceThread } from './thread'
import './chat.css'

// Window 3 - the main-app chat. Renders the glasses conversation word for word,
// at the same moment, from window 1's bus events (no backend, no reconstruction).
// dim captions are Lauri's voice (user bubble); everything else is the agent's.

export default function ChatApp() {
  const [thread, dispatch] = useReducer(reduceThread, [])
  const [m, setM] = useState(null)
  const [linked, setLinked] = useState(false)
  const endRef = useRef(null)
  const linkedRef = useRef(false)
  linkedRef.current = linked

  useEffect(() => {
    let alive = true
    const bus = openBus((ev) => {
      if (!alive) return
      if (ev.type === 'snapshot') { setLinked(true); setM(typeof ev.m === 'number' ? ev.m : null) }
      else if (ev.type === 'moment') setM(ev.m)
      else if (ev.type === 'reset') setM(null)
      dispatch(ev)
    })
    bus.post({ type: 'hello' })
    // Window 1 may open later: keep asking until a snapshot arrives. It also pushes one on load.
    const t = setInterval(() => { if (!linkedRef.current) bus.post({ type: 'hello' }) }, 2000)
    return () => { alive = false; clearInterval(t); bus.close() }
  }, [])
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [thread.length])

  const moment = m != null ? MOMENTS[m] : null
  return (
    <div className="chat">
      <header className="chat-head">
        <div>
          <h1>Nordea</h1>
          <p className="sub">Main app - chat with your Personal AI · concept demo, fictional data</p>
        </div>
        <span className={`link ${linked ? 'on' : ''}`}>{linked ? 'Linked to glasses' : 'Waiting for glasses window'}</span>
      </header>
      {moment && <div className="chat-moment">{moment.id} · {moment.name}</div>}
      <main className="chat-thread" aria-live="polite">
        {thread.length === 0 && (
          <p className="chat-empty">{linked ? 'The conversation will appear here as Lauri talks to the glasses.' : 'Open the glasses window (index) on the same address to start the story.'}</p>
        )}
        {thread.map((x) => (
          <div key={`${x.m}-${x.key}`} data-m={x.m} className={`row ${x.dim ? 'user' : 'agent'}`}>
            <div className="who">{x.dim ? 'Lauri' : 'Personal AI'}</div>
            <div className="bubble">{x.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </main>
      <footer className="chat-foot">Nordea wordmark only · all customer data fictional · staged demo, no real backend</footer>
    </div>
  )
}
