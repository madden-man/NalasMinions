// The budget on /evergreen: what each task costs, in low–high dollars.
// Read by scripts/build-evergreen-page.cjs; every row names the task it
// prices, so the page links them both ways.
//
// kind: 'once'   — a one-time cost (counted in the year the task is due)
//       'yearly' — repeats every year (the first year counts in its due year too)
//       'if'     — only if something turns out to be needed (radon over 4, a
//                  generator, new tires, off-trail winter trips); kept out of the
//                  main total and shown on its own
// src: a key into BUDGET_SOURCES, or null for our own estimate (store prices,
// rounded). Figures checked Oct 15, 2026; quotes beat all of them.

const BUDGET_SOURCES = {
  plumbing: ['Angi: gas line repair; Angi and HomeAdvisor: frost-free spigots', 'https://www.angi.com/articles/average-gas-line-repair-and-installation-costs.htm'],
  roof: ['HomeAdvisor: asphalt shingle roof repair', 'https://www.homeadvisor.com/cost/roofing/asphalt-shingle-roof-repair/'],
  gfci: ['HomeAdvisor: GFCI outlet cost', 'https://www.homeadvisor.com/cost/electrical/gfci-outlet-cost'],
  garage: ['Garage door spring adjustment guide (rough)', 'https://new.risingsunartscentre.org/news/garage-door-spring-adjustment-cost-2026.html'],
  slash: ['Jeffco SLASH: $24 a load', 'https://www.jeffco.us/slash'],
  csfs: ['State Auditor, citing State Forest Service: $3,200–6,100 per acre', 'https://content.leg.colorado.gov/sites/default/files/2026-te4-wildfire-mitigation-measures-tax-credit-accessible.pdf'],
  inlet: ['Generator interlock and inlet install guide', 'https://www.thepricer.org/how-much-does-a-generator-interlock-kit-cost/'],
  radon: ['Colorado radon mitigation cost guide', 'https://inspectandtest.net/guides/cost-of-radon-mitigation-system-colorado/'],
  fireplace: ['Gas fireplace service cost guide (rough)', 'https://new.risingsunartscentre.org/news/gas-fireplace-service-cost-guide-2026.html'],
  cpr: ['Denver Red Cross First Aid/CPR/AED listings', 'https://chfainfo.com/rental-housing/chfareach/chfareach-calendar/chfareach-american-red-cross-first-aid-cpr-and-aed-denver-01-29-2025'],
  corsar: ['CORSAR card: $5 a year, $20 for five', 'https://ultrasignup.com/register.aspx?did=130516'],
}

