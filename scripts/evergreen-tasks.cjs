// The Evergreen emergency prep plan for 29866 Woods Dr, one entry per task,
// grouped by area as in the Evergreen Emergency Preparedness doc. Both
// `npm run seed:evergreen` (chores) and `npm run build:evergreen` (the page at
// /evergreen) read this file, so edit here and re-run both.
//
// `when` is the label the page shows. `due` is the calendar day (America/Denver)
// the chore lands on; null means a habit (Red Flag days, every hike) that lives
// on the page only and is never seeded. `recurrence` is passed to the chore
// when the app supports the cadence (monthly); yearly tasks are seeded at
// their next occurrence and say so in their notes. Text may hold [label](url)
// links: the page renders them, the chore keeps just the label.

const AREAS = [
  { key: 'house', emoji: '🏠', name: 'House', hazards: ['wildfire', 'winter', 'floods', 'home'],
    intro: "The August 2026 inspection's safety items, in the order the hazards need them: gas and freeze first, roof before hail season, drainage in spring." },
  { key: 'alerts', emoji: '📣', name: 'Alerts', hazards: ['wildfire', 'floods'],
    intro: 'LookoutAlert only reaches phones registered to the address; it is the one registration that matters.' },
  { key: 'wildfire', emoji: '🔥', name: 'Wildfire', hazards: ['wildfire'],
    intro: 'The free assessment sets the order; the zones and the roof are the work; the insurer gets the letter.' },
  { key: 'power', emoji: '⚡', name: 'Power', hazards: ['winter'],
    intro: 'Water keeps flowing without power (Evergreen Metro, no well); the boiler does not, so these two tasks are the heat.' },
  { key: 'winter', emoji: '❄️', name: 'Winter', hazards: ['winter'],
    intro: 'The traction law runs September 1 to May 31 on I-70; the house\'s freeze risk is the unprotected rear faucets.' },
  { key: 'home', emoji: '🛠️', name: 'Home hazards', hazards: ['home'],
    intro: 'Natural gas boiler, gas fireplace, unvented gas range, attached garage: alarms first, then the fireplace, then radon.' },
  { key: 'supplies', emoji: '🎒', name: 'Supplies', hazards: ['winter', 'wildfire'],
    intro: 'The kit lists are on the grab sheet; these are the build and the two swaps a year.' },
  { key: 'plan', emoji: '🗺️', name: 'Plan', hazards: ['wildfire', 'winter'],
    intro: 'The grab sheet is the plan; these tasks make it real.' },
  { key: 'nala', emoji: '🐾', name: 'Nala', hazards: ['hiking', 'home', 'wildfire'],
    intro: 'With a dog we are a Warning household: we leave at the Evacuation Warning, and she never goes out alone at dusk.' },
  { key: 'hiking', emoji: '🥾', name: 'Hiking', hazards: ['hiking', 'floods'],
    intro: 'Two purchases and two habits.' },
  { key: 'wildlife', emoji: '🦌', name: 'Wildlife', hazards: ['home'],
    intro: 'Bears in the fall, elk in the spring, lions all year (that one is Nala\'s dusk rule).' },
]

