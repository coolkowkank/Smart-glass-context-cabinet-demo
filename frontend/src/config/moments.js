// EDITABLE: palette, timing, scene anchors and the storyboard moments.
// Numbers never live here. Every figure shown comes from the agent's answer.

export const UID = 'lauri'
export const QUESTION = 'Am I on track?'
export const PRESET = 'Expecting a baby next autumn'

export const C = { green: '#10B981', blue: '#4599FF', cyan: '#00D2FF', amber: '#F59E0B', grey: '#9CA3AF', navy: '#00005E' }
export const TONE = { green: C.green, amber: C.amber, blue: C.blue, grey: C.grey }

// Caption span colour: green = from Lauri, blue = from Nordea.
export const partColor = (p) =>
  p.source === 'customer' ? C.green : p.source === 'nordea' ? C.blue : p.tone === 'good' ? C.green : p.tone === 'warn' ? C.amber : null

export const CONFIG = {
  typeCps: 35,
  crossfadeMs: 300,
  listenMs: 1000,
  heardMs: 1300,
  pinnedHoldMs: 3200,
  freeHoldMs: 6000,
  flyMs: 820,
  scanCollapseMs: 2700,
  scanDoneMs: 3300,
  xrayGapMs: 800,
  noticeMs: 2600,
}

// Where cards pin in the photo lives in ./scene.js.

// What the backend Cabinet should look like at the start of each moment.
// Every moment sets the Cabinet state it starts from (applied through the demo endpoint).
const BASE_STATE = { context_on: true, car_archived: false, dining_overridden: false, include_baby: false, flat_archived: false, synced: false, flat: false }
export const demoStateFor = (i) => ({ ...BASE_STATE, ...(MOMENTS[i]?.state || {}) })

export const syncedEntries = (cab) => (cab?.entries || []).filter((e) => e.synced_via === 'personal_ai')

const T = (text) => ({ text })
// dim = Lauri's own voice (shown with a mic icon), otherwise the agent speaks.
const cap = (key, parts, dim = false) => ({ key, parts, dim })
export const live = (cab, kind) => (cab?.entries || []).filter((e) => e.status !== 'archived' && (!kind || e.kind === kind))

// Cards have a title and a sub line: "Tight · ~18 mo" → "Tight" / "~18 mo".
export const splitTitle = (t = '') => { const [title, ...rest] = t.split(' · '); return { title, sub: rest.join(' · ') || null } }
export const fromBubble = (b, short = false) => {
  if (!b) return null
  const full = splitTitle(b.title)
  return { anchor: b.anchor || 'building', color: TONE[b.tone], icon: b.icon, badge: b.badge,
    title: short && b.short_title ? splitTitle(b.short_title).title : full.title, sub: full.sub }
}

export const NO_CONTEXT = {
  hero: { anchor: 'building', color: C.grey, title: 'Income? Savings?', sub: 'No context to read', icon: 'question' },
  caption: cap('off', [T('Enter your details to calculate.')]),
}

const answerView = ({ answer }) =>
  answer?.whisper?.bubble
    ? { hero: fromBubble(answer.whisper.bubble), caption: cap('ans', answer.whisper.caption) }
    : { hero: null, caption: cap('wait', []) }

export const lastAdded = (cab, ui) => live(cab).find((e) => e.id === ui.lastAddedId)
export const isSynced = (cab) => syncedEntries(cab).length > 0

