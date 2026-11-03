import { describe, expect, it } from 'vitest'
import { cardsFrom, kindIcon, partsText, sourceLabel } from './model'

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

describe('partsText', () => {
  it('joins caption parts word for word', () => {
    expect(partsText([{ text: 'Your ' }, { text: '18-month plan' }])).toBe('Your 18-month plan')
    expect(partsText(undefined)).toBe('')
  })
})
