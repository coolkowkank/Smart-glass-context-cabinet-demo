import { describe, expect, it } from 'vitest'
import { openBus } from './bus'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

describe('bus', () => {
  it('delivers versioned messages to other instances, not to itself, and closes cleanly', async () => {
    const got = []
    const a = openBus(() => got.push('a-self'))
    const b = openBus((m) => got.push(m))
    a.post({ type: 'hello' })
    await wait(50)
    expect(got).toEqual([{ v: 1, type: 'hello' }])
    b.close()
    a.post({ type: 'moment', m: 1 })
    await wait(50)
    expect(got.length).toBe(1)
    a.close()
  })
  it('drops messages without type/version', async () => {
    const got = []
    const b = openBus((m) => got.push(m))
    const raw = new BroadcastChannel('smartglass-demo')
    raw.postMessage({ type: 'x' })
    raw.postMessage('nope')
    await wait(50)
    expect(got).toEqual([])
    raw.close(); b.close()
  })
})
