// The Japan packing list's chores (public/japan-packing.html, at /japan-packing).
// `section` is the anchor on that page; `due` is the local time
// (America/Denver) the chore is due, with a day-before reminder. The flight
// leaves DEN Fri Oct 30 at 12:20 pm.
//
// Edit here and re-run `npm run seed:japan-packing` — entries upsert by id, so
// a re-seed updates text and times without duplicating or touching done state.

const JAPAN_PACKING_TASKS = [
  { id: 'rei-run', assignee: 'Tommy', due: '2026-10-27T17:00', section: 'rei', text: 'Japan: REI run', notes: 'Everything on the "To buy at REI" list at the top of /japan-packing. Check each off in the store and it drops back into the packing list.' },
  { id: 'pack-tommy', assignee: 'Tommy', due: '2026-10-29T19:00', section: 'pack', text: 'Japan: pack (Tommy)', notes: 'Tap T on each item on /japan-packing as it goes in the bag. The Tommy toggle in the top bar hides Alison\'s checks.' },
  { id: 'pack-alison', assignee: 'Alison', due: '2026-10-29T19:00', section: 'pack', text: 'Japan: pack (Alison)', notes: 'Tap A on each item on /japan-packing as it goes in the bag. The Alison toggle in the top bar hides Tommy\'s checks.' },
]

module.exports = { JAPAN_PACKING_TASKS }
