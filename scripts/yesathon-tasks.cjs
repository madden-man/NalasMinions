// The Yes-a-thon food plan (Oct 17–19, 2026), one chore per cooking cue, in
// weekend order. `at` is the local time (America/Denver) the chore is due and
// its reminder fires; `section` is the anchor on /yesathon (public/yesathon.html)
// that holds the recipe or list. The marathon itself is on
// tommysthoughts.com/fornow.
//
// Edit here and re-run `npm run seed:yesathon` — entries upsert by id, so a
// re-seed updates text and times without duplicating or touching done state.

const YESATHON_TASKS = [
  { id: 'shop', at: '2026-10-17T14:30', section: 'list', text: 'Yes-a-thon grocery run at King Soopers', notes: 'The whole list is on /yesathon, in aisle order. Be home by 3:45 so the fridge is loaded before Brooklyn Nine-Nine at 4.' },
  { id: 'pizza', at: '2026-10-17T18:15', section: 'recipe-pizza', text: 'Oven on for pizza (425°F)', notes: 'Pizza goes in at the 6:30 break, during Tetris credits. Pepperoni and hot honey.' },
  { id: 'pancakes', at: '2026-10-18T08:35', section: 'recipe-pancakes', text: 'Bacon in the oven, then pancakes', notes: 'Cook the whole pack of bacon; half of it is Sunday’s breakfast burritos.' },
  { id: 'grilled-cheese', at: '2026-10-18T12:30', section: 'recipe-grilled-cheese', text: 'Grilled cheese and tomato soup', notes: 'Lunch break between Dances with Wolves and Saving Private Ryan.' },
  { id: 'tacos', at: '2026-10-18T18:45', section: 'recipe-tacos', text: 'Taco night', notes: 'Brown the whole pound of beef; half goes in the fridge for Sunday nachos.' },
  { id: 'pie', at: '2026-10-19T00:15', section: 'pairings', text: 'Cherry pie and coffee for Twin Peaks', notes: 'Decaf, unless you want to see the Red Room for real.' },
  { id: 'burritos', at: '2026-10-19T08:40', section: 'recipe-burritos', text: 'Breakfast burritos', notes: 'Scrambled eggs, Saturday’s bacon, cheese, salsa. Wrap one for during Pluto.' },
  { id: 'nachos', at: '2026-10-19T12:25', section: 'recipe-nachos', text: 'Leftover-taco nachos', notes: 'Sheet pan, 400°F, 7 minutes.' },
  { id: 'steak', at: '2026-10-19T18:20', section: 'recipe-steak', text: 'Steak night: potato in the microwave, steak in the pan', notes: 'Last real meal of the weekend. Lemon meringue pie for dessert if any survived Saturday.' },
  { id: 'cleanup', at: '2026-10-20T09:00', section: 'leftovers', text: 'Clean up after the Yes-a-thon', notes: 'Wipe down the kitchen, trash and recycling out, leftovers labeled.' },
]

module.exports = { YESATHON_TASKS }
