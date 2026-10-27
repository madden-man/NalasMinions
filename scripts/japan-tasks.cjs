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
  { id: '1788481299463', item: 'teamlab-planets', due: '2026-10-20', text: 'Japan: teamLab Planets tickets for Nov 20', notes: 'Booked Oct 22: Nov 20, 9:00–9:30 am entry, 2 adults, ¥10,400. QR on My Tickets from midnight; changeable up to 3× until 2 h before.' },
  { id: '1788481347599', item: 'shibuya-sky', due: '2026-10-20', text: 'Japan: reserve a Shibuya Sky slot for Nov 20', notes: 'Pick a 3:30 to 4 pm entry for the 4:30 sunset.' },
  { id: '1788481374598', item: 'teamlab-osaka', due: '2026-10-20', text: 'Japan: teamLab Botanical Garden (Osaka) tickets for Nov 8/9', notes: 'Booked Oct 22: Sun Nov 8, 8:30–9:30 pm, 2 adults, ¥4,400, inquiry no. NNF77F7NPXAH-0001.' },
  { id: '1788481377599', item: 'restaurant-reservations', due: '2026-10-20', text: 'Japan: restaurant reservations', notes: 'Kyoto done via the Park Hyatt concierge: Kikunoi Honten Nov 15 19:00 for two (moved from 18:00) (¥55,000/person course + service), Mishima-tei Honten Nov 16 17:30 for three (sukiyaki; Nov 18 for five was full). Nov 18 Kyoto dinner and Tokyo still open; see the Tokyo dinners chore.' },
  { id: 'japan-tokyo-dinners', item: 'tokyo-dinners', due: '2026-10-28', text: 'Japan: book Tokyo dinners for Nov 19–21', notes: 'Blossom Shinjuku will not book for guests. Their picks: Yurakucho Kakida 050-5600-7301, Sushi Ju 050-5872-5877 (sushi); Sagano Sakaba 03-6258-5221, Ika no Sumi 050-5593-0432 (yakitori); Teppanyaki 10 Shibuya 050-5868-7263 (Scramble Square 12F, by Shibuya Sky for Nov 20). Phone or TableCheck.' },
  { id: '1788481434598', item: 'kyoto-tea-ceremony', due: '2026-10-20', text: 'Japan: reserve a Kyoto tea ceremony', notes: 'Requested Oct 26: private tea at Kōrin-in, Nov 17 early afternoon (2 pm asked), five people, ~¥66,000 on the room bill. Concierge asked the temple Oct 27; waiting on the time. Full fee applies from that ask.' },
  { id: '1788481465609', item: 'cup-noodles-workshop', due: '2026-10-20', text: 'Japan: Cup Noodles Museum workshop (Nov 6), if wanted', notes: 'Chicken Ramen Factory workshop needs a reservation.' },
  { id: '1788481564612', item: 'verify-kyoto-lightups', due: '2026-10-25', text: 'Japan: verify Kyoto light-up dates cover Nov 15–19', notes: 'Kōdai-ji and Eikandō.' },
  { id: '1788481567612', item: 'transport-passes-seats', due: '2026-10-25', text: 'Japan: book the Nov 15 Kuroshio', notes: 'Booked Oct 27: Kuroshio 22, Shingū 11:27 to Shin-Osaka 15:51, car 3 seats 8-C/8-D, JR-West 45822. All nine rides are booked, including the Nov 6 Odoriko 2 (Itō 11:08, car 1 seats 5-A/5-B). Collect both Kuroshio paper tickets (43453, 45822) at a 5489 machine before Nov 10.' },
  { id: '1788481914608', item: 'print-kumano-voucher', due: '2026-10-25', text: 'Japan: print the Kumano Travel voucher', notes: 'From the Kumano Travel MyPage (DP200503).' },
  // Documents & health
  { id: '1788495874655', item: 'visit-japan-web', due: '2026-10-25', text: 'Japan: Visit Japan Web pre-registration for both', notes: 'Immigration and customs QR codes; screenshot them.' },
  { id: '1788495877654', item: 'medication-check', due: '2026-10-20', text: 'Japan: medication check', notes: 'Adderall/Vyvanse and pseudoephedrine are restricted; may need a Yakkan Shōmei. Bring 23 days of prescriptions + motion-sickness pills.' },
  { id: '1788495889651', item: 'travel-insurance', due: '2026-10-20', text: 'Japan: travel medical/evacuation insurance', notes: 'Bought Sep 26: IMG Patriot International Lite, PATII86911273, both of you, Oct 31 to Nov 22, $53.48. 24/7 +1 317 655 4500. Print ID cards from MyIMG plan documents.' },
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
  { id: 'japan-kumano-bus-times', item: 'kumano-bus-times', due: '2026-10-28', text: 'Japan: screenshot Kumano bus times', notes: 'Kii-Tanabe → Takijiri (Nov 10, the 10:30 Ryūjin bus, route 81), Chikatsuyu → Hosshinmon-ōji (Nov 12).' },
  { id: 'japan-kumano-conditions', item: 'kumano-conditions', due: '2026-11-09', text: 'Japan: check Kumano forecast + trail closures', notes: 'JMA forecast and the Tanabe tourism bureau trail notices; pick a Plan B for any rainy stage.' },
  { id: 'japan-kumano-nov14-fallback', item: 'kumano-nov14-fallback', due: '2026-11-13', text: 'Japan: confirm the Nov 14 fallback with @koguchi', notes: 'Ask @koguchi to confirm the Nov 14 fallback (morning bus or taxi to Kii-Katsuura). Phone Hotel Urashima for its last ferry time and dinner seating.' },
]

module.exports = { JAPAN_TASKS }
