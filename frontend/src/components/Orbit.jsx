import { useEffect, useMemo, useRef, useState } from 'react'
import { C, TONE } from '../config/moments'
import { flungPosition, geometry, inTray, layout } from '../lib/orbit'
import syncPayload from '../../../shared/personal_agent_sync.json'
import Icon from './Icon'

const REALITY_CHECK = syncPayload.reality_checks?.[0]

const SIDE_COLOR = { left: C.green, right: C.blue }
const RUST = '#E38B4F'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthYear = (iso) => (iso ? `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : '')

// A gently curved tether from the core to a memory.
function tetherPath(cx, cy, x, y) {
  const mx = (cx + x) / 2
  const my = (cy + y) / 2
  const dx = x - cx
  const dy = y - cy
  const bend = 0.12 * (x < cx ? -1 : 1)
  return `M${cx},${cy} Q${mx - dy * bend},${my + dx * bend} ${x},${y}`
}

function stateLine(e, reading) {
  const synced = e.synced_via === 'personal_ai'
  const own = e.source === 'customer'
    ? (synced ? 'Declared by you · synced via Personal AI' : 'Declared by you')
    : (synced ? 'Inferred by Nordea · verified via Personal AI' : 'Inferred by Nordea')
  const state =
    e.status === 'archived' ? 'In the archive'
      : e.status === 'stale' ? `Idle since ${monthYear(e.created)}, drifting out`
        : e.override_reason ? `Corrected by you: ${e.override_reason}`
          : e.status === 'needs_review' ? 'Needs your review'
            : 'Active'
  const check = e.override_reason && REALITY_CHECK?.applies_to === e.id
    ? `Reality check: asks again if spending stays high for ${REALITY_CHECK.after_days} days` : null
  return { own, state, check, reading: reading ? 'The agent is reading this now' : null }
}

// The Context Cabinet as "Lauri's Active Agent Brain".
//   Distance from the core = relevance. Left = declared by Lauri, right = inferred by Nordea.
//   Desync flings every orb away (the Cabinet empties); a sync snaps them back, with tethers.
// airlock: the Personal AI sync is open. The orbit then shrinks above the card deck, the
// memory the current card is about is highlighted (focusId), and goals that only exist in
// the Personal AI so far are shown as dashed "ghost" orbs where they would land.
export default function Orbit({ open, onClose, cabinet, answer, magnetOn, act, vp, settings, airlock = null, focusId = null, ghosts = [], syncPending = 0, bottomSpace = 0, syncHint = null }) {
  const deck = bottomSpace
  const g = useMemo(() => geometry(vp.W, vp.H, { deck }), [vp.W, vp.H, deck])
  const entries = cabinet?.entries
  const [fontsReady, setFontsReady] = useState(0)
  useEffect(() => { document.fonts?.ready.then(() => setFontsReady((n) => n + 1)) }, [])
  const measure = useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
    return (label, px) => { ctx.font = `600 ${px}px ${family}`; return ctx.measureText(label).width }
  }, [fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps
  const ghostKey = ghosts.map((x) => x.id).join(',')
  const items = useMemo(() => layout([...(entries || []), ...ghosts], g, measure), [entries, g, measure, ghostKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const citations = useMemo(
    // Before sync the agent reads the old car goal (and the salary): show that, it's the failure.
    // A hand-typed flat goal with no target: the generic answer reads the goal and Nordea's savings.
    () => new Set(!magnetOn ? [] : answer?.readiness?.known ? answer.readiness.citations : answer?.anchored ? [answer.anchored.goal_id, 'salary']
      : answer?.partial ? [answer.partial.goal_id, 'asp'] : []),
    [magnetOn, answer],
  )
  const [pop, setPop] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [hotTray, setHotTray] = useState(false)

  const els = useRef({})
  const tethers = useRef({})
  const phys = useRef({})
  const drag = useRef(null)
  const hot = useRef(false)
  const live = useRef({ items, g, magnetOn })
  live.current = { items, g, magnetOn }

  // Physics loop: each orb springs toward its slot (connected), away from the
  // core (desyncing), or into the archive tray. Writes straight to the DOM.
  useEffect(() => {
    if (!open) return undefined
    const { g: g0 } = live.current
    for (const it of live.current.items) phys.current[it.id] = { x: g0.cx, y: g0.cy, vx: 0, vy: 0 }
    const t0 = performance.now()
    let raf
    const step = (now) => {
      const t = now - t0
      const { items: list, g: gg, magnetOn: on } = live.current
      for (const it of list) {
        let p = phys.current[it.id]
        if (!p) p = phys.current[it.id] = { x: gg.cx, y: gg.cy, vx: 0, vy: 0 }
        const d = drag.current
        if (d && d.id === it.id && d.moved) {
          p.x = d.x; p.y = d.y; p.vx = 0; p.vy = 0
        } else {
          let tx = it.x
          let ty = it.y
          if (it.ring !== 'archive') {
            if (on) { tx += Math.cos(t / 2600 + it.phase) * 5; ty += Math.sin(t / 1400 + it.phase) * 4 }
            else ({ x: tx, y: ty } = flungPosition(it, gg))
          }
          const k = on || it.ring === 'archive' ? 0.075 : 0.045
          const damp = on ? 0.7 : 0.8 // settling: barely overshoots, so edge orbs never swing off-screen
          p.vx = (p.vx + (tx - p.x) * k) * damp
          p.vy = (p.vy + (ty - p.y) * k) * damp
          p.x += p.vx
          p.y += p.vy
        }
        const el = els.current[it.id]
        if (el) el.style.transform = `translate3d(${p.x - it.size.w / 2}px,${p.y - it.size.h / 2}px,0)`
        const ln = tethers.current[it.id]
        if (ln) ln.setAttribute('d', tetherPath(gg.cx, gg.cy, p.x, p.y))
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => { if (!open) setPop(null) }, [open])

  const onDown = (e, it) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = phys.current[it.id] || { x: it.x, y: it.y }
    drag.current = { id: it.id, x: p.x, y: p.y, ox: e.clientX - p.x, oy: e.clientY - p.y, sx: e.clientX, sy: e.clientY, moved: false }
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) { d.moved = true; setDragId(d.id); setPop(null) }
    if (!d.moved) return
    d.x = e.clientX - d.ox
    d.y = e.clientY - d.oy
    const over = inTray(d, live.current.g)
    if (over !== hot.current) { hot.current = over; setHotTray(over) }
  }
  const onUp = (it) => {
    const d = drag.current
    drag.current = null
    setDragId(null)
    hot.current = false
    setHotTray(false)
    if (!d) return
    if (!d.moved) {
      const p = phys.current[it.id] || it
      setPop((cur) => (cur?.id === it.id ? null : { id: it.id, x: p.x, y: p.y }))
      return
    }
    const over = inTray(d, live.current.g)
    if (over && it.ring !== 'archive') act('archiveQuiet', it.id)
    else if (!over && it.ring === 'archive') act('restore', it.id)
  }
  const onKey = (e, it) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const p = phys.current[it.id] || it
      setPop((cur) => (cur?.id === it.id ? null : { id: it.id, x: p.x, y: p.y }))
    }
  }

  const reading = items.filter((it) => it.ring !== 'archive' && citations.has(it.id)).length
  const archivedCount = items.filter((it) => it.ring === 'archive').length
  const onOrbit = magnetOn ? items.filter((it) => it.ring !== 'archive') : []
  const legend = {
    declared: onOrbit.some((it) => it.side === 'left' && it.ring !== 2 && !it.entry.ghost),
    rusty: onOrbit.some((it) => it.ring === 2),
    proposed: onOrbit.some((it) => it.entry.ghost),
    inferred: onOrbit.some((it) => it.side === 'right'),
  }
  // Cabinet health: stale goals and unexplained Nordea signals waiting for Lauri.
  const toReview = (entries || []).filter((e) => e.status === 'stale' || (e.status === 'needs_review' && !e.override_reason)).length
  const health = !toReview ? 'All reviewed' : g.compact ? `${toReview} to review` : `${toReview} ${toReview === 1 ? 'item needs' : 'items need'} review`
  const bubble = answer?.whisper?.bubble
  const popItem = pop && items.find((it) => it.id === pop.id)
  const wide = !g.compact && vp.W >= 900


  return (
    <div className={`orbit ${open ? 'on' : ''}`} aria-hidden={!open} role="dialog" aria-label="Context Cabinet: Lauri's Active Agent Brain"
      onPointerMove={onMove} onPointerDown={(e) => { if (e.target === e.currentTarget) setPop(null) }}>
      <svg className="field" aria-hidden="true">
        <line className="hemi" x1={g.cx} y1={96} x2={g.cx} y2={g.tray.y - 80} />
        {/* No drawn orbit rings: distance from the core still means relevance, and the
            legend (shown only for kinds present) explains the colours. */}
        {items.filter((it) => it.ring !== 'archive' && citations.has(it.id)).map((it) => {
          const color = it.ring === 2 ? '#E38B4F' : SIDE_COLOR[it.side]
          return (
            <path key={it.id} ref={(el) => { if (el) tethers.current[it.id] = el; else delete tethers.current[it.id] }}
              className="tether" stroke={color} style={{ color }} d={tetherPath(g.cx, g.cy, it.x, it.y)} />
          )
        })}
      </svg>

      <div className={`core ${magnetOn ? '' : 'off'}`} style={{ left: g.cx, top: g.cy, width: g.coreR * 2, height: g.coreR * 2 }} />
      <div className={`core-label ${deck ? 'away' : ''}`} style={{ left: g.cx, top: g.cy + g.coreR + 20 }}>
        <b>Lauri’s Active Agent Brain</b>
        <span>{magnetOn ? `Reading ${reading} ${reading === 1 ? 'memory' : 'memories'}` : 'Disconnecting…'}</span>
        {bubble && (
          <div className="core-answer" style={{ '--c': TONE[bubble.tone] }}>{bubble.title}</div>
        )}
      </div>

      <div className="otop">
        <div className="otitle">
          {g.compact ? 'Cabinet' : 'Context Cabinet'}
          <small>{g.compact ? '' : `${settings.mode === 'live' ? `Live agent · LLM: ${settings.llm}` : 'Offline demo'} · `}{health}</small>
        </div>
        <div className="flex items-center gap-2">
          <button className="osw glass-pill" onClick={settings.onAdd} title="Add context yourself" aria-label="Add context yourself">
            <Icon name="plus" size={18} sw={2.2} /><span className="hidden sm:inline">Add</span>
          </button>
          {/* One pill that flips: Sync AI ↔ Desync AI */}
          <button className={`osw glass-pill ${settings.synced ? 'desync' : 'sync'} ${syncPending || (syncHint === 'sync' && !settings.synced) || (syncHint === 'desync' && settings.synced) ? 'pending' : ''} ${airlock ? 'active' : ''}`}
            onClick={settings.synced ? settings.onDesync : settings.onOpenSync} aria-pressed={!!settings.synced}
            title={settings.synced ? 'Disconnect your Personal AI and empty the Cabinet' : 'Sync with your Personal AI'}>
            <Icon name="sparkle" size={18} sw={2} /><span>{settings.synced ? 'Desync AI' : 'Sync AI'}</span>
            {syncPending > 0 && !airlock && <span className="osw-badge">{syncPending}</span>}
          </button>
          {!g.compact && (
            <>
              <button className="osw glass-pill" aria-pressed={settings.camera} onClick={settings.toggleCamera} title="Use camera">
                <Icon name="camera" size={18} sw={2} /><span className="hidden sm:inline">Camera</span>
              </button>
              <button className="osw glass-pill" aria-pressed={settings.realMic} onClick={settings.toggleRealMic} title="Listen with the real microphone">
                <Icon name="mic" size={18} sw={2} /><span className="hidden sm:inline">Live mic</span>
              </button>
            </>
          )}
          {!g.compact && (
            <button className="osw glass-pill" aria-pressed={settings.voiceOut} onClick={settings.toggleVoiceOut} title="Agent speaks its answers">
              <Icon name="speaker" size={18} sw={2} /><span className="hidden sm:inline">Voice</span>
            </button>
          )}
          <button className="oclose glass-pill" aria-label="Close Cabinet" onClick={onClose}><Icon name="close" size={20} /></button>
        </div>
      </div>
      {/* Legend: only for the kinds of memory that are in the Cabinet right now. */}
      <div className="legend l">
        {legend.declared && <span className="hemi-label"><span className="dot" style={{ background: C.green, boxShadow: `0 0 10px ${C.green}` }} />{g.compact ? 'Declared' : 'Declared by you'}</span>}
        {legend.rusty && <span className="hemi-label rusty"><span className="dot" style={{ background: RUST, boxShadow: `0 0 10px ${RUST}` }} />{g.compact ? 'Rusty goal' : 'Rusty goal · untouched'}</span>}
        {legend.proposed && <span className="hemi-label proposed"><span className="dot ring" />{g.compact ? 'Proposed' : 'Proposed by Personal AI'}</span>}
      </div>
      <div className="legend r">
        {legend.inferred && <span className="hemi-label"> {g.compact ? 'Inferred' : 'Inferred by Nordea'}<span className="dot" style={{ background: C.blue, boxShadow: `0 0 10px ${C.blue}` }} /></span>}
      </div>

      <div className={`tray ${hotTray ? 'hot' : ''} ${deck ? 'away' : ''}`} style={{ left: g.tray.x, top: g.tray.y, width: g.tray.w, height: g.tray.h }}>
        <span className="tlabel"><Icon name="vault" size={16} sw={2} />Archive{archivedCount ? ` · ${archivedCount}` : ''}</span>
        {archivedCount === 0 && <span className="hint">Drag a memory here to archive it</span>}
      </div>

      {items.map((it) => {
        const e = it.entry
        const flagged = e.status === 'needs_review' && !e.override_reason
        const cls = ['orb', it.side === 'right' && 'nordea', g.compact && 'compact', it.size.lines === 2 && 'two', it.ring === 2 && 'rusty', it.ring === 'archive' && 'archived',
          dragId === it.id && 'dragging', !magnetOn && it.ring !== 'archive' && 'dim',
          e.ghost && 'ghost', airlock && focusId === it.id && 'focus', airlock && focusId && focusId !== it.id && 'quiet',
          deck && it.ring === 'archive' && 'away'].filter(Boolean).join(' ')
        return (
          <button key={it.id} ref={(el) => { if (el) els.current[it.id] = el; else delete els.current[it.id] }}
            className={cls} style={{ '--c': SIDE_COLOR[it.side], width: it.size.w, height: it.size.h, transform: `translate3d(${g.cx - it.size.w / 2}px,${g.cy - it.size.h / 2}px,0)` }}
            disabled={!!e.ghost} onPointerDown={(ev) => onDown(ev, it)} onPointerUp={() => onUp(it)} onPointerCancel={() => onUp(it)} onKeyDown={(ev) => onKey(ev, it)}
            aria-label={`${it.label}. ${stateLine(e, citations.has(it.id)).own}. ${stateLine(e).state}.`}>
            <span className="sphere" />
            <span className="olabel">{it.label}</span>
            {flagged && <span className="flag" />}
            {e.ghost && <span className="synced" title="Proposed by your Personal AI"><Icon name="sparkle" size={13} sw={2.2} /></span>}
            {!flagged && !e.ghost && it.ring !== 'archive' && e.synced_via === 'personal_ai' && <span className="synced" title="Synced via Personal AI"><Icon name="sparkle" size={13} sw={2.2} /></span>}
          </button>
        )
      })}

      {popItem && !deck && (() => {
        const e = popItem.entry
        const s = stateLine(e, citations.has(e.id))
        const w = Math.min(320, vp.W - 48)
        const left = Math.max(24, Math.min(pop.x - w / 2, vp.W - w - 24))
        const below = pop.y < vp.H * 0.5
        const style = { '--c': SIDE_COLOR[popItem.side], left, ...(below ? { top: pop.y + popItem.size.h / 2 + 12 } : { bottom: vp.H - pop.y + popItem.size.h / 2 + 12 }) }
        const close = () => setPop(null)
        return (
          <div className="popover" style={style} onPointerDown={(ev) => ev.stopPropagation()}>
            <h4>{popItem.label}</h4>
            <p>{e.detail}</p>
            <div className="meta"><span className="dot" style={{ background: SIDE_COLOR[popItem.side] }} />{s.own} · {s.state}</div>
            {s.check && <div className="meta"><Icon name="clock" size={15} sw={2} />{s.check}</div>}
            {s.reading && <div className="meta" style={{ color: '#A5F3FC' }}><Icon name="brain" size={16} sw={2} />{s.reading}</div>}
            <div className="acts">
              {e.status === 'archived' ? (
                <button className="chip primary" onClick={() => { act('restore', e.id); close() }}>Restore</button>
              ) : e.source === 'customer' ? (
                <button className="chip primary" onClick={() => { act('archiveQuiet', e.id); close() }}>Archive</button>
              ) : (
                <>
                  <button className="chip" onClick={() => { act('audit', e.id); close() }}>Why?</button>
                  {e.kind === 'spending' && (e.override_reason
                    ? <button className="chip" onClick={() => { act('undoOverride', e.id); close() }}>Undo correction</button>
                    : <>
                      <button className="chip primary" onClick={() => { act('overrideSprint', e.id); close() }}>Q3 work sprint</button>
                      <button className="chip" onClick={() => { act('override', e.id); close() }}>Kitchen reno</button>
                    </>)}
                </>
              )}
            </div>
          </div>
        )
      })()}

    </div>
  )
}
