// Offline stand-in for the backend agent. Same seed (shared/lauri.json),
// same readiness rules, same response shapes. Used when the API is not
// reachable, e.g. a static GitHub Pages deploy. The vitest suite checks it
// against shared/readiness_cases.json, the same file pytest uses.
import seed from '../../../shared/lauri.json'
import demoMenu from '../../../shared/menu_field_and_fork.json'
import syncPayload from '../../../shared/personal_agent_sync.json'
import manualContext from '../../../shared/manual_context.json'

export const SPRINT_REASON = 'Temporary: Q3 busy work sprint'

export const TIP_SAVINGS_RATE = 0.25
export const BABY_TEXT = 'Expecting a baby next autumn'
const rhu = (x) => Math.floor(x + 0.5)
const clone = (o) => JSON.parse(JSON.stringify(o))
const isArchived = (e) => e.status === 'archived'
const live = (cab, kind) => cab.entries.filter((e) => !isArchived(e) && (!kind || e.kind === kind))

export function readiness(cab) {
  if (!cab.context_on) return { known: false, missing: ['context_off'] }
  const flat = live(cab, 'flat_goal')[0]
  const income = live(cab, 'income')[0]
  const savings = live(cab, 'savings')[0]
  const missing = [['flat_goal', flat], ['income', income], ['savings', savings]].filter(([, v]) => !v).map(([k]) => k)
  if (flat && !flat.data?.target_deposit) missing.push('deposit_target') // e.g. typed by hand
  if (missing.length) return { known: false, missing }

  const target = flat.data.target_deposit
  const horizon = flat.data.horizon_months
  const balance = savings.data.balance
  const salary = income.data.monthly
  const rate = income.data.savings_rate
  const reserving = live(cab).filter((e) => e.id !== flat.id && e.data?.reserve_share)
  const reserved = Math.min(1, reserving.reduce((n, e) => n + e.data.reserve_share, 0))
  const share = 1 - reserved
  const gap = Math.max(0, target - balance)
  const monthly = salary * rate
  const flatMonthly = monthly * share
  const months = flatMonthly > 0 ? rhu(gap / flatMonthly) : 999
  const spare = horizon - months
  const tipMonthly = salary * TIP_SAVINGS_RATE * share
  return {
    known: true, missing: [], target_deposit: target, balance, gap, horizon_months: horizon,
    monthly_savings: rhu(monthly), reserved_share: reserved, flat_monthly: rhu(flatMonthly),
    months, spare, on_track: spare > 0,
    loan_estimate_reduced: live(cab, 'spending').some((e) => !e.override_reason),
    tip_monthly: rhu(tipMonthly), tip_months: tipMonthly > 0 ? rhu(gap / tipMonthly) : 999,
    citations: [flat.id, income.id, savings.id, ...reserving.map((e) => e.id), ...live(cab, 'spending').map((e) => e.id)],
  }
}

