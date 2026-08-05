// The five grocery stores this household actually shops at.
//
// A meal's `store` says where its ingredients are bought, and it shows as a chip
// on the menu card so a week can be planned around one trip. That's only useful
// if the value is one of a handful of real, recognisable places — a field that
// can say anything ends up saying "a Middle Eastern market", which is a note to
// yourself, not a shopping trip. So the five below are the whole vocabulary.
//
// `store` stays optional. Meals cooked from whatever is already in the house set
// none, and so does anything that can't be honestly placed at one of the five.

const STORES = ["Trader Joe's", 'King Soopers', 'Costco', 'Safeway', 'Whole Foods']

const isStore = (value) => STORES.includes(value)

// A free-text shopping note -> one of the five, or undefined.
//
// The shared recipe library writes this field for its own purposes, and its
// notes are prose: "King Soopers (seafood counter)", "King Soopers + a Latin
// market for peppers", "H Mart or an Asian market". Where a note names one of
// the five, that's the trip; the trimmings are about which counter to visit.
//
// Where it names none of them, the answer is undefined rather than a guess.
// Sending somebody to Safeway for gochujang because it was the closest match
// would be worse than saying nothing — the note meant a specialty market, and
// none of the five is one.
function normalizeStore(note) {
  const text = String(note || '')
  if (!text.trim()) return undefined
  return STORES.find((store) => text.toLowerCase().includes(store.toLowerCase()))
}

module.exports = { STORES, isStore, normalizeStore }