// One row per priced item. `task` is the task id it belongs to.
const BUDGET = [
  // House
  { task: 'house-2', item: 'Two foam faucet covers, pipe foam', lo: 15, hi: 30, kind: 'once', src: null },
  { task: 'house-9', item: 'Downspout extension or diverter for the right side', lo: 20, hi: 150, kind: 'once', src: null },
  { task: 'house-1', item: 'Plumber: gas line, two frost-free faucets, heater pipe, permit', lo: 1000, hi: 2500, kind: 'once', src: 'plumbing' },
  { task: 'house-3', item: 'Valve tags and a wrench for the meter', lo: 15, hi: 30, kind: 'once', src: null },
  { task: 'house-5', item: 'Roof and chimney crown repair, certification', lo: 800, hi: 2500, kind: 'once', src: 'roof', note: 'A full Class A re-roof later is not in here.' },
  { task: 'house-6', item: 'Garage door springs adjusted, outlet fixed', lo: 150, hi: 450, kind: 'once', src: 'garage' },
  { task: 'house-7', item: 'Three GFCI outlets; insulation and door sweep', lo: 400, hi: 1200, kind: 'once', src: 'gfci' },
  { task: 'house-8', item: 'Soffit and fascia sealing, ledger flashing, regrading', lo: 500, hi: 3000, kind: 'once', src: null, note: 'Widest guess on the page: get a quote.' },
  { task: 'house-10', item: 'Spray bottle and dish soap', lo: 0, hi: 5, kind: 'yearly', src: null },
  // Wildfire
  { task: 'wildfire-2', item: 'N95s for two, HEPA purifier (or a box fan and MERV-13 filter)', lo: 80, hi: 390, kind: 'once', src: null },
  { task: 'wildfire-4', item: 'Zone 1: rock or gravel for the first five feet', lo: 300, hi: 1500, kind: 'once', src: null, credit: true },
  { task: 'wildfire-5', item: 'Zone 2: junipers out, limbing, dead fuel (crew)', lo: 1500, hi: 6100, kind: 'once', src: 'csfs', credit: true, note: 'The state figure is for a full acre; less if we do some ourselves.' },
  { task: 'wildfire-6', item: 'Ember mesh for vents and under the deck; gutter cleaning', lo: 100, hi: 600, kind: 'once', src: null },
  { task: 'wildfire-7', item: 'Slash yard, two to four loads at $24', lo: 48, hi: 96, kind: 'once', src: 'slash', credit: true },
  // Power
  { task: 'power-1', item: 'Power station (1 to 2 kWh) for internet, phones, fridge', lo: 500, hi: 1500, kind: 'once', src: null },
  { task: 'power-1', item: 'Generator inlet and interlock, installed', lo: 400, hi: 1300, kind: 'if', src: 'inlet', note: 'Only if we go with a generator for the boiler.' },
  { task: 'power-1', item: 'A portable generator to plug into it', lo: 600, hi: 1500, kind: 'if', src: null },
  // Winter
  { task: 'winter-1', item: 'Winter car kits for both cars, chains included', lo: 200, hi: 500, kind: 'once', src: null },
  { task: 'winter-3', item: 'Winter tires for both cars', lo: 1200, hi: 2400, kind: 'if', src: null, note: 'Zero if the tires we have meet the traction law (M+S, 3/16 inch).' },
  // Home hazards
  { task: 'home-1', item: 'Smoke and CO alarms, three extinguishers', lo: 200, hi: 450, kind: 'once', src: null },
  { task: 'home-2', item: 'Gas fireplace service', lo: 100, hi: 300, kind: 'once', src: 'fireplace' },
  { task: 'home-3', item: 'Radon test kit', lo: 15, hi: 30, kind: 'once', src: null },
  { task: 'home-3', item: 'Radon mitigation system', lo: 1000, hi: 2500, kind: 'if', src: 'radon', note: 'Only if the test comes back over 4 pCi/L.' },
  { task: 'home-4', item: 'Boiler and fireplace service', lo: 200, hi: 500, kind: 'yearly', src: 'fireplace' },
  { task: 'home-5', item: 'Alarm batteries', lo: 20, hi: 40, kind: 'yearly', src: null },
  { task: 'home-7', item: 'Radon retest; CO alarms at expiry', lo: 50, hi: 150, kind: 'once', src: null, note: 'Every two to three years.' },
  // Supplies
  { task: 'supplies-1', item: "Two go-bags and Nala's bag, filled", lo: 300, hi: 700, kind: 'once', src: null, note: 'The $200 cash in each bag is set aside, not spent.' },
  { task: 'supplies-2', item: '17 gallons of water and the 14-day pantry list', lo: 300, hi: 550, kind: 'once', src: null },
  { task: 'supplies-3', item: 'Go-bag food, meds and batteries, twice a year', lo: 100, hi: 300, kind: 'yearly', src: null },
  { task: 'supplies-5', item: 'Pantry restock, twice a year (we eat the old stock)', lo: 100, hi: 300, kind: 'yearly', src: null },
  // Plan
  { task: 'plan-4', item: 'First aid and CPR class for two', lo: 120, hi: 230, kind: 'once', src: 'cpr' },
  // Nala
  { task: 'nala-1', item: 'Microchip registry update and a new tag', lo: 10, hi: 60, kind: 'once', src: null },
  // Hiking
  { task: 'hiking-1', item: 'CORSAR cards for two (or the Wild Pass on registration)', lo: 10, hi: 40, kind: 'yearly', src: 'corsar' },
  { task: 'hiking-2', item: 'Dog sling and dog first aid kit; satellite SOS on the phones', lo: 60, hi: 150, kind: 'once', src: null },
  { task: 'hiking-2', item: 'An inReach instead, plus a year of service', lo: 450, hi: 1200, kind: 'if', src: null, note: 'Only if the phones are not enough.' },
  { task: 'hiking-4', item: 'Avalanche beacon, probe and shovel', lo: 350, hi: 700, kind: 'if', src: null, note: 'Only for off-trail winter trips.' },
]

// The state's wildfire mitigation credit: from tax year 2027, 100% of
// vegetation mitigation costs up to $2,000, refundable, for federal AGI up to
// $300,000. Home hardening (roof, vents) does not count.
const CREDIT = { max: 2000, year: 2027 }

module.exports = { BUDGET, BUDGET_SOURCES, CREDIT }