const euroK = (n) => (n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`)
const answerBubble = (r) => r.on_track
  ? { title: `On track · ~${r.months} mo`, short_title: 'On track', tone: 'green', icon: 'home', anchor: 'building', badge: r.loan_estimate_reduced ? 'Loan est. ↓' : null }
  : { title: `Tight · ~${r.months} mo`, short_title: `Tight · ~${r.months} mo`, tone: 'amber', icon: 'home', anchor: 'building', badge: r.loan_estimate_reduced ? 'Loan est. ↓' : null }
const citation = (r) => [{ text: 'Your ' }, { text: `${r.horizon_months}-month plan`, source: 'customer' }, { text: ' vs your ' }, { text: `${euroK(r.balance)} ASP`, source: 'nordea' }, { text: '.' }]
const spare = (r) => (r.spare > 0 ? [{ text: `${r.spare} ${r.spare === 1 ? 'month' : 'months'}`, tone: 'good' }, { text: ' to spare.' }] : [{ text: 'No margin left.' }])
const tip = (r) => [{ text: 'Save ' }, { text: 'the raise', source: 'nordea' }, { text: ' too → ' }, { text: `~${r.tip_months} months.`, tone: 'good' }]
const noContext = () => ({ bubble: { title: 'Income? Savings?', tone: 'grey', icon: 'question', anchor: 'building' }, caption: [{ text: 'Enter your details to calculate.' }], dim: false })
// Before sync the agent can't see the flat goal and anchors on the old car goal (mirror of readiness.anchored_goal).
export function anchoredGoal(cab) {
  if (!cab.context_on || live(cab, 'flat_goal').length) return null
  const goal = live(cab).find((e) => e.data?.target_price && e.data?.reserve_share)
  const income = live(cab, 'income')[0]
  if (!goal || !income) return null
  const monthly = income.data.monthly * income.data.savings_rate * goal.data.reserve_share
  const left = goal.data.target_price - (goal.data.saved || 0)
  return { goal_id: goal.id, title: goal.title, target: goal.data.target_price, monthly: rhu(monthly), months: monthly > 0 ? rhu(left / monthly) : 999 }
}
const anchoredWhisper = (a) => ({
  bubble: { title: `${a.title} · ~${a.months} mo`, tone: 'amber', icon: 'clock', anchor: 'building' },
  caption: [{ text: `At €${a.monthly}/mo, your ` }, { text: '2023 car goal', source: 'customer' }, { text: ` needs ~${a.months} months.` }],
  dim: false,
})
// Thin Cabinet (goal typed by hand + Nordea's related signal): a generic answer (mirror of partial_flat).
export function partialFlat(cab) {
  if (!cab.context_on) return null
  const flat = live(cab, 'flat_goal')[0]
  if (!flat) return null
  const r = readiness(cab)
  if (r.known) return null
  const savings = live(cab, 'savings')[0]
  return { goal_id: flat.id, horizon_months: flat.data?.horizon_months || null, balance: savings ? savings.data.balance : null, missing: r.missing }
}
const partialWhisper = (p) => {
  const k = p.balance ? Math.round(p.balance / 1000) : null
  return {
    bubble: { title: `Keep saving · ${k ? `€${k}k saved` : 'No savings data'}, no target yet`, tone: 'blue', icon: 'home', anchor: 'building' },
    caption: [...(k ? [{ text: `€${k}k`, source: 'nordea' }, { text: ' saved for a flat' }] : [{ text: 'Saving for a flat' }]),
      { text: `${p.horizon_months ? ` in ${p.horizon_months} months` : ''}. Keep going!` }],
    dim: false,
  }
}
const noGoal = () => ({ bubble: { title: 'No goal to track', tone: 'grey', icon: 'question', anchor: 'building' }, caption: [{ text: 'Set a goal to get an answer.' }], dim: false })

// Menu rating: the per-dish budget comes from the live flat goal (mirror of backend/app/domain/menu.py).
export function mealBudget(cab) {
  if (!cab.context_on) return { known: false, cap: null, goal_id: null }
  const goal = live(cab, 'flat_goal').find((e) => e.data?.lunch_cap)
  return goal ? { known: true, cap: goal.data.lunch_cap, goal_id: goal.id } : { known: true, cap: null, goal_id: null }
}
export function rateMenu(cab, items) {
  const b = mealBudget(cab)
  if (!b.known) return { ...b, items: [], over_count: 0 }
  const rated = items.map((it) => {
    const over = b.cap != null && it.price > b.cap ? Math.round((it.price - b.cap) * 100) / 100 : 0
    return { id: it.id, name: it.name, price: it.price, fits: over === 0, over }
  })
  return { ...b, items: rated, over_count: rated.filter((r) => !r.fits).length }
}
const eur = (x) => (Number.isInteger(x) ? `€${x}` : `€${x.toFixed(2)}`)
function menuWhisper(r) {
  if (!r.known) return { bubble: { title: 'No context', short_title: 'No context', tone: 'grey', icon: 'question', anchor: 'table' }, caption: [{ text: "No context. I can't judge prices." }] }
  if (r.cap == null) return { bubble: { title: 'Everything fits · No goal to protect', tone: 'green', icon: 'check', anchor: 'table' }, caption: [{ text: 'No savings goal to protect. ' }, { text: 'Everything fits.', tone: 'good' }] }
  const n = r.over_count
  return {
    bubble: { title: `Lunch budget ${eur(r.cap)} · Keeps your flat plan on track`, tone: 'green', icon: 'fork', anchor: 'table' },
    caption: [{ text: `${n} ${n === 1 ? 'dish is' : 'dishes are'}`, tone: n ? 'warn' : 'good' }, { text: ' over your ' }, { text: 'flat-plan', source: 'customer' }, { text: ' budget.' }],
  }
}

export function hygiene(cab) {
  const out = []
  for (const e of live(cab)) {
    if (e.source === 'customer' && e.status === 'stale') {
      const y = (e.created || '').slice(0, 4)
      out.push({ entry_id: e.id, action: 'archive', label: y ? `${e.title} · idle since ${y}` : `${e.title} · idle`, reason: 'No money added in 18 months' })
    } else if (e.source === 'nordea' && e.status === 'needs_review' && !e.override_reason) {
      out.push({ entry_id: e.id, action: 'review', label: e.title, reason: 'Nordea assumes this is permanent' })
    }
  }
  return out
}

const STOP = new Set("i im i'm am is are was be been we we're our my me you your the a an to for of in on at with and or that this it its next going gonna want wanna will would should planning plan expecting have has had get getting some about just new really".split(' '))
export function shortenTitle(text) {
  const words = text.replace(/[^\p{L}\p{N}_\s'€%+-]/gu, ' ').split(/\s+/).filter(Boolean)
  const keep = words.filter((w) => !STOP.has(w.toLowerCase()))
  const pick = (keep.length ? keep : words).slice(0, 3)
  if (!pick.length) return 'Note'
  const first = pick[0][0].toUpperCase() + pick[0].slice(1).toLowerCase()
  const rest = pick.slice(1).map((w) => (/^\p{Lu}/u.test(w) ? w : w.toLowerCase())).join(' ') // keep names like Espoo
  return rest ? `${first} · ${rest}` : first
}

function ruleIntent(q) {
  const s = q.toLowerCase().trim()
  if (['why', 'audit', 'not right', 'wrong'].some((w) => s.includes(w))) return 'audit'
  if (['what do you know', 'scan', 'what does nordea know'].some((w) => s.includes(w))) return 'scan'
  if (s.endsWith('?') || ['on track', 'afford', 'ready', 'how long'].some((w) => s.includes(w))) return 'readiness'
  return 'add_context'
}

export function createLocalAgent() {
  const db = { lauri: clone(seed) }
  const get = (u) => { if (!db[u]) throw new Error(`404 ${u}`); return db[u] }
  const entry = (u, id) => { const e = get(u).entries.find((x) => x.id === id); if (!e) throw new Error(`404 ${id}`); return e }
  const snap = (u) => clone(get(u))

  const ops = {
    archive(u, id) { const e = entry(u, id); if (!isArchived(e)) { e.status_before_archive = e.status; e.status = 'archived' } return snap(u) },
    restore(u, id) { const e = entry(u, id); if (isArchived(e)) { e.status = e.status_before_archive || 'active'; e.status_before_archive = null } return snap(u) },
    override(u, id, reason) { const e = entry(u, id); e.override_reason = reason; if (e.source === 'nordea' && !isArchived(e)) e.status = reason ? 'active' : 'needs_review'; return snap(u) },
    setContext(u, on) { get(u).context_on = on; return snap(u) },
    add(u, title, text, id) {
      const e = { id: id || `u-${Math.random().toString(16).slice(2, 10)}`, source: 'customer', status: 'active', kind: 'note', title, detail: text, data: {}, created: new Date().toISOString().slice(0, 10) }
      get(u).entries = [...get(u).entries.filter((x) => x.id !== e.id), e]
      return e
    },
    // Personal AI sync (mirror of InMemoryCabinetStore.apply_sync): write only approved proposals.
    applySync(u, approvedIds = null) {
      const proposals = syncPayload.proposals
      const known = new Set(proposals.map((p) => p.id))
      const approved = new Set(approvedIds ?? proposals.filter((p) => p.default_approved !== false).map((p) => p.id))
      for (const id of approved) if (!known.has(id)) throw new Error(`Unknown proposal id: ${id}`)
      const cab = get(u)
      // Re-sync brings back what a desync parked; entries added since then win on id.
      const have = new Set(cab.entries.map((e) => e.id))
      cab.entries.push(...(cab.withheld || []).filter((e) => !have.has(e.id)))
      cab.withheld = []
      for (const p of proposals) {
        if (!approved.has(p.id)) continue
        let t = cab.entries.find((e) => e.id === p.target_entry_id)
        if (!t && p.action === 'upsert_goal' && p.entry) { t = clone(p.entry); cab.entries.unshift(t) } // goal only lived in the Personal AI
        if (!t) continue
        if (p.action === 'upsert_goal' && p.entry) { t.title = p.entry.title; t.detail = p.entry.detail; t.data = { ...t.data, ...p.entry.data } }
        if (p.action === 'upsert_goal' && isArchived(t)) { t.status = 'active'; t.status_before_archive = null }
        else if (p.action === 'archive_stale' && !isArchived(t)) { t.status_before_archive = t.status; t.status = 'archived' }
        else if (p.action === 'override_signal') { t.override_reason = p.override_reason || SPRINT_REASON; if (!isArchived(t)) t.status = 'active' }
        else if (p.action === 'acknowledge_signal' && !isArchived(t)) t.status = 'active'
        t.synced_via = 'personal_ai'
      }
      return snap(u)
    },
    // Desync: the Cabinet empties (parked in `withheld`, not deleted).
    desync(u) { const cab = get(u); cab.withheld = [...(cab.withheld || []), ...cab.entries]; cab.entries = []; return snap(u) },
    // A goal Lauri types himself (Side A, no Personal AI).
    addGoal(u, entry = manualContext.entry) {
      const cab = get(u)
      const e = { ...clone(entry), source: 'customer' }
      cab.entries = [...cab.entries.filter((x) => x.id !== e.id), e]
      cab.withheld = (cab.withheld || []).filter((x) => x.id !== e.id)
      return snap(u)
    },
    // Nordea adds back only the signals related to the goals now in the Cabinet.
    nordeaContribute(u) {
      const cab = get(u)
      const kinds = new Set(live(cab).filter((g) => g.source === 'customer').flatMap((g) => manualContext.nordea_related[g.kind] || []))
      const moved = (cab.withheld || []).filter((e) => e.source === 'nordea' && kinds.has(e.kind))
      cab.withheld = (cab.withheld || []).filter((e) => !moved.includes(e))
      cab.entries.push(...moved)
      return clone(moved)
    },
    applyDemoState(u, { context_on, car_archived, dining_overridden, include_baby, flat_archived = false, synced = false, flat = false, desynced = false, manual_flat = false }) {
      const extras = get(u).entries.filter((e) => e.id.startsWith('u-'))
      db[u] = clone(seed)
      db[u].entries.push(...extras)
      db[u].context_on = context_on
      if (flat) ops.applySync(u, ['sync-flat'])
      if (car_archived) ops.archive(u, 'car')
      if (dining_overridden) ops.override(u, 'dining', SPRINT_REASON)
      if (synced) ops.applySync(u)
      if (include_baby) ops.add(u, 'Baby · autumn', BABY_TEXT, 'baby')
      if (desynced) ops.desync(u)
      if (manual_flat) { ops.addGoal(u); ops.nordeaContribute(u) }
      if (flat_archived) ops.archive(u, 'flat')
      return snap(u)
    },
  }

  const base = (u, intent) => ({ intent, readiness: null, whisper: null, tip: null, spare: null, suggestions: null, new_entry: null, xray: null, signals: null, cabinet: snap(u), trace: ['offline'] })

  const answer = (u) => {
    const cab = get(u)
    const out = base(u, 'readiness')
    if (!cab.context_on) return { ...out, readiness: { known: false, missing: ['context_off'] }, whisper: noContext() }
    const r = readiness(cab)
    if (!r.known) {
      const a = anchoredGoal(cab)
      if (a) return { ...out, readiness: r, anchored: a, whisper: anchoredWhisper(a) }
      const pf = partialFlat(cab)
      return pf ? { ...out, readiness: r, partial: pf, whisper: partialWhisper(pf) } : { ...out, readiness: r, whisper: noGoal() }
    }
    return { ...out, readiness: r, suggestions: hygiene(cab), whisper: { bubble: answerBubble(r), caption: citation(r), dim: false }, tip: tip(r), spare: spare(r) }
  }
  const addContext = (u, text) => {
    const isBaby = text.trim().toLowerCase() === BABY_TEXT.toLowerCase()
    const e = ops.add(u, isBaby ? 'Baby · autumn' : shortenTitle(text), text.trim(), isBaby ? 'baby' : undefined)
    return { ...base(u, 'add_context'), new_entry: clone(e), whisper: { bubble: { title: e.title, tone: 'green', icon: 'pin', anchor: 'skyLeft' }, caption: [{ text: 'Pinned.' }] } }
  }
  const audit = (u, id) => {
    const cab = get(u)
    const t = cab.entries.find((e) => e.id === id) || live(cab, 'spending')[0]
    if (!t) return { ...base(u, 'audit'), xray: [] }
    const lines = t.data?.audit || [[{ text: `${t.source === 'customer' ? 'You told us' : 'Nordea saw'}: ` }, { text: t.detail }]]
    return { ...base(u, 'audit'), xray: lines }
  }
  const scan = (u) => {
    const cab = get(u)
    if (!cab.context_on) return answer(u)
    const signals = live(cab).filter((e) => e.source === 'nordea').map((e) => ({ id: e.id, label: e.title, kind: e.kind, status: e.status }))
    return { ...base(u, 'scan'), signals, whisper: { bubble: null, caption: [{ text: `${signals.length} from Nordea`, source: 'nordea' }, { text: ', all yours to check.' }] } }
  }
  const P = (fn) => (...a) => Promise.resolve().then(() => fn(...a))

  return {
    mode: 'offline', llm: 'none',
    setContext: P((u, on) => ops.setContext(u, on)),
    archive: P((u, id) => ops.archive(u, id)),
    restore: P((u, id) => ops.restore(u, id)),
    override: P((u, id, reason) => ops.override(u, id, reason)),
    clearOverride: P((u, id) => ops.override(u, id, null)),
    answer: P(answer),
    ask: P((u, q) => {
      const intent = ruleIntent(q)
      if (intent === 'add_context') return addContext(u, q)
      if (intent === 'audit') return audit(u, null)
      if (intent === 'scan') return scan(u)
      return answer(u)
    }),
    add: P(addContext),
    audit: P(audit),
    scan: P(scan),
    desync: P((u) => { ops.desync(u); return answer(u) }),
    addGoal: P((u, entry) => { ops.addGoal(u, entry); return answer(u) }),
    nordeaContribute: P((u) => { const moved = ops.nordeaContribute(u); return { ...answer(u), contributed: moved } }),
    stageSync: P((u) => {
      const n = syncPayload.proposals.length
      return { ...base(u, 'sync'), sync_staging: clone(syncPayload), whisper: { bubble: { title: `Personal AI · ${n} updates staged`, short_title: 'Personal AI sync', tone: 'green', icon: 'sparkle', anchor: 'building' }, caption: [{ text: `${n} updates`, source: 'customer' }, { text: ' staged for your review.' }] } }
    }),
    applySync: P((u, approvedIds) => { ops.applySync(u, approvedIds); return answer(u) }),
    rateMenu: P((u, items = demoMenu.items) => {
      const rating = rateMenu(get(u), items)
      return { ...base(u, 'menu'), menu_rating: rating, whisper: menuWhisper(rating) }
    }),
    demoState: P((u, st) => { ops.applyDemoState(u, st); return answer(u) }),
    _ops: ops,
  }
}
