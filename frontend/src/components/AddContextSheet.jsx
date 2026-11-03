// Adding context by hand (no Personal AI): one line of text, at the bottom of the
// Cabinet like the sync deck, so the orbit stays visible above it. The text is prefilled
// and not auto-focused, so → (the presenter's next key) submits it; Enter works when typing.
import Icon from './Icon'

export const addSpace = (W) => (W < 640 ? 236 : 214)

export default function AddContextSheet({ text, onChange, onSubmit, onClose }) {
  return (
    <div className="airlock" role="dialog" aria-label="Add context yourself">
      <form className="al-shell why addsheet" onSubmit={(e) => { e.preventDefault(); onSubmit(text) }}>
        <header className="al-top">
          <span className="al-who"><Icon name="keys" size={16} sw={2} />Add context yourself</span>
          <button type="button" className="al-x" aria-label="Cancel" onClick={onClose}><Icon name="close" size={16} /></button>
        </header>
        <p className="why-reason">Just what you type. No Personal AI, no calendar, no notes.</p>
        <input id="add-context" className="add-input" value={text} maxLength={80}
          onChange={(e) => onChange(e.target.value)} aria-label="Your goal or context" />
        <span className="al-actions">
          <button type="button" className="chip" onClick={onClose}>Cancel</button>
          <button type="submit" className="chip primary" disabled={!text.trim()}>Add to Cabinet</button>
        </span>
      </form>
    </div>
  )
}
