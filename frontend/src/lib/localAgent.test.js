import { describe, expect, it } from 'vitest'
import cases from '../../../shared/readiness_cases.json'
import { createLocalAgent, readiness, shortenTitle } from './localAgent'

describe('offline agent matches the shared readiness cases', () => {
  for (const c of cases.cases) {
    it(c.name, () => {
      const agent = createLocalAgent()
      const cab = agent._ops.applyDemoState('lauri', { ...c.state, include_baby: false })
      const r = readiness(cab)
      for (const [k, v] of Object.entries(c.expect)) expect(r[k], k).toEqual(v)
    })
  }
})

describe('offline agent responses', () => {
  it('walks the storyboard', async () => {
    const a = createLocalAgent()
    let res = await a.demoState('lauri', { context_on: true, car_archived: false, dining_overridden: false, include_baby: false, flat: true })
    expect(res.whisper.bubble.title).toBe('Tight · ~18 mo')
    expect(res.suggestions[0].label).toBe('Car goal · idle since 2023')
    await a.archive('lauri', 'car')
    res = await a.answer('lauri')
    expect(res.whisper.bubble.title).toBe('On track · ~14 mo')
    expect(res.spare[0].text).toBe('4 months')
    await a.override('lauri', 'dining', 'Kitchen renovation / hosting')
    res = await a.answer('lauri')
    expect(res.whisper.bubble.badge).toBeNull()
    expect(res.tip.at(-1).text).toBe('~10 months.')
    res = await a.add('lauri', 'Expecting a baby next autumn')
    expect(res.new_entry.title).toBe('Baby · autumn')
    res = await a.scan('lauri')
    expect(res.signals.map((s) => s.label)).toEqual(['Salary +12%', 'ASP €22k', 'Dining +45%'])
  })

  it('shortens notes like the backend', () => {
    expect(shortenTitle('Expecting a baby next autumn')).toBe('Baby · autumn')
    expect(shortenTitle('Planning to renovate the kitchen in spring')).toBe('Renovate · kitchen spring')
    expect(shortenTitle('We are moving to Espoo in spring')).toBe('Moving · Espoo spring')
  })
})

describe('Personal AI sync (offline agent matches backend)', () => {
  it('first answer anchors on the old car goal, until the flat goal is synced', async () => {
    const a = createLocalAgent()
    let r = await a.answer('lauri')
    expect(r.whisper.bubble.title).toBe('Car goal · ~82 mo')
    expect(r.whisper.caption.map((p) => p.text).join('')).toBe('At €182/mo, your 2023 car goal needs ~82 months.')
    r = await a.applySync('lauri', null)
    expect(r.cabinet.entries[0].id).toBe('flat')
    expect(r.whisper.bubble.title).toBe('On track · ~14 mo')
  })

  it('stages without writing, then applies only what was approved', async () => {
    const a = createLocalAgent()
    const s = await a.stageSync('lauri')
    expect(s.sync_staging.proposals.map((p) => p.id)).toEqual(['sync-flat', 'sync-car-stale', 'sync-dining-override', 'sync-salary-ack'])
    expect(s.cabinet.entries.find((e) => e.id === 'car').status).toBe('stale')
    let r = await a.applySync('lauri', ['sync-dining-override'])
    expect(r.whisper.bubble.title).toBe('Car goal · ~82 mo') // still no flat goal: answer anchored on the car
    expect(r.cabinet.entries.find((e) => e.id === 'dining').override_reason).toBe('Temporary: Q3 busy work sprint')
    r = await a.applySync('lauri', null)
    expect(r.whisper.bubble.title).toBe('On track · ~14 mo')
    expect(r.cabinet.entries.filter((e) => e.synced_via === 'personal_ai').map((e) => e.id).sort()).toEqual(['car', 'dining', 'flat', 'salary'])
    await expect(a.applySync('lauri', ['sync-vineyard'])).rejects.toThrow('Unknown')
  })
})

describe('restaurant menu (offline agent matches backend)', () => {
  it('flags 5 dishes over the flat-plan budget, then none without the goal', async () => {
    const a = createLocalAgent()
    a._ops.applySync('lauri', ['sync-flat'])
    let r = await a.rateMenu('lauri')
    expect(r.menu_rating.cap).toBe(12)
    expect(r.menu_rating.items).toHaveLength(27)
    expect(r.menu_rating.items.filter((i) => !i.fits).map((i) => i.id).sort())
      .toEqual(['casarecce-pasta', 'harvest-bowl', 'homestead-burger', 'sandwich-1', 'sandwich-2'])
    expect(r.whisper.caption.map((p) => p.text).join('')).toBe('5 dishes are over your flat-plan budget.')
    await a.archive('lauri', 'car') // as in the storyboard: the sync already archived it
    await a.archive('lauri', 'flat')
    r = await a.rateMenu('lauri')
    expect(r.menu_rating.over_count).toBe(0)
    expect((await a.answer('lauri')).whisper.bubble.title).toBe('No goal to track')
  })
})

describe('desync (offline agent matches backend)', () => {
  it('empties, gives a generic answer from a hand-typed goal, then re-syncs', async () => {
    const a = createLocalAgent()
    await a.applySync('lauri', null)
    let r = await a.desync('lauri')
    expect(r.cabinet.entries).toEqual([])
    expect(r.whisper.bubble.title).toBe('No goal to track')
    await a.addGoal('lauri')
    r = await a.nordeaContribute('lauri')
    expect(r.contributed.map((e) => e.id)).toEqual(['asp'])
    expect(r.whisper.bubble.title).toBe('Keep saving · €22k saved, no target yet')
    expect(r.partial.goal_id).toBe('flat') // the orbit tethers the goal and the ASP
    expect(r.whisper.caption.map((p) => p.text).join('')).toBe('€22k saved for a flat in 18 months. Keep going!')
    r = await a.applySync('lauri', null)
    expect(r.cabinet.entries.map((e) => e.id).sort()).toEqual(['asp', 'car', 'dining', 'flat', 'salary'])
    expect(r.whisper.bubble.title).toBe('On track · ~14 mo')
  })
})