const EVERGREEN_TASKS = [
  // House
  { id: 'house-1', area: 'house', when: 'Oct 2026', due: '2026-10-19', short: 'Fix the gas line + water heater pipe', text: 'Plumber: replace the corroded exterior gas lines on the right side and fix the moisture source; correct the water heater TPR discharge pipe in the same visit (inspection items 33 and 34)' },
  { id: 'house-2', area: 'house', when: 'Oct 2026', due: '2026-10-20', short: 'Frost-proof the rear faucets', text: 'Frost-protected exterior faucets with shutoff valves at the rear, before the first hard freeze (item 35)' },
  { id: 'house-3', area: 'house', when: 'Oct 2026', due: '2026-10-25', short: 'Tag the shutoffs', text: 'Tag the shutoffs: water main, gas meter valve with a wrench hung on it, boiler gas and water valves, breaker panel; label the panel (item 27)' },
  { id: 'house-4', area: 'house', when: 'Oct 2026', due: '2026-10-22', short: 'Look up WUI class and flood zone', text: 'Look up the Jeffco WUI class and the FEMA flood zone; confirm Evergreen Metro District serves water and sewer' },
  { id: 'house-5', area: 'house', when: 'Nov 2026', due: '2026-11-09', short: 'Roof repair', text: 'Roofer: repair the 3-tab asphalt roof and exposed nails, straighten the chimney crown, five-year certification; Class A assembly when it is replaced (items 15 and 17)' },
  { id: 'house-6', area: 'house', when: 'Nov 2026', due: '2026-11-14', short: 'Garage door works by hand', text: 'Garage door springs adjusted so the door lifts by hand in an outage; dead garage outlet fixed (items 4 and 29)' },
  { id: 'house-7', area: 'house', when: 'Jan 2027', due: '2027-01-16', short: 'Electrician: GFCIs, insulation, door sweep', text: 'Electrician: GFCI in the kitchen, basement bath and laundry; attic insulation fluffed; front door sweep replaced (items 28, 16, 8)' },
  { id: 'house-8', area: 'house', when: 'Apr 2027', due: '2027-04-17', short: 'Soffits, deck ledger, regrade', text: 'Seal the rear fascia and soffit gaps, flash the deck ledger, regrade the right side away from the foundation (items 20, 23, 24)' },
  // Alerts
  { id: 'alerts-1', area: 'alerts', when: 'Oct 2026', due: '2026-10-18', short: 'LookoutAlert on both phones', text: 'Register both phones and the address in [LookoutAlert](https://www.smart911.com/smart911/ref/reg.action?pa=LookoutAlert); allow the sender; confirm with a test' },
  { id: 'alerts-2', area: 'alerts', when: 'Nov 2026', due: '2026-11-03', short: 'Save the vet and the ER', text: 'Save the nearest 24-hour vet and the Golden ER in Maps and on the fridge sheet' },
  { id: 'alerts-3', area: 'alerts', when: 'Nov 2026', due: '2026-11-05', short: 'Outage texts', text: 'Enroll in Xcel or CORE outage texts and the medical registry; install the outage app' },
  // Wildfire
  { id: 'wildfire-1', area: 'wildfire', when: 'Oct 2026', due: '2026-10-21', short: 'Book the free EFR assessment', text: 'Book the [free Evergreen Fire/Rescue home assessment](https://evergreenfirerescue.com/wildland/wildland_fire_action/efr_site_visits.php) (mitigation@evergreenfirerescue.com)' },
  { id: 'wildfire-2', area: 'wildfire', when: 'Nov 2026', due: '2026-11-07', short: 'N95s and a purifier', text: 'Buy N95s for both of us and a HEPA purifier or a MERV-13 box-fan filter' },
  { id: 'wildfire-3', area: 'wildfire', when: 'Nov 2026', due: '2026-11-12', short: 'Ask the insurer for the risk score', text: 'Ask the insurer in writing for the wildfire risk score and mitigation discounts; log every quote' },
  { id: 'wildfire-4', area: 'wildfire', when: 'Mar 2027', due: '2027-03-20', short: 'Zone 1: the first five feet', text: 'Zone 1: rock or gravel the first five feet; firewood, mulch and deck furniture away from the walls' },
  { id: 'wildfire-5', area: 'wildfire', when: 'Apr 2027', due: '2027-04-03', short: 'Zone 2 and chipper day', text: 'Zone 2: junipers out, trees limbed six to ten feet, dead fuel cleared; book [chipper day](https://www.chipperday.com/evergreen) the week it opens' },
  { id: 'wildfire-6', area: 'wildfire', when: 'Apr 2027', due: '2027-04-24', short: 'Mesh the vents, clear the gutters', text: '1/8-inch mesh on vents and under the deck; gutters and roof cleared of needles' },
  { id: 'wildfire-7', area: 'wildfire', when: 'May 2027', due: '2027-05-15', short: 'Haul slash, letter to the insurer', text: 'Haul the rest of the slash to [Marshdale or Tincup](https://www.jeffco.us/slash); get the EFR defensible space letter to the insurer' },
  { id: 'wildfire-8', area: 'wildfire', when: 'Red Flag days', due: null, short: 'Red Flag day routine', text: 'Red Flag day: cars fueled and backed in, go-bags in the car, crate out, no mowing, windows shut' },
  { id: 'wildfire-9', area: 'wildfire', when: 'Every Jan', due: '2027-01-09', repeats: 'every January', short: 'Insurance renewal review', text: 'Insurance renewal review; ask again for the score and discounts; re-check the WUI class' },
  { id: 'wildfire-10', area: 'wildfire', when: 'Every Oct', due: '2026-10-30', repeats: 'every October', short: 'Check the hazard plan and CWPP', text: 'Check the Jeffco hazard mitigation plan and the Evergreen CWPP for updates' },
  // Power
  { id: 'power-1', area: 'power', when: 'Dec 2026', due: '2026-12-05', short: 'Power station + boiler inlet quote', text: "Backup power: a power station for internet, phones and the fridge now; an electrician's quote for a generator inlet and transfer switch so the boiler's pump and controls run in an outage" },
  { id: 'power-2', area: 'power', when: 'Dec 2026', due: '2026-12-06', short: 'Pick the warm room', text: 'Pick the warm room for a long outage: the upstairs gas fireplace room, once the fireplace is confirmed to light without power' },
  // Winter
  { id: 'winter-1', area: 'winter', when: 'Oct 2026', due: '2026-10-24', short: 'Winter kits in both cars', text: 'Winter kits in both cars; chains that satisfy the [traction law](https://codot.gov/travel/winter-driving/tractionlaw); tread over 3/16 inch' },
  { id: 'winter-2', area: 'winter', when: 'Dec 2026', due: '2026-12-12', short: 'The trip rule', text: 'Trip rule: thermostat never below 65°F, cabinets open, far tap dripping below 20°F' },
  { id: 'winter-3', area: 'winter', when: 'Nov to Apr', due: '2026-10-31', repeats: 'every fall, off in May', short: 'Traction tires on', text: 'Traction tires on by November 1; chains in both cars' },
  // Home hazards
  { id: 'home-1', area: 'home', when: 'Oct 2026', due: '2026-10-23', short: 'Smoke + CO alarms, extinguishers', text: 'Smoke alarms in every bedroom and a CO alarm in the upstairs hallway, both missing at inspection (items 2 and 3); battery-backup CO alarm on each floor; ABC extinguishers in the kitchen, garage and by the boiler' },
  { id: 'home-2', area: 'home', when: 'Oct 2026', due: '2026-10-27', short: 'Service the gas fireplace', text: 'Gas fireplace serviced and its damper kept open whenever it runs (item 13); confirm it lights with the power out, since it is the backup heat' },
  { id: 'home-3', area: 'home', when: 'Nov 2026', due: '2026-11-21', short: 'Radon test', text: 'Radon test kit on the lowest lived-in floor; mitigate if over 4 pCi/L ([Jeffco radon](https://www.jeffco.us/2551/Radon))' },
  { id: 'home-4', area: 'home', when: 'Every Sep', due: '2027-09-11', repeats: 'every September', short: 'Boiler and fireplace service', text: 'Boiler and gas fireplace service; winter car kits back in' },
  { id: 'home-5', area: 'home', when: 'Every Oct', due: '2026-10-29', repeats: 'every October', short: 'Batteries, radio, faucets drained', text: 'Alarm batteries replaced; weather radio and power station charged; exterior faucets shut off and drained' },
  { id: 'home-6', area: 'home', when: 'Monthly', due: '2026-11-01', recurrence: 'monthly', short: 'Test the alarms', text: 'Test the CO and smoke alarms' },
  { id: 'home-7', area: 'home', when: 'Every 2 to 3 years', due: '2028-11-04', repeats: 'every 2 to 3 years', short: 'Radon retest, CO alarm expiry', text: 'Radon retest; replace CO alarms at their expiry date' },
  // Supplies
  { id: 'supplies-1', area: 'supplies', when: 'Oct 2026', due: '2026-10-26', short: "Pack go-bags and Nala's bag", text: "Build the two go-bags and Nala's bag; print the contact sheet and the plan into each; papers on a USB and in the cloud" },
  { id: 'supplies-2', area: 'supplies', when: 'Oct 2026', due: '2026-10-28', short: 'Stock 7 days water, 14 days food', text: 'Stock 7 days of water (for boil-water orders) and 14 days of food for two plus Nala; can opener, lantern, headlamps, batteries; NOAA radio tested at the house' },
  { id: 'supplies-3', area: 'supplies', when: 'Apr and Oct', due: '2027-04-10', repeats: 'every April and October', short: 'Swap go-bag food, meds, batteries', text: "Swap go-bag food, meds and batteries; refresh Nala's bag" },
  { id: 'supplies-4', area: 'supplies', when: 'Apr and Oct', due: '2027-04-11', repeats: 'every April and October', short: 'Swap the car kits', text: 'Swap car kits: winter out in April, back in October' },
  { id: 'supplies-5', area: 'supplies', when: 'Apr and Oct', due: '2027-04-12', repeats: 'every April and October', short: 'Rotate water and food', text: 'Rotate stored water and food; re-read this page and fix what changed' },
  // Plan
  { id: 'plan-1', area: 'plan', when: 'Oct 2026', due: '2026-10-31', short: 'Drive both evacuation routes', text: 'Drive both evacuation routes in daylight and after dark; write them, the meeting points and the out-of-state contact on the fridge sheet' },
  { id: 'plan-2', area: 'plan', when: 'Dec 2026', due: '2026-12-13', short: 'Emergency sheet on both phones', text: "Put the emergency sheet on the Nala's Minions page so it is on both phones offline" },
  { id: 'plan-3', area: 'plan', when: 'Jan 2027', due: '2027-01-23', short: 'Video walkthrough for insurance', text: 'Video walkthrough of every room and the garage for the insurance claim; store it with the papers' },
  { id: 'plan-4', area: 'plan', when: 'Feb 2027', due: '2027-02-13', short: 'First aid and CPR class', text: 'First aid and CPR class through the Red Cross Mile High chapter or the [Lakewood CERT course](https://www.lakewoodco.gov/Local-Government/Departments/Police/Emergency-Preparedness/Community-Emergency-Response-Team-CERT-Training)' },
  { id: 'plan-5', area: 'plan', when: 'May 2027', due: '2027-05-08', short: 'EFR evacuation drill', text: 'Join the Evergreen Fire/Rescue evacuation drill in May and the spring workshop' },
  { id: 'plan-6', area: 'plan', when: 'Every Apr', due: '2027-04-18', repeats: 'every April', short: 'Re-drive the routes after winter', text: 'Re-drive both routes after winter; check the secondary is not blocked by downed trees' },
  { id: 'plan-7', area: 'plan', when: 'Every trip', due: null, short: 'Trip-away checklist', text: "Trip-away checklist: thermostat, drip, neighbor with the key and Nala's plan, go-bags by the door" },
  // Nala
  { id: 'nala-1', area: 'nala', when: 'Nov 2026', due: '2026-11-02', short: 'Chip and tag to Woods Dr', text: 'Microchip registration and collar tag updated to Woods Dr and both phone numbers' },
  { id: 'nala-2', area: 'nala', when: 'Nov 2026', due: '2026-11-15', short: 'A neighbor with a key', text: 'A neighbor with a key agrees to take Nala on a Warning if we are out; their number on the sheet' },
  { id: 'nala-3', area: 'nala', when: 'Every day', due: null, short: 'Dusk and dawn on leash', text: 'Nala out at dusk and dawn only on leash with a person, never alone in the yard' },
  // Hiking
  { id: 'hiking-1', area: 'hiking', when: 'Nov 2026', due: '2026-11-08', short: 'CORSAR card', text: 'Buy a [CORSAR card](https://cpw.state.co.us/backcountry-search-and-rescue-program), or confirm the Keep Colorado Wild Pass is on both registrations' },
  { id: 'hiking-2', area: 'hiking', when: 'Nov 2026', due: '2026-11-22', short: 'Satellite SOS, dog first aid', text: 'Satellite SOS set up and tested on the phones, or an inReach; dog sling and dog first aid kit in the hiking car' },
  { id: 'hiking-3', area: 'hiking', when: 'Every summer hike', due: null, short: 'Summer hike habits', text: "Summer hikes: trip plan sent, dawn start, off the summit by noon, Nala's water and booties, Ten Essentials restocked after" },
  { id: 'hiking-4', area: 'hiking', when: 'Winter trips', due: null, short: 'Winter trip habits', text: 'Winter high-country trips: [CAIC forecast](https://avalanche.state.co.us) read; beacon, probe and shovel if off trail' },
  // Wildlife
  { id: 'wildlife-1', area: 'wildlife', when: 'Aug to Nov', due: '2026-10-18', repeats: 'every August to November', short: 'Feeders in, trash on pickup day', text: 'Bird feeders in; trash out only on pickup morning; grill cleaned' },
  { id: 'wildlife-2', area: 'wildlife', when: 'May to Jun', due: '2027-05-01', repeats: 'every May and June', short: 'Elk calving season', text: 'Elk calving: Nala kept away from Evergreen Lake; moose check before any wet-meadow trail' },
]

module.exports = { AREAS, EVERGREEN_TASKS }
