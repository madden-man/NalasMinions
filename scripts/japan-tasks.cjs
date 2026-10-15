// The Japan trip's chores, one per Pre-Trip Checklist item on public/japan.html
// (anchored there as #item-<item>). `id` is the chore's stored id: the first 22
// keep the ids of the hand-made "Japan: …" chores lost in the 2026-10 wipe, so
// anything still holding those ids lines up; the Kumano safety items are new.
// `due` is the calendar day (America/Denver); the seed makes it a 9:00 AM dueAt
// with a day-before reminder.
//
// Edit here and re-run `npm run seed:japan` — entries upsert by id, so a re-seed
// updates text and dates without duplicating or touching done state.

const JAPAN_TASKS = [
  // Do now — time-sensitive
  { id: '1788481127023', item: 'ghibli-tickets', due: '2026-10-10', text: 'Japan: Ghibli Museum tickets', notes: 'Released Oct 10, 10 am JST on Lawson; sell out fast.' },
  { id: '1788481299463', item: 'teamlab-planets', due: '2026-10-20', text: 'Japan: teamLab Planets tickets for Nov 20', notes: 'Timed tickets sell out 1–2 weeks ahead.' },
  { id: '1788481347599', item: 'shibuya-sky', due: '2026-10-20', text: 'Japan: reserve a Shibuya Sky sunset slot for Nov 20' },
  { id: '1788481374598', item: 'teamlab-osaka', due: '2026-10-20', text: 'Japan: teamLab Botanical Garden (Osaka) tickets for Nov 8/9' },
  { id: '1788481377599', item: 'restaurant-reservations', due: '2026-10-20', text: 'Japan: restaurant reservations', notes: 'Kyoto kaiseki, Tokyo omakase, invite-only spots open 1–3 months out.' },
  { id: '1788481434598', item: 'kyoto-tea-ceremony', due: '2026-10-20', text: 'Japan: reserve a Kyoto tea ceremony' },
  { id: '1788481465609', item: 'cup-noodles-workshop', due: '2026-10-20', text: 'Japan: Cup Noodles Museum workshop (Nov 6), if wanted', notes: 'Chicken Ramen Factory workshop needs a reservation.' },
  { id: '1788481564612', item: 'verify-kyoto-lightups', due: '2026-10-25', text: 'Japan: verify Kyoto light-up dates cover Nov 15–19', notes: 'Kōdai-ji and Eikandō.' },
  { id: '1788481567612', item: 'transport-passes-seats', due: '2026-10-25', text: 'Japan: decide passes and reserve seats', notes: 'Shinkansen (Nov 8, 19), Kuroshio (Nov 10, 15), Kintetsu to Ise (Nov 18).' },
  { id: '1788481914608', item: 'print-kumano-voucher', due: '2026-10-25', text: 'Japan: print the Kumano Travel voucher', notes: 'From the Kumano Travel MyPage (DP200503).' },
  // Documents & health
  { id: '1788495874655', item: 'visit-japan-web', due: '2026-10-25', text: 'Japan: Visit Japan Web pre-registration for both', notes: 'Immigration and customs QR codes; screenshot them.' },
  { id: '1788495877654', item: 'medication-check', due: '2026-10-20', text: 'Japan: medication check', notes: 'Adderall/Vyvanse and pseudoephedrine are restricted; may need a Yakkan Shōmei. Bring 23 days of prescriptions + motion-sickness pills.' },
  { id: '1788495889651', item: 'travel-insurance', due: '2026-10-20', text: 'Japan: travel medical/evacuation insurance', notes: 'Confirm it is bought and covers hiking and emergency evacuation (Kumano Kodo).' },
  // Money & connectivity
  { id: '1788495892654', item: 'esim-wifi', due: '2026-10-28', text: 'Japan: eSIM / pocket Wi-Fi + offline maps', notes: 'Trail signal is patchy.' },
  { id: '1788495904654', item: 'trail-cash', due: '2026-11-10', text: 'Japan: withdraw trail cash before leaving Tanabe', notes: '7-Eleven / Japan Post ATMs. Keep ¥10k aside for an emergency taxi.' },
  { id: '1788495907654', item: 'no-fx-cards', due: '2026-10-25', text: 'Japan: confirm no-foreign-transaction-fee cards; notify banks' },
  { id: '1788495918655', item: 'ito-credit-check', due: '2026-10-25', text: 'Japan: confirm Itō Ryokuyu takes credit at checkout', notes: '¥492,500 pay-at-hotel.' },
  { id: '1788495921652', item: 'park-hyatt-cancel-date', due: '2026-10-16', text: 'Japan: Park Hyatt free cancellation ends ~Oct 16', notes: 'After that, cancelling forfeits one night.' },
  // Packing
  { id: '1788495932655', item: 'packing-hiking-gear', due: '2026-10-28', text: 'Japan: pack hiking gear', notes: 'Broken-in boots, headlamp, poles, rain shell, quick-dry layers, blister kit.' },
  { id: '1788495935654', item: 'packing-battery-adapter', due: '2026-10-28', text: 'Japan: portable battery + chargers', notes: 'Japan is Type-A, 100 V; US plugs fit.' },
  { id: '1788495946655', item: 'packing-copies', due: '2026-10-28', text: 'Japan: printed/offline copies of reservations + passport photocopies' },
  // Home
  { id: '1788495949655', item: 'home-logistics', due: '2026-10-27', text: 'Japan: home logistics for 23 days away', notes: 'Mail hold, home/pet/plant care, autopay/bills, thermostat.' },
  // Kumano safety
  { id: 'japan-kumano-emergency-card', item: 'kumano-emergency-card', due: '2026-10-27', text: 'Japan: Kumano emergency card', notes: 'Save 119 / 110 / Visitor Hotline 050-3816-2787, the five lodge numbers and the insurance line in both phones; print one per daypack.' },
  { id: 'japan-kumano-first-aid', item: 'kumano-first-aid', due: '2026-10-27', text: 'Japan: build the trail first-aid kit', notes: 'Blister supplies, elastic bandage, antihistamine, tweezers, emergency blanket, two whistles, spare headlamp batteries.' },
  { id: 'japan-kumano-safety-app', item: 'kumano-safety-app', due: '2026-10-28', text: 'Japan: install Safety Tips + offline Nakahechi maps' },
  { id: 'japan-kumano-share-plan', item: 'kumano-share-plan', due: '2026-10-28', text: 'Japan: share the Kumano stage plan with someone at home', notes: 'Lodge names per night and a nightly check-in.' },
  { id: 'japan-kumano-bus-times', item: 'kumano-bus-times', due: '2026-10-28', text: 'Japan: screenshot Kumano bus times', notes: 'Kii-Tanabe → Takijiri (Nov 10), Chikatsuyu → Hosshinmon-ōji (Nov 12).' },
  { id: 'japan-kumano-conditions', item: 'kumano-conditions', due: '2026-11-09', text: 'Japan: check Kumano forecast + trail closures', notes: 'JMA forecast and the Tanabe tourism bureau trail notices; pick a Plan B for any rainy stage.' },
]

module.exports = { JAPAN_TASKS }
