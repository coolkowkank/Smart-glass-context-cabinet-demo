import { describe, expect, it } from 'vitest'
import { captionText, reduceThread } from './thread'

const cap = (m, key, text, dim = false) => ({ type: 'caption', m, key, text, dim })

describe('reduceThread', () => {
  it('appends captions word for word with the dim flag', () => {
    let t = []
    t = reduceThread(t, cap(0, 'ask0', '“Am I on track?”', true))
    t = reduceThread(t, cap(0, 'ans', 'At €182/mo, your 2023 car goal needs ~82 months.'))
    expect(t.map((x) => [x.dim, x.text])).toEqual([[true, '“Am I on track?”'], [false, 'At €182/mo, your 2023 car goal needs ~82 months.']])
  })
  it('skips empty captions (listen phase)', () => {
    expect(reduceThread([], cap(0, 'listen1', ''))).toEqual([])
    expect(reduceThread([], cap(0, 'listen1', '   '))).toEqual([])
  })
  it('is idempotent for repeated captions and updates changed text', () => {
    const a = reduceThread([], cap(1, 'k', 'one'))
    expect(reduceThread(a, cap(1, 'k', 'one'))).toBe(a)
    expect(reduceThread(a, cap(1, 'k', 'two'))).toEqual([{ m: 1, key: 'k', dim: false, text: 'two' }])
  })
  it('moment truncates that moment and later ones (going back replays)', () => {
    let t = []
    for (const m of [0, 1, 2]) t = reduceThread(t, cap(m, 'k', `m${m}`))
    t = reduceThread(t, { type: 'moment', m: 1 })
    expect(t.map((x) => x.text)).toEqual(['m0'])
    t = reduceThread(t, cap(1, 'k', 'm1'))
    expect(t.map((x) => x.text)).toEqual(['m0', 'm1'])
  })
  it('reset clears, snapshot replaces', () => {
    const t = reduceThread([], cap(0, 'k', 'x'))
    expect(reduceThread(t, { type: 'reset' })).toEqual([])
    const snap = [{ m: 3, key: 'a', dim: false, text: 'hi' }]
    expect(reduceThread(t, { type: 'snapshot', thread: snap })).toEqual(snap)
    expect(reduceThread(t, { type: 'snapshot' })).toEqual([])
  })
  it('ignores unknown events', () => {
    const t = [{ m: 0, key: 'k', dim: false, text: 'x' }]
    expect(reduceThread(t, { type: 'state' })).toBe(t)
  })
})

describe('captionText', () => {
  it('joins parts', () => {
    expect(captionText({ parts: [{ text: 'Your ' }, { text: 'plan' }] })).toBe('Your plan')
    expect(captionText(undefined)).toBe('')
  })
})
