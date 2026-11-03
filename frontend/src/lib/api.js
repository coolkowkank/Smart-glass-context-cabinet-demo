// Talks to the FastAPI + LangGraph backend. Falls back to the offline agent
// when the API is not reachable (or VITE_OFFLINE=true).
import demoMenu from '../../../shared/menu_field_and_fork.json'
import { createLocalAgent } from './localAgent'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function fetchWithTimeout(url, opts = {}, ms = 1500) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

function httpAgent(health) {
  const call = async (method, path, body) => {
    const res = await fetch(API + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    return res.json()
  }
  return {
    mode: 'live',
    llm: health.llm,
    setContext: (u, on) => call('POST', `/api/cabinet/${u}/context`, { on }),
    archive: (u, id) => call('POST', `/api/cabinet/${u}/entries/${id}/archive`),
    restore: (u, id) => call('POST', `/api/cabinet/${u}/entries/${id}/restore`),
    override: (u, id, reason) => call('POST', `/api/cabinet/${u}/entries/${id}/override`, { reason }),
    clearOverride: (u, id) => call('DELETE', `/api/cabinet/${u}/entries/${id}/override`),
    answer: (u) => call('POST', `/api/agent/${u}/answer`),
    ask: (u, question) => call('POST', `/api/agent/${u}/ask`, { question, rephrase: true }),
    add: (u, text) => call('POST', `/api/agent/${u}/add`, { text }),
    audit: (u, id) => call('POST', `/api/agent/${u}/audit/${id}`),
    scan: (u) => call('POST', `/api/agent/${u}/scan`),
    rateMenu: (u, items = demoMenu.items) => call('POST', `/api/agent/${u}/menu`, { items }),
    stageSync: (u) => call('POST', `/api/agent/${u}/sync/stage`),
    desync: (u) => call('POST', `/api/cabinet/${u}/desync`),
    addGoal: (u, entry) => call('POST', `/api/cabinet/${u}/goals`, entry ? { entry } : {}),
    nordeaContribute: (u) => call('POST', `/api/cabinet/${u}/nordea/contribute`),
    applySync: (u, approved_ids) => call('POST', `/api/cabinet/${u}/sync/apply`, { approved_ids }),
    demoState: (u, state) => call('POST', `/api/demo/${u}/state`, state),
  }
}

export async function connect() {
  if (import.meta.env.VITE_OFFLINE === 'true') return createLocalAgent()
  try {
    const res = await fetchWithTimeout(`${API}/api/health`)
    if (res.ok) return httpAgent(await res.json())
  } catch {
    /* fall through to offline */
  }
  return createLocalAgent()
}
