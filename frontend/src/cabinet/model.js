// Pure helpers for the Window 2 Cabinet view. Kept separate so the
// grouping rules are unit-tested without rendering.

const KIND_ICON = {
  flat_goal: 'home',
  car_goal: 'keys',
  income: 'bank',
  savings: 'vault',
  spending: 'fork',
  baby_goal: 'sparkle',
  renovation_goal: 'note',
}
export const kindIcon = (kind) => KIND_ICON[kind] || 'note'

export const SOURCE_LABEL = { customer: 'Lauri', nordea: 'Nordea' }
export const sourceLabel = (s) => SOURCE_LABEL[s] || s || 'Unknown'

// Cards the agent used for the current answer come first (citations),
// then the rest of the live Cabinet, then archived cards. Order inside
// each group follows the Cabinet's own order so reorganisation between
// steps is visible and stable.
export function cardsFrom(cabinet, citations = []) {
  const cited = [], other = [], archived = []
  for (const e of cabinet?.entries || []) {
    const card = { ...e, used: citations.includes(e.id) }
    if (e.status === 'archived') archived.push(card)
    else if (card.used) cited.push(card)
    else other.push(card)
  }
  return { cited, other, archived }
}

// Word-for-word text of a caption/answer, shared with the chat window later.
export const partsText = (parts = []) => (parts || []).map((p) => p.text).join('')