// Moment flags read by App:
//   state      Cabinet state the moment starts from
//   ask        Lauri asks the question first (mic subtitle), then the agent answers
//   notify     the Personal AI notification may show (until the Cabinet is synced)
//   autoVoice  the glasses start listening on their own
//   autoScan / scanned   run the scan animation / the scan already happened
//   opensCabinet  the moment happens in the Cabinet; cabinetStep says what → does next there
//                 ('sync' | 'desync' | 'add' | 'wait' | 'done')
//   askAfter   when the Cabinet closes, Lauri asks again and the agent answers here
export const MOMENTS = [
  // ---- Scene 1: in front of the flat. The Cabinet doesn't know about the flat yet. ----
  {
    id: 'M1', name: 'Hook', state: {}, ask: true, notify: true,
    view: answerView, // the agent anchors on the old car goal: a generic, wrong answer
  },
  {
    id: 'M2', name: 'Personal AI sync', state: {}, notify: true, opensCabinet: true,
    cabinetStep: ({ cabinet }) => (syncedEntries(cabinet).length ? 'done' : 'sync'),
    view: ({ cabinet, answer }) => {
      const n = syncedEntries(cabinet).length
      if (n) return { hero: fromBubble(answer?.whisper?.bubble), caption: cap(`m2ok${n}`, [{ text: `${n} updates synced.`, tone: 'good' }]) }
      return { hero: null, caption: cap('m2', [T('Open your '), { text: 'Cabinet', source: 'customer' }, T(' to review them.')]) }
    },
  },
  {
    id: 'M3', name: 'Same question', state: { synced: true }, ask: true,
    view: answerView, // now cites the flat goal from the Personal AI and Nordea's ASP
  },
  // ---- Desync: what the agent knows without the Personal AI ----
  {
    id: 'M4', name: 'Desync', state: { synced: true }, opensCabinet: true, askAfter: true,
    cabinetStep: ({ cabinet }) => (cabinet?.entries.length ? 'desync' : 'done'),
    view: ({ ui, answer }) => (ui.answered ? answerView({ answer })
      : { hero: null, caption: cap('m4', [T('Open your '), { text: 'Cabinet', source: 'customer' }, T(' to desync.')]) }),
  },
  {
    id: 'M5', name: 'Add by hand', state: { synced: true, desynced: true }, opensCabinet: true, askAfter: true,
    cabinetStep: ({ cabinet, ui }) => (!live(cabinet, 'flat_goal').length ? 'add' : ui.contributing ? 'wait' : 'done'),
    view: ({ ui, answer }) => (ui.answered ? answerView({ answer })
      : { hero: null, caption: cap('m5', [T('Add your goal yourself, no '), { text: 'Personal AI', source: 'customer' }, T('.')]) }),
  },
  {
    id: 'M6', name: 'Sync again', state: { synced: true, desynced: true, manual_flat: true }, opensCabinet: true, askAfter: true,
    cabinetStep: ({ cabinet }) => (syncedEntries(cabinet).length ? 'done' : 'sync'),
    view: ({ ui, answer }) => (ui.answered ? answerView({ answer })
      : { hero: null, caption: cap('m6', [T('Sync your '), { text: 'Personal AI', source: 'customer' }, T(' again.')]) }),
  },
  {
    id: 'M7', name: 'Quick add', state: { synced: true }, autoVoice: true,
    pending: ({ cabinet, ui }) => (ui.voice && ui.voice.phase !== 'pinned' ? 'wait' : lastAdded(cabinet, ui) ? null : 'voice'),
    view: ({ cabinet, ui }) => {
      const e = lastAdded(cabinet, ui)
      if (e) return { hero: { anchor: 'skyLeft', color: C.green, ...splitTitle(e.title), icon: 'pin' }, caption: cap(`pin${e.id}`, [T('Pinned in '), { text: `${ui.pinSecs ?? 3} s.`, tone: 'good' }]) }
      return { hero: null, caption: cap('m7', [], true) } // the glasses are listening
    },
  },
  {
    id: 'M8', name: 'Auto-scan', state: { synced: true, include_baby: true }, autoScan: true,
    pending: ({ ui }) => (ui.scan !== 'done' ? 'finishScan' : null),
    view: ({ ui }) => ({
      hero: null,
      caption: ui.scan === 'done' && ui.signals.length
        ? cap('m8d', [{ text: `${ui.signals.length} from Nordea`, source: 'nordea' }, T(', all yours to check.')])
        : cap('m8', [T('Scanning what '), { text: 'Nordea', source: 'nordea' }, T(' knows…')]),
    }),
  },
  {
    id: 'M9', name: 'Takeaway', state: { synced: true, include_baby: true }, scanned: true,
    view: ({ answer }) => ({
      hero: fromBubble(answer?.whisper?.bubble, true),
      caption: cap(`m9${answer?.readiness?.tip_months}`, answer?.tip || []),
    }),
  },

  // ---- Scene 2: lunch at Field & Fork. The glasses read the menu and flag each item. ----
  {
    id: 'M10', name: 'Restaurant', scene: 'restaurant', state: { synced: true, include_baby: true }, scanned: true,
    view: ({ menu }) => menuView(menu, 'm10'),
  },
  {
    id: 'M11', name: 'Drop the goal', scene: 'restaurant', state: { synced: true, include_baby: true }, scanned: true,
    pending: ({ cabinet }) => (live(cabinet, 'flat_goal').length ? 'removeFlat' : null),
    view: ({ cabinet, menu }) => {
      if (live(cabinet, 'flat_goal').length)
        return { hero: menuView(menu, 'm11a').hero, caption: cap('m11ask', [T('“Delete my flat goal.”')], true) }
      return menuView(menu, 'm11b')
    },
  },
]

// The restaurant card and caption come straight from the agent's menu rating.
function menuView(menu, key) {
  const w = menu?.whisper
  if (!w) return { hero: null, caption: cap(`${key}wait`, [T('Reading the menu…')]) }
  const r = menu.menu_rating
  return { hero: fromBubble(w.bubble), caption: cap(`${key}-${r?.cap ?? 'none'}-${r?.over_count}-${r?.known}`, w.caption) }
}
