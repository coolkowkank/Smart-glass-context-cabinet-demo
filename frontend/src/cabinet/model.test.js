import { describe, expect, it } from 'vitest'
import { cardsFrom, kindIcon, partsText, sourceLabel, usedIds } from './model'

const cab = {
  entries: [
    { id: 'car', kind: 'car_goal', status: 'stale', title: 'Car goal' },
    { id: 'salary', kind: 'income', status: 'active', title: 'Salary +12%' },
    { id: 'asp', kind: 'savings', status: 'active', title: 'ASP €22k' },
    { id: 'old', kind: 'spending', status: 'archived', title: 'Old signal' },
  ],
}

describe('cardsFrom', () => {
  it('puts cited cards first, archived last, preserving order inside groups', () => {
    const { cited, other, archived } = cardsFrom(cab, ['asp', 'salary'])
    expect(cited.map((c) => c.id)).toEqual(['salary', 'asp'])
    expect(cited.every((c) => c.used)).toBe(true)
    expect(other.map((c) => c.id)).toEqual(['car'])
    expect(archived.map((c) => c.id)).toEqual(['old'])
  })
  it('handles an empty cabinet and no citations', () => {
    expect(cardsFrom(null, [])).toEqual({ cited: [], other: [], archived: [] })
    expect(cardsFrom(cab).cited).toEqual([])
  })
})

describe('labels', () => {
  it('maps kinds to icons with a fallback', () => {
    expect(kindIcon('flat_goal')).toBe('home')
    expect(kindIcon('unknown_kind')).toBe('note')
  })
  it('names the card source for the audience', () => {
    expect(sourceLabel('customer')).toBe('Lauri')
    expect(sourceLabel('nordea')).toBe('Nordea')
  })
})

describe('usedIds (glasses parity, Orbit rule)', () => {
  it('known answers use readiness citations', () => {
    expect(usedIds({ readiness: { known: true, citations: ['flat', 'asp'] } })).toEqual(['flat', 'asp'])
  })
  it('M1/M2 anchored answer reads the old goal and salary', () => {
    expect(usedIds({ readiness: { known: false }, anchored: { goal_id: 'car' } })).toEqual(['car', 'salary'])
  })
  it('M6 partial answer reads the typed goal and ASP', () => {
    expect(usedIds({ readiness: { known: false }, partial: { goal_id: 'flat' } })).toEqual(['flat', 'asp'])
  })
  it('no answer means no used cards', () => {
    expect(usedIds(null)).toEqual([])
    expect(usedIds({ readiness: { known: false } })).toEqual([])
  })
})

describe('partsText', () => {
  it('joins caption parts word for word', () => {
    expect(partsText([{ text: 'Your ' }, { text: '18-month plan' }])).toBe('Your 18-month plan')
    expect(partsText(undefined)).toBe('')
  })
})
