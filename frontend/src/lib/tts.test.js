import { expect, it } from 'vitest'
import { speakable } from './tts'

it('reads glasses shorthand naturally', () => {
  expect(speakable('Your 18-month plan vs your €22k ASP.')).toBe('Your 18-month plan vs your 22 thousand euros ASP.')
  expect(speakable('Save the raise too → ~10 months.')).toBe('Save the raise too, and you get there in about 10 months.')
  expect(speakable('Tight · ~18 mo')).toBe('Tight · about 18 months')
})
