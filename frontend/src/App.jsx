import { useEffect, useRef, useState } from 'react'
import Orbit from './components/Orbit'
import Hero from './components/Hero'
import Icon from './components/Icon'
import { Caption, Flyer, MenuMarks, Scan, XRay } from './components/Overlays'
import AddContextSheet, { addSpace } from './components/AddContextSheet'
import SyncAirlock, { deckSpace } from './components/SyncAirlock'
import { SCENES } from './config/scene'
import World, { Lens } from './components/World'
import { C, CONFIG, MOMENTS, NO_CONTEXT, PRESET, QUESTION, UID, demoStateFor, fromBubble, isSynced, live, splitTitle } from './config/moments'
import syncPayload from '../../shared/personal_agent_sync.json'
import manualContext from '../../shared/manual_context.json'

const SPRINT = 'Temporary: Q3 busy work sprint'
const KITCHEN = 'Kitchen renovation / hosting'
const HANDSHAKE_MS = 1350
const ASK_MS = 1700 // Lauri's question shows this long before the agent answers
import { connect } from './lib/api'
import { listenOnce } from './lib/speech'
import { speak, stopSpeaking } from './lib/tts'

const UI0 = { xray: null, notRight: false, voice: null, flying: false, notice: null, scan: null, signals: [], lastAddedId: null, pinSecs: null, free: null, sync: null, asking: false, answered: false, addSheet: null, contributing: false, flinging: false, cabToast: null }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Priority: voice flow > free question > context off > the current moment.
function composeView({ m, cabinet, answer, ui, menu }) {
  let v
  const vo = ui.voice
  if (vo?.phase === 'listen') v = { hero: null, caption: { key: `listen${vo.n}`, dim: true, parts: [] } }
  else if (vo?.phase === 'heard') v = { hero: null, caption: { key: `heard${vo.n}`, dim: true, parts: [{ text: `“${vo.text}”` }] } }
  else if (vo?.phase === 'pinned')
    v = { hero: { anchor: 'skyLeft', color: C.green, ...splitTitle(vo.entry.title), icon: 'pin' }, caption: { key: `pin${vo.entry.id}`, parts: [{ text: 'Pinned in ' }, { text: `${vo.secs} s.`, tone: 'good' }] } }
  else if (ui.free) v = ui.free
  else if ((MOMENTS[m].ask || MOMENTS[m].askAfter) && ui.asking) v = { hero: null, caption: { key: `ask${m}`, dim: true, parts: [{ text: `“${QUESTION}”` }] } }
  else if (cabinet && !cabinet.context_on && !MOMENTS[m].scene) // the restaurant explains context-off itself
    v = answer?.readiness?.known === false && answer.whisper
      ? { hero: fromBubble(answer.whisper.bubble), caption: { key: 'off', parts: answer.whisper.caption } }
      : NO_CONTEXT
  else v = MOMENTS[m].view({ cabinet, answer, ui, menu })
  if (ui.notice) v = { ...v, caption: { key: ui.notice.key, parts: [{ text: ui.notice.text }] } }
  return v
}

export default function App() {
  const [api, setApi] = useState(null)
  const [m, setM] = useState(0)
  const [cabinet, setCabinet] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [ui, setUi] = useState(UI0)
  const [vp, setVp] = useState({ W: window.innerWidth, H: window.innerHeight })
  const [cabOpen, setCabOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [fly, setFly] = useState(null)
  const [stream, setStream] = useState(null)
  const [realMic, setRealMic] = useState(false)
  const [voiceOut, setVoiceOut] = useState(true)
  const [awake, setAwake] = useState(false)
  const timers = useRef([])
  const epoch = useRef(0)
  const voiceN = useRef(0)
  const freeN = useRef(0)
  const bubbleRef = useRef(null)
  const awakeT = useRef(null)

  const patchUi = (p) => setUi((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) }))
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)) }
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const notice = (t) => {
    const key = `n${Date.now()}`
    patchUi({ notice: { key, text: t } })
    later(() => patchUi((p) => (p.notice?.key === key ? { notice: null } : {})), CONFIG.noticeMs)
  }
  const safe = async (fn) => {
    try { return await fn() } catch (err) { console.error(err); notice('Something went wrong. Try again.'); return null }
  }

  const [menu, setMenu] = useState(null)
  const view = composeView({ m, cabinet, answer, ui, menu })
  const moment = MOMENTS[m]
  const scene = SCENES[moment.scene || 'street']

  // ---- data -----------------------------------------------------------------
  const refresh = async () => {
    const e = epoch.current
    const a = await safe(() => api.answer(UID))
    if (!a || e !== epoch.current) return
    setAnswer(a)
    setCabinet(a.cabinet)
  }

  const startScan = async (e) => {
    patchUi({ scan: 'sweep', signals: [] })
    later(() => patchUi({ scan: 'collapse' }), CONFIG.scanCollapseMs)
    later(() => patchUi({ scan: 'done' }), CONFIG.scanDoneMs)
    const s = await safe(() => api.scan(UID))
    if (s && e === epoch.current) patchUi({ signals: s.signals || [] })
  }

  // keepState: carry the Cabinet over as it is (e.g. the cards Lauri approved in M2).
  const goto = async (i, { keepState = false } = {}) => {
    if (i < 0 || i >= MOMENTS.length || !api) return
    const mo = MOMENTS[i]
    const e = ++epoch.current
    clearTimers(); setFly(null); setTyping(false); setM(i)
    setCabOpen(!!mo.opensCabinet)
    setUi({ ...UI0, scan: mo.scanned ? 'done' : null, lastAddedId: mo.state?.include_baby ? 'baby' : null, asking: !!mo.ask })
    if (mo.ask) later(() => patchUi({ asking: false }), ASK_MS)
    const res = await safe(() => (keepState ? api.answer(UID) : api.demoState(UID, demoStateFor(i))))
    if (!res || e !== epoch.current) return
    setCabinet(res.cabinet)
    setAnswer(res)
    if (mo.autoVoice) later(() => startVoice(realMic ? { real: true } : {}), 1100) // glasses listen on their own
    if (mo.autoScan) startScan(e)
    if (mo.scanned) {
      const s = await safe(() => api.scan(UID))
      if (s && e === epoch.current) patchUi({ signals: s.signals || [] })
    }
  }

  // ---- actions --------------------------------------------------------------
  const archive = async (id, animate) => {
    const el = bubbleRef.current
    if (animate && el && view.hero?.chips?.some((c) => c.act === 'archive')) {
      setFly({ rect: el.getBoundingClientRect(), color: C.amber, title: view.hero.title.split(' · ')[0] })
      patchUi({ flying: true })
      later(() => { patchUi({ flying: false }); setFly(null) }, CONFIG.flyMs + 60)
    }
    const c = await safe(() => api.archive(UID, id))
    if (c) { setCabinet(c); await refresh() }
  }

  const act = async (name, arg) => {
    switch (name) {
      case 'archive': return archive(arg, true)
      case 'archiveQuiet': return archive(arg, false)
      case 'restore': { const c = await safe(() => api.restore(UID, arg)); if (c) { setCabinet(c); await refresh() } return }
      case 'why':
      case 'audit': {
        const res = await safe(() => api.audit(UID, arg))
        if (res?.xray?.length) patchUi({ xray: res.xray })
        return
      }
      case 'notRight': return patchUi({ notRight: true })
      case 'cancelNotRight': return patchUi({ notRight: false })
      case 'override': {
        const c = await safe(() => api.override(UID, arg, KITCHEN))
        if (c) { setCabinet(c); patchUi({ notRight: false }); await refresh() }
        return
      }
      case 'overrideSprint': {
        const c = await safe(() => api.override(UID, arg, SPRINT))
        if (c) { setCabinet(c); patchUi({ notRight: false }); await refresh() }
        return
      }
      case 'openSync': return openSync()
      case 'undoOverride': { const c = await safe(() => api.clearOverride(UID, arg)); if (c) { setCabinet(c); await refresh() } return }
      default: return undefined
    }
  }

  const startVoice = async ({ text = PRESET, typed = false, real = false } = {}) => {
    const e = epoch.current
    const n = ++voiceN.current
    const t0 = performance.now()
    const alive = () => e === epoch.current && n === voiceN.current
    patchUi({ voice: { phase: typed ? 'heard' : 'listen', text, n }, free: null })
    let heard = text
    if (real) {
      try { heard = await listenOnce() } catch (err) {
        if (alive()) { patchUi({ voice: null }); notice(err.message === 'unsupported' ? 'Voice input needs Chrome or Edge.' : "Didn't catch that.") }
        return
      }
    } else if (!typed) await sleep(CONFIG.listenMs)
    if (!alive()) return
    patchUi({ voice: { phase: 'heard', text: heard, n } })
    const [res] = await Promise.all([safe(() => api.add(UID, heard)), sleep(CONFIG.heardMs)])
    if (!alive()) return
    if (!res?.new_entry) { patchUi({ voice: null }); return }
    const secs = Math.max(1, Math.round((performance.now() - t0) / 1000))
    setCabinet(res.cabinet)
    patchUi({ voice: { phase: 'pinned', text: heard, n, entry: res.new_entry, secs }, lastAddedId: res.new_entry.id, pinSecs: secs })
    later(() => { if (n === voiceN.current) patchUi({ voice: null }) }, CONFIG.pinnedHoldMs)
  }

  // A typed question goes to the agent, which decides what to do with it.
  const askFree = async (q) => {
    const e = epoch.current
    const k = ++freeN.current
    patchUi({ free: { hero: null, caption: { key: `q${k}`, dim: true, parts: [{ text: `“${q}”` }] } } })
    const res = await safe(() => api.ask(UID, q))
    if (!res || e !== epoch.current || k !== freeN.current) return
    console.info('[agent]', res.intent, res.trace)
    if (res.cabinet) setCabinet(res.cabinet)
    if (res.intent === 'audit' && res.xray?.length) return patchUi({ free: null, xray: res.xray })
    if (res.intent === 'scan') { patchUi({ free: null }); return startScan(e) }
    patchUi({
      free: { hero: fromBubble(res.whisper?.bubble), caption: { key: `a${k}`, parts: res.whisper?.caption || [] }, label: 'Asked the agent' },
      ...(res.new_entry ? { lastAddedId: res.new_entry.id } : {}),
    })
    later(() => { if (k === freeN.current) patchUi({ free: null }) }, CONFIG.freeHoldMs)
  }

  // ---- Personal AI sync: handshake → review in the airlock → commit only what's approved ----
  const openSync = async () => {
    if (ui.sync || !api) return
    const e = epoch.current
    patchUi({ sync: { phase: 'handshake', staging: null, selected: [], index: 0, popup: null } })
    const [res] = await Promise.all([safe(() => api.stageSync(UID)), sleep(HANDSHAKE_MS)])
    if (e !== epoch.current) return
    if (!res?.sync_staging) { patchUi({ sync: null }); return }
    const selected = res.sync_staging.proposals.filter((p) => p.default_approved !== false).map((p) => p.id)
    patchUi((p) => (p.sync ? { sync: { phase: 'review', staging: res.sync_staging, selected, index: 0, popup: null } } : {}))
  }
  const setSync = (patch) => patchUi((p) => (p.sync ? { sync: { ...p.sync, ...patch } } : {}))
  const toggleSyncItem = (id) => patchUi((p) => (p.sync ? {
    sync: { ...p.sync, selected: p.sync.selected.includes(id) ? p.sync.selected.filter((x) => x !== id) : [...p.sync.selected, id] },
  } : {}))
  const applySync = async (ids) => {
    const res = await safe(() => api.applySync(UID, ids))
    if (!res) return
    setCabinet(res.cabinet)
    setAnswer(res)
    patchUi({ sync: null })
  }

  // ---- Desync: the Cabinet empties (memories fly out, then the Cabinet is cleared) ----
  const desync = async () => {
    if (!api || ui.flinging) return
    patchUi({ flinging: true })
    await sleep(750)
    const res = await safe(() => api.desync(UID))
    if (res) { setCabinet(res.cabinet); setAnswer(res) }
    patchUi({ flinging: false })
  }

  // ---- Context typed by hand, then Nordea adds only what's related to it ----
  const cabToast = (text) => {
    const key = `t${Date.now()}`
    patchUi({ cabToast: { key, text } })
    later(() => patchUi((p) => (p.cabToast?.key === key ? { cabToast: null } : {})), 3800)
  }
  const submitManual = async (raw) => {
    const t = raw.trim()
    if (!t) return
    patchUi({ addSheet: null })
    const isPreset = t.toLowerCase() === manualContext.text.toLowerCase()
    const res = await safe(() => (isPreset ? api.addGoal(UID) : api.add(UID, t)))
    if (!res) return
    setCabinet(res.cabinet)
    patchUi({ contributing: true })
    await sleep(1100)
    const c = await safe(() => api.nordeaContribute(UID))
    patchUi({ contributing: false })
    if (!c) return
    setCabinet(c.cabinet)
    setAnswer(c)
    const n = c.contributed?.length || 0
    cabToast(n ? `Nordea added ${n} related signal${n > 1 ? 's' : ''}: ${c.contributed.map((e) => e.title).join(', ')}` : 'Nordea has nothing related to add.')
  }

  const askNow = () => {
    patchUi({ asking: true, answered: true })
    later(() => patchUi({ asking: false }), ASK_MS)
  }
  const closeCabinetAndContinue = () => {
    setCabOpen(false)
    if (moment.askAfter) return askNow()
    return goto(m + 1, { keepState: true })
  }

  const submitTyped = (raw) => {
    const t = raw.trim()
    if (!t) return
    if (/\bdesync\b/i.test(t)) { setCabOpen(true); return desync() }
    if (/\bsync\b|personal ai/i.test(t)) { setCabOpen(true); return openSync() } // the sync lives in the Cabinet
    if (t.endsWith('?')) askFree(t)
    else startVoice({ text: t, typed: true })
  }



  const toggleCamera = async () => {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); return }
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }))
    } catch {
      setCabOpen(false)
      notice("Camera isn't available here.")
    }
  }

  // ---- navigation -----------------------------------------------------------
  const next = () => {
    // In the airlock: close a pop-up, else step through the deck, then approve.
    if (ui.sync) {
      const s = ui.sync
      if (s.phase !== 'review') return
      if (s.popup) return setSync({ popup: null })
      if (s.index < s.staging.proposals.length - 1) return setSync({ index: s.index + 1 })
      if (s.selected.length) applySync(s.selected)
      return
    }
    if (ui.addSheet) return submitManual(ui.addSheet.text)
    if (cabOpen) {
      if (!moment.opensCabinet || ui.flinging) return
      const step = moment.cabinetStep({ cabinet, ui })
      if (step === 'sync') return openSync()
      if (step === 'desync') return desync()
      if (step === 'add') return patchUi({ addSheet: { text: manualContext.text } })
      if (step === 'wait') return
      return closeCabinetAndContinue()
    }
    if (moment.opensCabinet && !ui.answered) {
      if (moment.cabinetStep({ cabinet, ui }) !== 'done') return setCabOpen(true)
      if (moment.askAfter) return askNow()
    }
    if (moment.askAfter && ui.answered) return goto(m + 1, { keepState: true })
    if (ui.xray) return patchUi({ xray: null })
    if (typing) return setTyping(false)
    if (ui.free) return patchUi({ free: null })
    const p = cabinet?.context_on && moment.pending ? moment.pending({ cabinet, answer, ui }) : null
    if (p === 'wait') return
    if (p === 'voice') return startVoice(realMic ? { real: true } : {})
    if (p === 'finishScan') { clearTimers(); return patchUi({ scan: 'done' }) }
    if (p === 'removeFlat') return act('archiveQuiet', 'flat')
    goto(m + 1)
  }
  const prev = () => {
    if (ui.sync) {
      const s = ui.sync
      if (s.popup) return setSync({ popup: null })
      if (s.phase === 'review' && s.index > 0) return setSync({ index: s.index - 1 })
      return patchUi({ sync: null })
    }
    if (ui.addSheet) return patchUi({ addSheet: null })
    if (cabOpen) return setCabOpen(false)
    if (ui.xray) return patchUi({ xray: null })
    goto(m - 1)
  }

  // ---- effects --------------------------------------------------------------
  useEffect(() => {
    const on = () => setVp({ W: window.innerWidth, H: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  useEffect(() => {
    let alive = true
    connect().then((a) => { if (alive) setApi(a) })
    return () => { alive = false }
  }, [])

  useEffect(() => { if (api) goto(0) }, [api]) // eslint-disable-line react-hooks/exhaustive-deps

  const keys = useRef({})
  const escape = () => {
    if (ui.sync?.popup) setSync({ popup: null })
    else if (ui.sync) patchUi({ sync: null })
    else if (ui.addSheet) patchUi({ addSheet: null })
    else { setCabOpen(false); setTyping(false); patchUi({ xray: null }) }
  }
  keys.current = { next, prev, escape }
  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === 'INPUT') { if (e.key === 'Escape') setTyping(false); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); keys.current.next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); keys.current.prev() }
      else if (e.key === 'Escape') keys.current.escape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // In the restaurant, the agent re-reads the menu every time the Cabinet changes.
  useEffect(() => {
    if (!api || !cabinet || scene.id !== 'restaurant') return undefined
    let alive = true
    api.rateMenu(UID).then((r) => { if (alive) setMenu(r) }).catch((err) => console.error(err))
    return () => { alive = false }
  }, [api, cabinet, scene.id])

  // The agent answers out loud: speak each new agent caption (not Lauri's own words).
  const capText = view.caption.parts.map((p) => p.text).join('')
  useEffect(() => {
    if (!voiceOut || cabOpen || ui.xray || ui.sync || view.caption.dim || !capText) return
    speak(capText)
  }, [view.caption.key, voiceOut]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!voiceOut) stopSpeaking() }, [voiceOut])

  const wake = () => { setAwake(true); clearTimeout(awakeT.current); awakeT.current = setTimeout(() => setAwake(false), 2500) }

  // ---- render ----------------------------------------------------------------
  const archivedCount = (cabinet?.entries || []).filter((e) => e.status === 'archived').length - (fly ? 1 : 0)
  const pendingSync = cabinet?.context_on && !isSynced(cabinet) && moment.notify ? syncPayload.proposals.length : 0
  const showNote = pendingSync > 0 && !ui.asking && !cabOpen && !ui.sync
  // While the airlock is open: which memory the current card is about, and goals that don't exist yet.
  const proposals = ui.sync?.phase === 'review' ? ui.sync.staging.proposals : []
  const focusId = proposals[ui.sync?.index ?? 0]?.target_entry_id || null
  const ghosts = proposals.filter((p) => p.entry && !cabinet?.entries.some((e) => e.id === p.entry.id)).map((p) => ({ ...p.entry, ghost: true }))

  return (
    <div className={awake ? 'awake' : ''} onPointerDown={wake}>
      <World dim={!!ui.xray} orbiting={cabOpen} stream={stream} sceneId={scene.id} />
      <Lens />
      <div className="tapzone" onClick={(e) => { if (e.clientX > window.innerWidth / 2) next() }} />
      <Scan phase={ui.scan} signals={ui.signals} vp={vp} />
      {scene.id === 'restaurant' && <MenuMarks rating={menu?.menu_rating} scene={scene} vp={vp} hidden={!!ui.xray || !!ui.sync || cabOpen} />}
      <Hero hero={view.hero} hidden={!!ui.xray || !!ui.sync || cabOpen} vp={vp} scene={scene} onAct={act} bubbleRef={bubbleRef} />

      {!cabOpen && ui.scan === 'done' && ui.signals.length > 0 && (
        <button className="nchip" onClick={() => setCabOpen(true)}>
          <span className="dot" style={{ background: C.blue }} />{ui.signals.length} from Nordea
        </button>
      )}
      {!cabOpen && (archivedCount > 0 || fly) && (
        <button id="vault" className="vault" aria-label={`Vault, ${Math.max(0, archivedCount)} archived`}
          onClick={() => setCabOpen(true)}>
          <Icon name="vault" size={22} sw={1.9} />
          {archivedCount > 0 && <span key={archivedCount} className="count">{archivedCount}</span>}
        </button>
      )}
      {ui.free?.label && <div className="free-tag">{ui.free.label}</div>}
      {showNote && (
        <button className="ainote" onClick={() => setCabOpen(true)} aria-label="Your Personal AI has updates. Open the Cabinet to review them.">
          <span className="ainote-ico"><Icon name="sparkle" size={18} sw={2} /></span>
          <span className="ainote-text"><b>{syncPayload.notification?.title}</b><span>{syncPayload.notification?.body}</span></span>
          <span className="ainote-cta">Review</span>
        </button>
      )}
      {fly && <Flyer fly={fly} />}
      {ui.xray && <XRay lines={ui.xray} onClose={() => patchUi({ xray: null })} />}

      <Caption cap={view.caption} hidden={!!ui.xray || !!ui.sync || cabOpen} />

      {typing && (
        <form className="typebar" onSubmit={(e) => { e.preventDefault(); submitTyped(text); setText(''); setTyping(false) }}>
          <input id="note" autoFocus value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Add a note, or ask a question?" maxLength={120} aria-label="Add a note or ask a question" />
          <button type="submit">Send</button>
        </form>
      )}

      <div className={`mlabel ${cabOpen ? 'away' : ''}`}>{moment.id} · {moment.name}</div>
      <div className={`controls ${cabOpen ? 'away' : ''}`}>
        <div className="grp">
          <button className="ctl" aria-label="Type a note or question" onClick={() => setTyping((v) => !v)}><Icon name="keys" size={20} sw={1.9} /><span className="lbl">Type</span></button>
        </div>
        <div className="grp">
          <button className="ctl cab" aria-label="Open Cabinet" onClick={() => setCabOpen(true)}><Icon name="cabinet" size={20} sw={1.9} /><span className="lbl">Cabinet</span>{pendingSync > 0 && <span className="ctl-badge">{pendingSync}</span>}</button>
          <button className="ctl" aria-label="Previous moment" onClick={prev} disabled={m === 0} style={{ opacity: m === 0 ? 0.4 : 1 }}><Icon name="left" size={20} /></button>
          <button className="ctl" aria-label="Next moment" onClick={next}><Icon name="right" size={20} /></button>
        </div>
      </div>

      <Orbit open={cabOpen} onClose={() => { setCabOpen(false); patchUi({ addSheet: null, sync: null }) }} cabinet={cabinet} answer={answer} magnetOn={!!cabinet?.context_on && !ui.flinging}
        act={act} vp={vp} airlock={ui.sync} focusId={focusId} ghosts={ghosts} syncPending={pendingSync}
        bottomSpace={ui.sync ? deckSpace(vp.W) : ui.addSheet ? addSpace(vp.W) : 0} flinging={ui.flinging}
        syncHint={cabOpen && moment.cabinetStep ? moment.cabinetStep({ cabinet, ui }) : null}
        settings={{ camera: !!stream, toggleCamera, realMic, toggleRealMic: () => setRealMic((v) => !v), voiceOut, toggleVoiceOut: () => setVoiceOut((v) => { if (v) stopSpeaking(); return !v }), onOpenSync: openSync, onDesync: desync,
          onAdd: () => patchUi({ addSheet: { text: manualContext.text } }), synced: isSynced(cabinet), mode: api?.mode, llm: api?.llm }} />
      {cabOpen && ui.cabToast && <div key={ui.cabToast.key} className="cab-toast"><Icon name="bank" size={16} sw={2} />{ui.cabToast.text}</div>}
      {cabOpen && ui.addSheet && !ui.sync && (
        <AddContextSheet text={ui.addSheet.text} onChange={(text) => patchUi({ addSheet: { text } })}
          onSubmit={submitManual} onClose={() => patchUi({ addSheet: null })} />
      )}
      {ui.sync && (
        <SyncAirlock sync={ui.sync} onToggle={toggleSyncItem} onIndex={(index) => setSync({ index, popup: null })}
          onPopup={(popup) => setSync({ popup })} onApprove={applySync} onClose={() => patchUi({ sync: null })}
          existingIds={new Set((cabinet?.entries || []).map((e) => e.id))} />
      )}
    </div>
  )
}
