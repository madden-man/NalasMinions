// Build public/evergreen.html from scripts/evergreen-tasks.cjs: `npm run build:evergreen`.
//
// The page is static and self-contained like /moving and /japan, but its task
// rows come from the same file the chore seed reads, so the two never drift.
// Every section and task row is in the HTML (test/pages.test.mjs checks the
// section ids); the inline script only adds live done-state from the chores
// API, the "next up" board, filters, and the year-chart readout.

const fs = require('fs')
const path = require('path')
const { AREAS, EVERGREEN_TASKS } = require('./evergreen-tasks.cjs')

const OUT = path.join(__dirname, '..', 'public', 'evergreen.html')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// [label](url) → a link; everything else escaped.
const md = (s) =>
  esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, l, u) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayLabel = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`

// --- hazards -----------------------------------------------------------------

const HAZARDS = [
  {
    key: 'wildfire', emoji: '🔥', name: 'Wildfire',
    line: 'Harden the house, know two ways out, leave at the Warning',
    intro: 'The house survives on its first five feet and its roof; we survive on leaving early. Jeffco calls an Evacuation Warning, then an Order; with Nala we go at the Warning.',
    prevent: ['Zone 1: rock, nothing burnable', 'Soffit gaps sealed, vents mesh', 'Trees limbed; junipers out', 'Roof fixed; Class A when new'],
    prepare: ['LookoutAlert on both phones', 'Two routes, driven day and night', 'Go-bags and Nala by the door', 'N95s and a HEPA purifier'],
    respond: ['Warning = we leave, with Nala', 'Drive away from the smoke', 'Shelter: shut up, HVAC off', 'Check jeffcom911 active alerts'],
    help: 'a [free Evergreen Fire/Rescue home assessment](https://evergreenfirerescue.com/wildland/wildland_fire_action/efr_site_visits.php) sets the mitigation list; [LookoutAlert](https://www.smart911.com/smart911/ref/reg.action?pa=LookoutAlert) sends the evacuation texts; [chipper day](https://www.chipperday.com/evergreen) and the [Jeffco SLASH yards](https://www.jeffco.us/slash) take the slash; [Jeffco\'s resiliency code](https://www.jeffco.us/Wildfire-Resiliency-Code) is the zone standard; [AirNow](https://fire.airnow.gov) tracks smoke.',
    areas: ['wildfire', 'house', 'alerts', 'plan', 'supplies'],
  },
  {
    key: 'winter', emoji: '❄️', name: 'Winter and outages',
    line: 'A week snowed in without power: the gas fireplace is the heat',
    intro: 'The planning case is a March upslope storm with the power out for up to a week. Water keeps flowing (Evergreen Metro, no well), but the boiler needs electricity, so the gas fireplace and a power station are the heat and light.',
    prevent: ['Trees limbed off the lines', 'Traction tires by November 1', 'Frost-proof faucets, shutoffs', 'Thermostat 65°F when away'],
    prepare: ['Power station; boiler inlet', 'Fireplace lights unpowered', 'Week of water, 14 days food', 'Car kit: blankets, shovel'],
    respond: ['Drip far tap, open cabinets', 'Fridge 4 h, freezer 48 h shut', 'Generator 20 ft from windows', 'COtrip before any drive'],
    help: '[COtrip](https://www.cotrip.org) for closures, [Xcel](https://www.xcelenergy.com/out) or [CORE](https://core.coop) outage maps and texts, the [traction law](https://codot.gov/travel/winter-driving/tractionlaw), [Jeffco snow plowing](https://www.jeffco.us/2838/Snow-Ice-Control) (residential roads last), and [Ready.gov on outages](https://www.ready.gov/power-outages) for food safety.',
    areas: ['power', 'winter', 'supplies', 'house'],
  },
  {
    key: 'floods', emoji: '🌊', name: 'Floods and storms',
    line: 'Above the creek, inside at the thunder, cars under cover',
    intro: 'Summer afternoons bring the fast hazards: Bear Creek flash floods, lightning, hail and the wind days that trigger power shutoffs. The fixes are mostly drainage, roof and habit.',
    prevent: ['Right side regraded from house', 'Dead trees down near the house', 'Gutters and culverts clear', 'Roof repaired before hail'],
    prepare: ['Week of bottled water', 'Weather radio; WEA alerts on', 'FEMA zone known', 'Insurance review each January'],
    respond: ['Never drive through water', 'Thunder: inside for 30 minutes', 'Hail: cars in the garage', 'Wind day: expect a shutoff'],
    help: 'the [FEMA flood map](https://msc.fema.gov) for the lot, [NWS Boulder](https://www.weather.gov/bou) for warnings, [COtrip](https://www.cotrip.org) for Hwy 74 and canyon closures, and the insurer\'s written risk score and discounts each January.',
    areas: ['house', 'alerts', 'wildfire', 'hiking'],
  },
  {
    key: 'home', emoji: '🛠️', name: 'Home hazards',
    line: 'Alarms on every floor, the gas line fixed, Nala in at dusk',
    intro: 'This house runs on natural gas (2019 boiler, gas fireplace, unvented gas range) with an attached garage, so carbon monoxide and gas are the home risks; the August inspection found the alarms missing and an exterior gas line corroding. Radon is a Jeffco given. Lions, bears and elk come through the yard.',
    prevent: ['Corroded gas line replaced', 'Boiler and fireplace serviced', 'Damper open when it burns', 'Radon test; mitigate over 4'],
    prepare: ['Smoke alarm in every bedroom', 'CO alarm upstairs, each floor', 'Extinguishers: kitchen, garage', 'Wrench hung at the gas meter'],
    respond: ['Gas smell: out, meter, call', 'CO alarm: everyone out, 911', 'Lion: stand big, back away', 'Bear in the trash: inside, CPW'],
    help: '[Jeffco radon](https://www.jeffco.us/2551/Radon) (half of local homes test high), the [Colorado CO alarm law](https://www.ncsl.org/environment-and-natural-resources/carbon-monoxide-detector-installation-statutes), [CPW on bears](https://cpw.state.co.us/learn/Pages/LivingwithWildlifeBears2.aspx) and [lions](https://cpw.state.co.us/lions), and the inspection report\'s items 2, 3, 13 and 33.',
    areas: ['home', 'house', 'wildlife', 'nala'],
  },
  {
    key: 'hiking', emoji: '🥾', name: 'Hiking',
    line: 'Dawn start, noon turnaround, a plan at home, a way to call',
    intro: 'Four habits cover almost every trail emergency: start at dawn and turn around at noon, leave a trip plan, keep Nala leashed, and carry a way to call that does not need cell signal. Alpine Rescue Team is free and local, and should never be needed.',
    prevent: ['Off the summit by noon', 'Trip plan left at home', 'Leash on; no dawn or dusk', 'CAIC check for winter trips'],
    prepare: ['Ten Essentials in the pack', 'Satellite SOS or inReach', 'CORSAR card or Wild Pass', 'Nala: water, booties, kit'],
    respond: ['Thunder: down, below the trees', 'Lost: call 911, stay put', 'AMS: stop; worse: descend', 'Moose or lion: back away slow'],
    help: '[CORSAR and the SAR program](https://cpw.state.co.us/backcountry-search-and-rescue-program), [Alpine Rescue Team](https://alpinerescueteam.org/about-alpine/faqs/), the [CAIC avalanche forecast](https://avalanche.state.co.us), [Jeffco park closures](https://www.jeffco.us/1531/Alerts-Closures) (mud season), [Mount Blue Sky timed entry](https://www.recreation.gov/timed-entry/10087438), and [hiking with a dog](https://vetsoftherockies.com/education/hiking-with-a-dog/).',
    areas: ['hiking', 'nala', 'supplies'],
  },
]

// The eleven things that go wrong, by month: `from`–`to` can happen, `peaks`
// the busy stretch (wrapping past December where to < from). `hz` is the
// hazard card that covers it.
const YEAR = [
  { emoji: '⚡', name: 'Power outage', hz: 'winter', from: 1, to: 12, peaks: [[12, 3]], often: 'Several times a year. Xcel now cuts power on wind days, sometimes for up to a week.', fix: 'Power station for internet and fridge, the gas fireplace for heat, a week of food and water.' },
  { emoji: '❄️', name: 'Winter storm', hz: 'winter', from: 10, to: 5, peaks: [[3, 3]], often: 'Every winter. A 40-inch upslope storm every few years closes I-70 and Hwy 74.', fix: 'Traction tires by Nov 1, car kits, faucets drained, the house stocked to sit tight.' },
  { emoji: '🔥', name: 'Wildfire', hz: 'wildfire', from: 1, to: 12, peaks: [[6, 9]], often: 'Small fires nearby most summers; grass fires in any month.', fix: 'Clear the first 5 ft, LookoutAlert on, two routes driven, go-bags by the door, leave at the Warning.' },
  { emoji: '🌊', name: 'Flash flood', hz: 'floods', from: 6, to: 9, peaks: [], often: 'A bad Bear Creek storm every decade or two, most recently June 2026.', fix: 'Know the flood zone, regrade the right side, never drive into water, bottled water for boil orders.' },
  { emoji: '🌩️', name: 'Lightning', hz: 'floods', from: 6, to: 9, peaks: [[7, 8]], often: 'Most summer afternoons above treeline, worst around 2 p.m.', fix: 'Start at dawn, off summits by noon, inside at the first thunder for 30 minutes.' },
  { emoji: '🧊', name: 'Hail', hz: 'floods', from: 5, to: 8, peaks: [], often: 'Most summers, sometimes golf-ball size.', fix: 'Fix the roof now, cars in the garage on storm days, review insurance each January.' },
  { emoji: '💨', name: 'High wind', hz: 'floods', from: 11, to: 4, peaks: [], often: '100 mph gusts some winters.', fix: 'Limb trees near the house and lines; treat a wind warning as a shutoff warning.' },
  { emoji: '🚨', name: 'CO and gas', hz: 'home', from: 10, to: 4, peaks: [], often: 'Rare, but every heating season with a gas boiler, gas fireplace and attached garage.', fix: 'CO and smoke alarms on every floor, the corroded gas line replaced, fireplace damper open.' },
  { emoji: '🦌', name: 'Wildlife', hz: 'home', from: 1, to: 12, peaks: [[8, 11], [5, 6]], often: 'Lions all year, bears in trash August to November, elk calving May and June.', fix: 'Nala leashed and inside at dusk, trash out on pickup morning, feeders in August to November.' },
  { emoji: '🥾', name: 'Hiking trouble', hz: 'hiking', from: 1, to: 12, peaks: [[6, 9]], often: "Evergreen's rescue team runs about 130 missions a year, most in summer.", fix: 'Ten Essentials, a trip plan left at home, satellite SOS, a CORSAR card.' },
  { emoji: '🪨', name: 'Rockfall, Hwy 74', hz: 'floods', from: 3, to: 5, peaks: [], often: 'After heavy rain and the spring thaw in Bear Creek Canyon.', fix: 'Check COtrip and drive the canyon alert after rain.' },
]
const inSpan = (m, a, b) => (a <= b ? m >= a && m <= b : m >= a || m <= b)

// --- grab sheet ----------------------------------------------------------------

const DO = [
  ['Leave at the Warning, not the Order.', 'With Nala we are a Warning household; early beats the jam on Hwy 74.'],
  ['Two routes on the fridge.', 'Hwy 74 east through the canyon, Hwy 74 north to I-70 at El Rancho, Hwy 73 south to Conifer; never toward smoke.'],
  ['Meeting points.', 'End of the driveway for a house fire; a named spot in Golden or Lakewood when roads split us; one out-of-state contact, by text.'],
  ["Grab the six P's.", 'People and Nala, prescriptions, papers, personal needs, priceless things, phones and chargers.'],
  ['Shelter in place.', 'Windows shut, HVAC off, purifier on, Nala inside, cars loaded anyway.'],
  ['Snowed in without power.', 'Gas fireplace room, taps dripping, fridge shut, check on neighbors on day two.'],
]
const KITS = [
  ['🎒', 'Go-bag, one each', 'Hall closet', '3 days water and food, a week of meds, N95s, headlamp, battery bank, $200 cash, papers on USB, clothes, boots, whistle, first aid, a paper map'],
  ['🐾', "Nala's bag", 'Clipped to the crate', '5 days food, water and bowl, meds, spare leash, tag, vaccine and chip records, a photo of us together, towel, toy'],
  ['🥫', 'Stay-home stock', 'Pantry and garage', '7 days water, 14 days food, can opener, camp stove for outdoors, NOAA radio, lanterns, batteries, power station, blankets, plastic sheeting and tape'],
  ['🚗', 'Car kit, each car', 'Trunk', 'Jumper cables, scraper, charger, blankets, water, snacks, shovel, sand, tow strap, headlamp, first aid; chains and boots November to April; half a tank always'],
  ['🧭', 'Day pack', 'Mudroom hook', 'The Ten Essentials plus a whistle and satellite SOS'],
]
const CALLS = [
  ['Evacuation alerts', '[LookoutAlert](https://www.smart911.com/smart911/ref/reg.action?pa=LookoutAlert); [what is active now](https://www.jeffcom911co.gov/activealerts/)'],
  ['Fire, medical, rescue', '<b>911</b>; Evergreen Fire/Rescue 303-674-3145'],
  ['Sheriff non-emergency', '303-980-7300'],
  ['Power outage', 'Xcel 1-800-895-1999 or text OUT to 98936; CORE 833-267-3349'],
  ['Water or sewer', 'Evergreen Metro 303-674-4112, option 9 after hours'],
  ['Jeffco emergency info', '303-271-8911'],
  ['Roads and weather', '[COtrip](https://www.cotrip.org); [NWS Boulder](https://www.weather.gov/bou)'],
  ['Poison, us or Nala', '1-800-222-1222; ASPCA 888-426-4435'],
  ['Nearest ER', 'CommonSpirit Golden, 760 Warner Dr, 24/7'],
  ['Pets in an evacuation', 'Jeffco Animal Control 303-271-5070'],
  ['Wildlife at the house', 'Parks and Wildlife 303-291-7227'],
  ['Smoke', '[fire.airnow.gov](https://fire.airnow.gov)'],
]
// Phone numbers become tap-to-call links on a phone.
const tel = (html) => html.replace(/\b(1-)?(\d{3})-(\d{3})-(\d{4})\b/g, (m) => `<a href="tel:${m.replace(/-/g, '')}">${m}</a>`)

// --- sources -------------------------------------------------------------------

const SOURCES = [
  ['Alerts and evacuation', [
    ['Jeffco Sheriff: standardized evacuation messaging, July 2026', 'https://www.jeffcosheriffco.gov/news/know-the-alert-know-what-to-do-jefferson-and-clear-creek-counties-launch-standardized-emergency-messaging'],
    ['LookoutAlert', 'https://www.jeffcosheriffco.gov/news/what-is-lookout-alert-jefferson-county'],
    ['Hi-Lo siren', 'https://www.jeffcosheriffco.gov/safety/hi-lo'],
    ['Jeffcom active alerts', 'https://www.jeffcom911co.gov/activealerts/'],
    ['Canyon Courier: May 2026 evacuation drill', 'https://www.canyoncourier.com/news/foothills-residents-evacuate-during-simulated-emergency/article_51553a1e-960f-463d-8bb9-50b035e42482.html'],
    ['CBS Colorado: foothills evacuation concerns', 'https://www.cbsnews.com/colorado/news/residents-colorado-foothills-plan-possible-evacuations-wildfire-concerns/'],
    ['Gazette: non-survivable evacuation routes, 2022', 'https://gazette.com/2022/06/25/non-survivable-evacuation-routes-threaten-some-of-colorados-most-wildfire-prone-areas-8b1504e6-f2ca-11ec-ad74-3fab8fd0465f/'],
  ]],
  ['Jeffco and Evergreen Fire/Rescue', [
    ['Jeffco Wildfire Resiliency Code', 'https://www.jeffco.us/Wildfire-Resiliency-Code'],
    ['SLASH program', 'https://www.jeffco.us/slash'],
    ['Snow and Ice Control', 'https://www.jeffco.us/2838/Snow-Ice-Control'],
    ['Radon', 'https://www.jeffco.us/2551/Radon'],
    ['Well water', 'https://www.jeffco.us/2401/Well-Water-Systems'],
    ['Animal evacuations', 'https://www.jeffco.us/468/Animal-Evacuations'],
    ['Open burning permits', 'https://www.jeffco.us/DocumentCenter/View/1179/Open-Burning-Permits-PDF'],
    ['Open Space regulations', 'https://www.jeffco.us/DocumentCenter/View/8982/Jeffco-Open-Space-Regulations'],
    ['Park closures', 'https://www.jeffco.us/1531/Alerts-Closures'],
    ['Evergreen Fire/Rescue home assessments', 'https://evergreenfirerescue.com/wildland/wildland_fire_action/efr_site_visits.php'],
    ['EFR chipping program', 'https://evergreenfirerescue.com/wildland/chipping_program/index.php'],
    ['Evergreen CWPP 2020', 'https://foreststewardsguild.org/wp-content/uploads/2020/06/Evergreen-CWPP.pdf'],
  ]],
  ['Fires', [
    ['Lower North Fork 2012', 'https://cpr.org/2012/03/27/lower-north-fork-fire-claims-homes-two-fatalities'],
    ['Elephant Butte 2020', 'https://coloradosun.com/2020/07/13/elephant-butte-wildfire-evergreen/'],
    ['Quarry 2024', 'https://coloradosun.com/2024/07/31/wildfire-jefferson-county-deer-creek-canyon/'],
    ['White Hawk 2025', 'https://krdo.com/news/2025/07/23/crews-combatting-lightning-caused-white-hawk-fire-in-southwest-jefferson-county'],
  ]],
  ['Weather', [
    ['NWS: March 13 to 15, 2024 snowstorm', 'https://www.weather.gov/bou/March13_15_2024FrontRangeSnowstorm'],
    ['January 2024 climate', 'https://www.weather.gov/media/bou/January2024Climate.pdf'],
    ['Dec 30, 2021 high winds', 'https://www.weather.gov/bou/HighWinds12_30_2021'],
    ['Colorado lightning ranking', 'https://www.weather.gov/pub/Colorado_ltg_ranking'],
    ['Red Flag Warning definition', 'https://www.weather.gov/media/lmk/pdf/what_is_a_red_flag_warning.pdf'],
    ['CDOT traction law', 'https://codot.gov/travel/winter-driving/tractionlaw'],
  ]],
  ['Power', [
    ['Denver Gazette: Xcel shutoff hearing, Jan 2026', 'https://www.denvergazette.com/2026/01/29/xcel-gets-an-earful-from-public-for-power-shutoffs-in-colorado/'],
    ['Jeffco PSPS page, Dec 2025', 'https://www.jeffco.us/FormCenter/Public-Affairs-17/December-2025-Public-Safety-Power-Shutof-460'],
    ['Colorado Politics: March 2026 shutoff', 'https://www.coloradopolitics.com/2026/03/13/xcel-energy-power-shutoff-likely-saturday-in-boulder-jefferson-counties/'],
    ['211 Colorado: Xcel planned outages', 'https://www.211colorado.org/xcel-energy-planned-power-outages/'],
    ['CDC: wells and generators', 'https://stacks.cdc.gov/view/cdc/131229/cdc_131229_DS1.pdf'],
  ]],
  ['Floods', [
    ['Colorado Sun: June 2026 Evergreen flood', 'https://coloradosun.com/2026/06/25/flooding-debris-evergreen-kittredge-bear-creek/'],
    ['Canyon Courier: flash flood', 'https://www.canyoncourier.com/news/flash-flood-rips-overnight-through-foothills-communities/article_954000b8-f392-4ff0-88f8-1f02cc887b90.html'],
    ['Bear Creek flood history', 'https://udfcd.org/FWP/ebb/bear_history.html'],
    ['CDOT CO 74 rockfall', 'https://codot.gov/news/2020/september-2020/co74bearcreeknews'],
    ['Colorado Geological Survey: earthquakes', 'https://planningforhazards.colorado.gov/earthquake'],
  ]],
  ['Insurance', [
    ['CPR: FAIR Plan launch', 'https://www.cpr.org/2025/07/14/colorado-property-insurer-last-resort-fair-plan-launch/'],
    ['DOI bulletin B-5.56 on risk scores', 'https://doi.colorado.gov/sites/doi/files/documents/New%20BULLETIN%20B-5.56%20Guidance%20for%20Carriers%20Regarding%20Annual%20Written%20Notice%20to%20Policyholders%20on%20Risk%20Scores%20and%20Mitigation%20Discounts.docx.pdf'],
  ]],
  ['Home', [
    ['NCSL CO detector statutes', 'https://www.ncsl.org/environment-and-natural-resources/carbon-monoxide-detector-installation-statutes'],
    ['CSIA chimney guidance', 'https://www.usinspect.com/blog/chimney-safety/'],
    ['Ferrellgas winter propane', 'https://www.ferrellgas.com/tank-talk/blog-articles/5-propane-related-winter-weather-tips-to-keep-in-mind-this-season/'],
    ['CSFS home ignition zone', 'https://csfs.colostate.edu/wildfire-mitigation/protect-your-home-property-from-wildfire/'],
    ['EPA smoke fact sheet', 'https://www.epa.gov/system/files/documents/2026-06/reduce-smoke-exposure-factsheet.pdf'],
    ['AirNow', 'https://fire.airnow.gov'],
  ]],
  ['Wildlife', [
    ['CPW lions', 'https://cpw.state.co.us/lions'],
    ['CPW bears', 'https://cpw.state.co.us/learn/Pages/LivingwithWildlifeBears2.aspx'],
    ['CBS: lions and pets in Evergreen', 'https://www.cbsnews.com/colorado/news/mountain-lion-pets-attacked-evergreen-warning/'],
    ['KKCO: Jeffco lion attacks Jan 2026', 'https://www.kkco11news.com/2026/02/04/deputies-issue-warning-residents-after-two-confirmed-mountain-lion-attacks-pets-jefferson-county'],
    ['KRDO: moose attacks 2025', 'https://krdo.com/news/2025/06/03/cpw-sends-warning-after-cow-moose-attacks-continue-across-colorado/'],
    ['9News: Evergreen Lake elk', 'https://9news.com/article/life/animals/evergreen-lake-elk-calves-danger-watchers/73-2d841aa3-e50e-4c3a-a891-d4531138ca4c'],
  ]],
  ['Hiking', [
    ['Colorado Sun: Mount Blue Sky lightning, July 2026', 'https://coloradosun.com/2026/07/27/teen-boy-killed-hikers-injured-lightning-mount-blue-sky/'],
    ['NOLS lightning', 'https://www.nols.edu/?p=746389'],
    ['KUNC on HAPE', 'https://www.kunc.org/news/2023-06-08/what-is-hape-how-people-in-the-mountains-can-still-fall-ill-to-mountain-sickness'],
    ['Alpine Rescue Team FAQ', 'https://alpinerescueteam.org/about-alpine/faqs/'],
    ['CPW backcountry SAR', 'https://cpw.state.co.us/backcountry-search-and-rescue-program'],
    ['CAIC', 'https://avalanche.state.co.us'],
    ['Mount Blue Sky timed entry', 'https://www.recreation.gov/timed-entry/10087438'],
    ['Vets of the Rockies: hiking with dogs', 'https://vetsoftherockies.com/education/hiking-with-a-dog/'],
  ]],
  ['Ready.gov baselines', [
    ['Build a kit', 'https://www.ready.gov/kit'],
    ['Make a plan', 'https://www.ready.gov/plan'],
    ['Pets', 'https://www.ready.gov/pets'],
    ['Car safety', 'https://www.ready.gov/car'],
    ['Power outages', 'https://www.ready.gov/power-outages'],
    ['Safety skills', 'https://www.ready.gov/safety-skills'],
    ['Lakewood CERT', 'https://www.lakewoodco.gov/Local-Government/Departments/Police/Emergency-Preparedness/Community-Emergency-Response-Team-CERT-Training'],
  ]],
]

// --- pieces --------------------------------------------------------------------

const areaOf = new Map(AREAS.map((a) => [a.key, a]))
const hazOf = new Map(HAZARDS.map((h) => [h.key, h]))
const areaChip = (k) => { const a = areaOf.get(k); return `<a class="chip" href="#area-${k}">${a.emoji} ${esc(a.name)}</a>` }
const hazChip = (k) => { const h = hazOf.get(k); return `<a class="chip hz" href="#hz-${k}">${h.emoji} ${esc(h.name)}</a>` }

// Deterministic pines for the hero ridge (no Math.random: the page builds the same every time).
function ridge(seed, count, y0, hMin, hMax, cls) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = (i / count) * 1240 - 20 + rnd() * 30
    const h = hMin + rnd() * (hMax - hMin)
    const w = h * 0.42
    const y = y0 + rnd() * 14
    out += `<path class="${cls}" d="M${x.toFixed(1)} ${(y - h).toFixed(1)} L${(x + w * 0.38).toFixed(1)} ${(y - h * 0.62).toFixed(1)} L${(x + w * 0.24).toFixed(1)} ${(y - h * 0.62).toFixed(1)} L${(x + w * 0.5).toFixed(1)} ${(y - h * 0.3).toFixed(1)} L${(x + w * 0.32).toFixed(1)} ${(y - h * 0.3).toFixed(1)} L${(x + w * 0.56).toFixed(1)} ${y.toFixed(1)} L${(x - w * 0.56).toFixed(1)} ${y.toFixed(1)} L${(x - w * 0.32).toFixed(1)} ${(y - h * 0.3).toFixed(1)} L${(x - w * 0.5).toFixed(1)} ${(y - h * 0.3).toFixed(1)} L${(x - w * 0.24).toFixed(1)} ${(y - h * 0.62).toFixed(1)} L${(x - w * 0.38).toFixed(1)} ${(y - h * 0.62).toFixed(1)}Z"/>`
  }
  return out
}

const heroArt = `<svg class="scene" viewBox="0 0 1200 380" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-top)"/><stop offset="1" style="stop-color:var(--sky-bot)"/></linearGradient></defs>
  <rect width="1200" height="380" fill="url(#sky)"/>
  <circle cx="930" cy="120" r="46" class="sun"/>
  <path class="m1" d="M0 250 L120 170 L210 215 L340 110 L470 205 L560 150 L690 230 L820 120 L940 200 L1060 140 L1200 210 L1200 380 L0 380Z"/>
  <path class="m2" d="M0 290 L150 220 L260 265 L400 200 L540 270 L680 215 L800 275 L950 210 L1080 260 L1200 230 L1200 380 L0 380Z"/>
  ${ridge(7, 46, 318, 46, 92, 't1')}
  <path class="ground" d="M0 330 Q300 300 600 326 T1200 318 L1200 380 L0 380Z"/>
  ${ridge(31, 28, 382, 70, 130, 't2')}
</svg>`

const today = new Date().toISOString().slice(0, 10)
const dated = EVERGREEN_TASKS.filter((t) => t.due)

const taskRow = (t) => {
  const habit = !t.due
  const badge = habit
    ? `<span class="when habit" title="A habit: lives here, not in the chores list">↻ ${esc(t.when)}</span>`
    : `<span class="when" title="${esc(t.when)}${t.repeats ? ` · repeats ${esc(t.repeats)}` : ''}">${dayLabel(t.due)}${t.due.slice(0, 4) !== '2026' ? ` ’${t.due.slice(2, 4)}` : ''}${t.repeats ? ' ↻' : ''}</span>`
  return `<li class="task${habit ? ' is-habit' : ''}" id="task-${t.id}" data-id="${t.id}" data-due="${t.due || ''}"><span class="mark" aria-hidden="true"></span><span class="txt">${md(t.text)}</span>${badge}</li>`
}

const areaBlock = (a) => {
  const list = EVERGREEN_TASKS.filter((t) => t.area === a.key)
  const n = list.filter((t) => t.due).length
  return `<article class="area" id="area-${a.key}" data-area="${a.key}">
  <header><h3><span class="em">${a.emoji}</span>${esc(a.name)}</h3><span class="count" data-count="${a.key}">0 of ${n} done</span></header>
  <p class="intro">${esc(a.intro)}</p>
  <div class="why">Why: ${a.hazards.map(hazChip).join(' ')}</div>
  <ul class="tasks">${list.map(taskRow).join('')}</ul>
</article>`
}

const hazCard = (h) => `<article class="hzcard" id="hz-${h.key}">
  <header><span class="badge">${h.emoji}</span><div><h3>${esc(h.name)}</h3><p class="line">${esc(h.line)}</p></div></header>
  <p class="intro">${esc(h.intro)}</p>
  <div class="ppr">
    <div class="col prevent"><h4>🛡️ Prevent</h4><ul>${h.prevent.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="col prepare"><h4>🎒 Prepare</h4><ul>${h.prepare.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="col respond"><h4>🚨 Respond</h4><ul>${h.respond.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  </div>
  <p class="help"><b>Where the help is:</b> ${md(h.help)}</p>
  <div class="doit">Do it: ${h.areas.map(areaChip).join(' ')}</div>
</article>`

const yearRow = (r, i) => {
  const cells = Array.from({ length: 12 }, (_, k) => {
    const m = k + 1
    const peak = r.peaks.some(([a, b]) => inSpan(m, a, b))
    const can = inSpan(m, r.from, r.to)
    return `<span class="c m${m}${peak ? ' peak' : can ? ' can' : ''}"></span>`
  }).join('')
  return `<a class="yrow" href="#hz-${r.hz}" data-i="${i}"><span class="nm"><span class="em">${r.emoji}</span>${esc(r.name)}</span>${cells}</a>`
}

// "Next up" at build time; the script re-picks it in the browser with live done state.
const nextUp = dated.filter((t) => t.due >= today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 12)
const tile = (t, i) => {
  const a = areaOf.get(t.area)
  return `<a class="tile a-${t.area}" style="--tilt:${[-1.6, 1.2, -0.6, 1.8, -1.2, 0.8][i % 6]}deg" href="#task-${t.id}"><span class="pin"></span><span class="te">${a.emoji}</span><span class="tt">${esc(t.short)}</span><span class="td">${dayLabel(t.due)} · ${esc(a.name)}</span></a>`
}

const CLIENT = {
  tasks: EVERGREEN_TASKS.map(({ id, area, short, due }) => ({ id, area, short, due })),
  areas: AREAS.map(({ key, emoji, name }) => ({ key, emoji, name })),
  year: YEAR.map(({ emoji, name, often, fix, hz }) => ({ emoji, name, often, fix, hz: hazOf.get(hz).name })),
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Ready on Woods Dr — Evergreen prep</title>
<!-- Built by scripts/build-evergreen-page.cjs from scripts/evergreen-tasks.cjs. Edit those, then npm run build:evergreen. -->
<link rel="icon" href="/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Caveat:wght@600;700&family=Karla:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>
:root{
  --bg:#F2EDE0; --paper:#FFFCF4; --paper-2:#F7F1E3; --ink:#24291F; --muted:#6B6A58; --line:#DCD2BC; --line-strong:#C3B79C;
  --forest:#2E4A33; --pine:#3F6B47; --moss:#86A25F; --moss-soft:#DCE6C8; --bark:#6E4B2E; --bark-deep:#4A3220; --bark-soft:#EADCC8;
  --clay:#B5602D; --clay-soft:#F6E1D2; --sign:#5B3D25; --sign-ink:#FFF4DC;
  --sky-top:#E9D9B6; --sky-bot:#F4ECD8; --m1:#9AAE87; --m2:#6F8A62; --t1:#4E7350; --t2:#2E4A33; --ground:#3A5A3D; --sun:#F1C27B;
  --topo:rgba(110,75,46,.07); --shadow:0 2px 0 rgba(74,50,32,.08),0 10px 24px rgba(46,74,51,.10);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#141912; --paper:#1D241B; --paper-2:#232C21; --ink:#ECE8DA; --muted:#A8A890; --line:#323B2E; --line-strong:#465241;
    --forest:#A9CB9E; --pine:#8DBB86; --moss:#9DBB74; --moss-soft:#2A3823; --bark:#D3A77A; --bark-deep:#E6C49E; --bark-soft:#3A2D20;
    --clay:#E58D57; --clay-soft:#3D2619; --sign:#4A3220; --sign-ink:#FFE9BF;
    --sky-top:#1B2433; --sky-bot:#2D3340; --m1:#2F3D35; --m2:#26332A; --t1:#1E2B1F; --t2:#121A12; --ground:#162016; --sun:#EDE3C8;
    --topo:rgba(169,203,158,.05); --shadow:0 2px 0 rgba(0,0,0,.3),0 10px 24px rgba(0,0,0,.35);
  }
}
:root[data-theme="dark"]{
  --bg:#141912; --paper:#1D241B; --paper-2:#232C21; --ink:#ECE8DA; --muted:#A8A890; --line:#323B2E; --line-strong:#465241;
  --forest:#A9CB9E; --pine:#8DBB86; --moss:#9DBB74; --moss-soft:#2A3823; --bark:#D3A77A; --bark-deep:#E6C49E; --bark-soft:#3A2D20;
  --clay:#E58D57; --clay-soft:#3D2619; --sign:#4A3220; --sign-ink:#FFE9BF;
  --sky-top:#1B2433; --sky-bot:#2D3340; --m1:#2F3D35; --m2:#26332A; --t1:#1E2B1F; --t2:#121A12; --ground:#162016; --sun:#EDE3C8;
  --topo:rgba(169,203,158,.05); --shadow:0 2px 0 rgba(0,0,0,.3),0 10px 24px rgba(0,0,0,.35);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
/* Anchored jumps (from the nav, and from linked chores in Nala's Minions) land below the sticky nav. */
[id]{scroll-margin-top:72px}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Karla,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.55;overflow-x:hidden;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'%3E%3Cg fill='none' stroke='%236E4B2E' stroke-opacity='.09' stroke-width='1.2'%3E%3Cpath d='M-20 80c60-40 120 30 180-10s110-50 220 10'/%3E%3Cpath d='M-20 120c70-40 120 30 190-10s100-40 210 10'/%3E%3Cpath d='M-20 170c60-30 140 40 200 0s110-40 200 10'/%3E%3Cpath d='M-20 230c80-40 120 20 190-10s120-30 210 20'/%3E%3Cpath d='M-20 290c60-30 130 30 200 0s100-40 200 10'/%3E%3Cellipse cx='260' cy='60' rx='40' ry='18'/%3E%3Cellipse cx='260' cy='60' rx='22' ry='9'/%3E%3C/g%3E%3C/svg%3E")}
a{color:var(--pine);text-underline-offset:2px}
a:hover{color:var(--clay)}
h1,h2,h3,h4{margin:0;font-weight:400}
p{margin:0}
.wrap{max-width:1080px;margin:0 auto;padding-inline:16px}
.hand{font-family:Caveat,cursive;font-weight:700}

/* hero */
.hero{position:relative;min-height:440px;display:grid;align-items:start;overflow:hidden;border-bottom:6px solid var(--bark-deep)}
.scene{position:absolute;inset:0;width:100%;height:100%}
.scene .sun{fill:var(--sun)} .scene .m1{fill:var(--m1)} .scene .m2{fill:var(--m2)} .scene .t1{fill:var(--t1)} .scene .t2{fill:var(--t2)} .scene .ground{fill:var(--ground)}
.hero .wrap{width:100%;position:relative;padding-top:34px;padding-bottom:150px}
.plaque{max-width:640px;background:var(--sign);color:var(--sign-ink);border-radius:10px;padding:22px 24px 20px;position:relative;
  background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 2px,transparent 2px 9px),repeating-linear-gradient(0deg,rgba(0,0,0,.06) 0 1px,transparent 1px 22px);
  box-shadow:0 4px 0 rgba(0,0,0,.25),0 18px 40px rgba(0,0,0,.25);border:3px solid rgba(0,0,0,.18)}
.plaque::before,.plaque::after{content:"";position:absolute;top:12px;width:10px;height:10px;border-radius:50%;background:#C9B48A;box-shadow:inset -2px -2px 0 rgba(0,0,0,.35)}
.plaque::before{left:12px}.plaque::after{right:12px}
.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.85;font-weight:700}
h1{font-family:"Alfa Slab One",Rockwell,Georgia,serif;font-size:clamp(36px,7vw,62px);line-height:1;margin:8px 0 12px;letter-spacing:.01em}
.plaque p{font-size:17px;max-width:56ch}
.plaque a{color:#FFD58A}
.plaque a:hover{color:#fff}
.trail{margin-top:18px;display:grid;gap:4px}
.trail .bar{position:relative;height:26px}
.trail .path{position:absolute;left:0;right:30px;top:13px;border-top:3px dashed rgba(255,244,220,.5)}
.trail .walked{position:absolute;left:0;top:13px;border-top:3px solid #FFD58A;width:0;transition:width .8s ease}
.trail .hiker{position:absolute;top:-2px;font-size:22px;transform:translateX(-50%) scaleX(-1);transition:left .8s ease;left:0}
.trail .camp{position:absolute;right:0;top:-1px;font-size:22px}
.trail .lbl{font-size:14px;opacity:.92}
.sync{font-size:13px;opacity:.8;display:inline-flex;gap:6px;align-items:center}
.sync i{width:8px;height:8px;border-radius:50%;background:#C9B48A;display:inline-block}
.sync.on i{background:#9DD38A}
.note{position:absolute;right:max(16px,calc(50% - 520px));top:56px;transform:rotate(4deg);font-family:Caveat,cursive;font-size:24px;color:var(--bark-deep);background:#FFF3C4;padding:10px 16px 12px;box-shadow:0 8px 18px rgba(0,0,0,.18);max-width:220px;line-height:1.1}
.note::before{content:"";position:absolute;top:-10px;left:50%;width:70px;height:20px;margin-left:-35px;background:rgba(255,255,255,.55);transform:rotate(-3deg)}
@media (max-width:860px){.note{display:none}}

/* nav: signposts */
nav.posts{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
nav.posts .wrap{display:flex;gap:8px;overflow-x:auto;padding-block:10px;scrollbar-width:none}
nav.posts a{flex:none;text-decoration:none;color:var(--sign-ink);background:var(--sign);font-weight:700;font-size:14px;padding:6px 18px 6px 12px;
  clip-path:polygon(0 0,calc(100% - 10px) 0,100% 50%,calc(100% - 10px) 100%,0 100%);transition:transform .15s}
nav.posts a:hover{transform:translateX(3px);color:#fff}

/* sections */
section{margin-top:64px}
.sign{display:inline-flex;align-items:center;gap:10px;background:var(--sign);color:var(--sign-ink);font-family:"Alfa Slab One",Rockwell,Georgia,serif;font-size:clamp(22px,4vw,30px);
  padding:8px 34px 10px 18px;clip-path:polygon(0 0,calc(100% - 20px) 0,100% 50%,calc(100% - 20px) 100%,0 100%);
  background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 2px,transparent 2px 10px)}
.sec-head{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:space-between;margin-bottom:18px}
.sec-head p{color:var(--muted);max-width:62ch;flex:1 1 320px}
.up{font-size:13px;color:var(--muted);text-decoration:none;white-space:nowrap}

/* next up board */
.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(150px,100%),1fr));gap:18px;padding:22px;border-radius:14px;
  background:var(--bark-soft);border:2px solid var(--line-strong);box-shadow:inset 0 0 0 6px var(--paper-2)}
.tile{position:relative;display:grid;gap:6px;align-content:start;text-decoration:none;color:var(--ink);background:var(--paper);padding:20px 14px 14px;min-height:132px;
  border-radius:4px;box-shadow:var(--shadow);transform:rotate(var(--tilt));transition:transform .18s ease,box-shadow .18s;border-top:6px solid var(--moss)}
.tile:hover{transform:rotate(0) translateY(-4px) scale(1.03);color:var(--ink);z-index:2}
.tile .pin{position:absolute;top:-10px;left:50%;margin-left:-8px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f2a37a,var(--clay) 60%,#6b2e12);box-shadow:0 2px 3px rgba(0,0,0,.35)}
.tile .te{font-size:28px;line-height:1}
.tile .tt{font-weight:700;line-height:1.25}
.tile .td{font-size:13px;color:var(--muted)}
.tile.done{opacity:.5}
.tile.done .tt{text-decoration:line-through}
.a-house,.a-home{border-top-color:var(--bark)} .a-wildfire,.a-alerts{border-top-color:var(--clay)} .a-winter,.a-power{border-top-color:#6E8FA6}
.a-supplies,.a-plan{border-top-color:var(--moss)} .a-nala,.a-wildlife,.a-hiking{border-top-color:var(--pine)}
@media (max-width:520px){.board{padding:16px 12px;gap:14px;grid-template-columns:1fr 1fr}.tile{padding:18px 10px 10px;min-height:118px}.plaque{padding:20px 16px 18px}.hero .wrap{padding-bottom:110px}.hero{min-height:0}}
.board-foot{margin-top:10px;font-size:14px;color:var(--muted)}

/* the year */
.year{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px 16px 14px;box-shadow:var(--shadow);overflow-x:auto}
.ygrid{min-width:640px;display:grid;gap:3px}
.yhead,.yrow{display:grid;grid-template-columns:170px repeat(12,1fr);gap:3px;align-items:center}
.yhead span{font-size:12px;text-align:center;color:var(--muted);font-weight:700;position:relative}
.yhead span.now{color:var(--clay)}
.yhead span.now::after{content:"📍";position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:14px}
.yrow{text-decoration:none;color:var(--ink);border-radius:8px;padding:2px 0;transition:background .12s}
.yrow:hover,.yrow:focus-visible,.yrow.on{background:var(--paper-2);color:var(--ink)}
.yrow .nm{font-weight:700;font-size:14px;display:flex;gap:8px;align-items:center;padding-left:4px}
.yrow .em{width:26px;height:26px;border-radius:50%;display:inline-grid;place-items:center;background:var(--moss-soft);font-size:14px;flex:none}
.c{height:18px;border-radius:9px}
.c.can{background:color-mix(in srgb,var(--moss) 35%,transparent)}
.c.peak{background:var(--pine)}
.c.today{outline:2px solid var(--clay);outline-offset:1px}
.readout{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:15px;border-top:1px dashed var(--line-strong);padding-top:12px;min-height:76px}
.readout b{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--bark)}
.readout .hdr{grid-column:1/-1;font-family:"Alfa Slab One",Georgia,serif;font-size:18px;color:var(--forest)}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin-top:10px}
.legend i{display:inline-block;width:22px;height:10px;border-radius:5px;margin-right:6px;vertical-align:middle}
@media (max-width:640px){.readout{grid-template-columns:1fr}}

/* hazard cards */
.hzgrid{display:grid;gap:22px}
.hzcard{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:var(--shadow);position:relative}
.hzcard:target,.area:target{animation:glow 2.2s ease}
@keyframes glow{0%,40%{box-shadow:0 0 0 4px var(--clay),var(--shadow)}100%{box-shadow:var(--shadow)}}
.hzcard header{display:flex;gap:14px;align-items:center}
.hzcard .badge{width:56px;height:56px;flex:none;display:grid;place-items:center;font-size:28px;border-radius:50%;background:var(--moss-soft);border:3px solid var(--pine);
  box-shadow:0 0 0 3px var(--paper),0 0 0 5px var(--bark)}
.hzcard h3{font-family:"Alfa Slab One",Georgia,serif;font-size:24px;color:var(--forest)}
.hzcard .line{color:var(--bark);font-weight:700}
.hzcard .intro{margin:12px 0 14px;max-width:80ch}
.ppr{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media (max-width:760px){.ppr{grid-template-columns:1fr}}
.col{border-radius:10px;padding:12px 14px;background:var(--paper-2);border-left:5px solid var(--moss)}
.col.prepare{border-left-color:var(--bark)}
.col.respond{border-left-color:var(--clay)}
.col h4{font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.col ul{margin:0;padding-left:18px;display:grid;gap:3px;font-size:15px}
.help{margin-top:14px;font-size:15px;color:var(--muted)}
.doit,.why{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:14px;font-weight:700;color:var(--muted)}
.chip{display:inline-flex;gap:4px;align-items:center;text-decoration:none;font-weight:700;font-size:13px;padding:3px 10px;border-radius:999px;background:var(--moss-soft);color:var(--forest);border:1px solid color-mix(in srgb,var(--pine) 30%,transparent)}
.chip.hz{background:var(--bark-soft);color:var(--bark-deep);border-color:color-mix(in srgb,var(--bark) 30%,transparent)}
.chip:hover{background:var(--pine);color:var(--paper)}

/* tasks */
.filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.filters button{font:inherit;font-weight:700;font-size:14px;cursor:pointer;border-radius:999px;padding:6px 14px;border:2px solid var(--pine);background:transparent;color:var(--forest)}
.filters button[aria-pressed="true"]{background:var(--pine);color:var(--paper)}
.areas{columns:2 min(460px,100%);column-gap:22px}
.area{break-inside:avoid;margin-bottom:22px;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}
.area header{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.area h3{font-family:"Alfa Slab One",Georgia,serif;font-size:21px;color:var(--forest);display:flex;gap:8px;align-items:center}
.area .count{font-size:13px;font-weight:700;color:var(--bark);white-space:nowrap}
.area .intro{color:var(--muted);font-size:15px;margin-top:4px}
.area .why{margin-top:8px}
.pines{display:flex;gap:2px;margin-top:8px;font-size:15px;line-height:1;flex-wrap:wrap}
.pines span{filter:grayscale(1) opacity(.35);transition:filter .3s}
.pines span.lit{filter:none}
ul.tasks{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:2px}
.task{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:start;padding:8px 6px;border-radius:8px;border-top:1px dashed var(--line)}
.task:first-child{border-top:none}
.task:target{background:var(--clay-soft);animation:glow 2.2s ease}
.task .txt{overflow-wrap:anywhere}
.task .mark{width:18px;height:18px;margin-top:3px;border-radius:50%;border:2px solid var(--line-strong);display:grid;place-items:center;font-size:11px}
.task.done .mark{border-color:var(--pine);background:var(--pine)}
.task.done .mark::after{content:"✓";color:var(--paper);font-weight:900}
.task.done .txt{color:var(--muted);text-decoration:line-through;text-decoration-color:var(--moss)}
.task.is-habit .mark{border-style:dotted;border-color:var(--bark)}
.task .when{font-size:12px;font-weight:700;white-space:nowrap;padding:2px 8px;border-radius:6px;background:var(--moss-soft);color:var(--forest);margin-top:2px}
.task .when.habit{background:var(--bark-soft);color:var(--bark-deep)}
.task.soon .when{background:var(--clay);color:#fff}
.task.hidden{display:none}
.area.empty{display:none}

/* grab sheet */
.clip{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:34px 24px 24px;box-shadow:var(--shadow);margin-top:18px}
.clip::before{content:"";position:absolute;top:-16px;left:50%;width:150px;margin-left:-75px;height:30px;border-radius:8px 8px 4px 4px;background:linear-gradient(var(--bark),var(--bark-deep));box-shadow:0 3px 0 rgba(0,0,0,.2)}
.clip h3{font-family:"Alfa Slab One",Georgia,serif;font-size:20px;color:var(--forest);margin:20px 0 10px}
.clip h3:first-child{margin-top:0}
.dos{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:10px}
.dos li{background:var(--paper-2);border-radius:10px;padding:10px 12px;border-left:5px solid var(--clay)}
.dos b{display:block;color:var(--bark-deep)}
.kits{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.kit{border:2px dashed var(--line-strong);border-radius:12px;padding:12px}
.kit .k{font-weight:700;display:flex;gap:8px;align-items:center}
.kit .k span{font-size:22px}
.kit .w{font-size:13px;color:var(--bark);font-weight:700;margin:2px 0 6px}
.kit p{font-size:14px}
table.calls{width:100%;border-collapse:collapse;font-size:15px}
.calls td{padding:8px 10px;border-top:1px solid var(--line);vertical-align:top}
.calls td:first-child{font-weight:700;color:var(--bark-deep);width:38%}
.calls tr:nth-child(odd) td{background:var(--paper-2)}
.btn{font:inherit;font-weight:700;cursor:pointer;border:none;border-radius:999px;padding:8px 16px;background:var(--clay);color:#fff}
.btn:hover{filter:brightness(1.08)}

/* sources */
details.src{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:8px}
details.src summary{cursor:pointer;font-weight:700;color:var(--forest)}
details.src ul{margin:8px 0 2px;padding-left:20px;display:grid;gap:3px;font-size:15px}
.unverified{font-size:14px;color:var(--muted);margin-bottom:12px}

footer{margin-top:72px;background:var(--forest);color:var(--paper);padding:28px 0 36px;text-align:center}
footer a{color:var(--paper)}
footer .hand{font-size:26px;display:block;margin-bottom:6px}
:root[data-theme="dark"] footer, :root:not([data-theme="light"]) footer{}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) footer{background:#0E140D;color:var(--ink)} :root:not([data-theme="light"]) footer a{color:var(--forest)}}

@media print{
  body{background:#fff}
  .hero,nav,section:not(#grab),footer,.no-print{display:none !important}
  #grab{margin:0}
  .clip{box-shadow:none;border:none;padding:0}
  .clip::before{display:none}
}
</style>
</head>
<body>

<header class="hero" id="top">
  ${heroArt}
  <div class="wrap">
    <div class="plaque">
      <div class="eyebrow">29866 Woods Dr · Evergreen, Colorado</div>
      <h1>Ready on Woods Dr</h1>
      <p>Our plan for the <a href="#year">eleven things that go wrong</a> up here. <a href="#now">Start with what's next</a>, see <a href="#hazards">how each hazard is covered</a>, and <a href="#grab">grab the sheet</a> when it's real.</p>
      <div class="trail" aria-live="polite">
        <div class="bar"><span class="path"></span><span class="walked" id="walked"></span><span class="hiker" id="hiker">🥾</span><span class="camp">⛺</span></div>
        <div class="lbl"><b id="doneCount">0</b> of ${dated.length} jobs done · <span class="sync" id="sync"><i></i><span>Checking Nala's Minions…</span></span></div>
      </div>
    </div>
  </div>
  <div class="note">Ticks live in Nala's Minions; this page reads them.</div>
</header>

<nav class="posts" aria-label="Sections"><div class="wrap">
  <a href="#now">🍂 Next up</a><a href="#year">🗓️ The year</a><a href="#hazards">⚠️ Hazards</a><a href="#tasks">✅ Tasks</a><a href="#grab">📋 Grab sheet</a><a href="#sources">📚 Sources</a><a href="/">🐕 Minions</a>
</div></nav>

<main class="wrap">

<section id="now">
  <div class="sec-head"><h2 class="sign">🍂 Next up</h2><p>The next twelve jobs on the calendar. Tap one to jump to its row; tick it off in <a href="/">Nala's Minions</a>.</p></div>
  <div class="board" id="board">${nextUp.map(tile).join('')}</div>
  <p class="board-foot">Pinned by due date; finished jobs drop off the board.</p>
</section>

<section id="year">
  <div class="sec-head"><h2 class="sign">🗓️ The year</h2><p>June to September is the crowded season, and no month is clear. Hover a row for how often and how to stay ahead; tap it for the hazard.</p><a class="up" href="#top">Top ↑</a></div>
  <div class="year">
    <div class="ygrid">
      <div class="yhead"><span></span>${MONTHS.map((m, i) => `<span class="mh" data-m="${i + 1}">${m[0]}</span>`).join('')}</div>
      ${YEAR.map(yearRow).join('\n      ')}
    </div>
    <div class="readout" id="readout"><span class="hdr">Pick a row</span><div><b>How often</b><span>Hover or tap a hazard above.</span></div><div><b>How to stay ahead</b><span>Each row opens the card that covers it.</span></div></div>
    <div class="legend"><span><i style="background:color-mix(in srgb,var(--moss) 35%,transparent)"></i>can happen</span><span><i style="background:var(--pine)"></i>peak season</span><span>📍 this month</span></div>
  </div>
</section>

<section id="hazards">
  <div class="sec-head"><h2 class="sign">⚠️ Hazards</h2><p>Five trailheads, each drawn as prevent, prepare, respond, with where the help is and the task lists that carry it.</p><a class="up" href="#top">Top ↑</a></div>
  <div class="hzgrid">
${HAZARDS.map(hazCard).join('\n')}
  </div>
</section>

<section id="tasks">
  <div class="sec-head"><h2 class="sign">✅ Tasks</h2><p>${EVERGREEN_TASKS.length} tasks in eleven areas. Dated ones are chores in Nala's Minions with a reminder the day before; ↻ habits live here.</p><a class="up" href="#top">Top ↑</a></div>
  <div class="filters no-print" role="group" aria-label="Filter tasks">
    <button type="button" data-f="all" aria-pressed="true">All</button>
    <button type="button" data-f="todo" aria-pressed="false">To do</button>
    <button type="button" data-f="soon" aria-pressed="false">Next 30 days</button>
    <button type="button" data-f="habit" aria-pressed="false">↻ Habits</button>
    <button type="button" data-f="done" aria-pressed="false">Done</button>
  </div>
  <div class="areas">
${AREAS.map(areaBlock).join('\n')}
  </div>
</section>

<section id="grab">
  <div class="sec-head"><h2 class="sign">📋 Grab sheet</h2><p>The page for the fridge and the go-bags: what we do, what we carry, who we call.</p><button class="btn no-print" id="printBtn" type="button">🖨️ Print just this</button></div>
  <div class="clip">
    <h3>🗺️ What we do</h3>
    <ul class="dos">${DO.map(([b, t]) => `<li><b>${esc(b)}</b>${esc(t)}</li>`).join('')}</ul>
    <h3>🎒 What we carry</h3>
    <div class="kits">${KITS.map(([e, k, w, t]) => `<div class="kit"><div class="k"><span>${e}</span>${esc(k)}</div><div class="w">📍 ${esc(w)}</div><p>${esc(t)}</p></div>`).join('')}</div>
    <h3>📞 Who we call</h3>
    <table class="calls"><tbody>${CALLS.map(([n, c]) => `<tr><td>${esc(n)}</td><td>${tel(md(c).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>'))}</td></tr>`).join('')}</tbody></table>
    <p class="no-print" style="margin-top:14px;font-size:14px;color:var(--muted)">Built from ${areaChip('plan')} ${areaChip('supplies')} ${areaChip('nala')}; the why behind each line is under <a href="#hazards">Hazards</a>.</p>
  </div>
</section>

<section id="sources">
  <div class="sec-head"><h2 class="sign">📚 Sources</h2><p>Pages opened for the facts here, as of October 14, 2026.</p><a class="up" href="#top">Top ↑</a></div>
  <p class="unverified">Still unverified: the Xcel/CORE boundary inside Evergreen, whether Jeffco uses Genasys evacuation zones, NOAA radio reception at the house, the Evergreen urgent care address, and the Woods Dr utilities themselves.</p>
${SOURCES.map(([g, list]) => `  <details class="src"><summary>${esc(g)} (${list.length})</summary><ul>${list.map(([l, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul></details>`).join('\n')}
</section>

</main>

<footer>
  <span class="hand">Be ready, then go hiking. 🌲🐕🌲</span>
  <a href="/">Back to Nala's Minions</a> · <a href="#top">Top of the trail</a>
</footer>

<script>
(() => {
  const DATA = ${JSON.stringify(CLIENT)};
  const $ = (s) => document.querySelector(s)
  const $$ = (s) => [...document.querySelectorAll(s)]
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
  const today = iso(new Date())
  const soon = iso(new Date(Date.now() + 30 * 864e5))
  const areaOf = Object.fromEntries(DATA.areas.map((a) => [a.key, a]))
  const dated = DATA.tasks.filter((t) => t.due)
  let done = {}

  // This month in the year chart.
  const m = new Date().getMonth() + 1
  $$('.yhead .mh').forEach((h) => h.classList.toggle('now', +h.dataset.m === m))
  $$('.c.m' + m).forEach((c) => c.classList.add('today'))

  const readout = $('#readout')
  $$('.yrow').forEach((row) => {
    const show = () => {
      const r = DATA.year[row.dataset.i]
      $$('.yrow').forEach((x) => x.classList.toggle('on', x === row))
      readout.innerHTML = '<span class="hdr">' + r.emoji + ' ' + r.name + ' <span style="font-family:Karla;font-size:14px;color:var(--muted)">→ ' + r.hz + '</span></span><div><b>How often</b><span>' + r.often + '</span></div><div><b>How to stay ahead</b><span>' + r.fix + '</span></div>'
    }
    row.addEventListener('mouseenter', show)
    row.addEventListener('focus', show)
  })

  function render() {
    let n = 0
    $$('.task').forEach((li) => {
      const d = !!done[li.dataset.id]
      li.classList.toggle('done', d)
      li.classList.toggle('soon', !d && li.dataset.due && li.dataset.due <= soon)
      if (d) n++
    })
    $('#doneCount').textContent = n
    const pct = dated.length ? n / dated.length : 0
    $('#walked').style.width = 'calc((100% - 30px) * ' + pct + ')'
    $('#hiker').style.left = 'calc((100% - 30px) * ' + pct + ')'
    DATA.areas.forEach((a) => {
      const list = dated.filter((t) => t.area === a.key)
      const k = list.filter((t) => done[t.id]).length
      const c = document.querySelector('[data-count="' + a.key + '"]')
      if (c) c.textContent = k + ' of ' + list.length + ' done' + (list.length && k === list.length ? ' 🎉' : '')
      const block = document.getElementById('area-' + a.key)
      let p = block.querySelector('.pines')
      if (!p) { p = document.createElement('div'); p.className = 'pines'; p.setAttribute('aria-hidden', 'true'); block.querySelector('.why').before(p) }
      p.innerHTML = list.map((t) => '<span class="' + (done[t.id] ? 'lit' : '') + '">🌲</span>').join('')
    })
    const next = dated.filter((t) => !done[t.id] && t.due >= today).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 12)
    const tilts = [-1.6, 1.2, -0.6, 1.8, -1.2, 0.8]
    $('#board').innerHTML = next.length
      ? next.map((t, i) => { const a = areaOf[t.area]; return '<a class="tile a-' + t.area + '" style="--tilt:' + tilts[i % 6] + 'deg" href="#task-' + t.id + '"><span class="pin"></span><span class="te">' + a.emoji + '</span><span class="tt">' + t.short + '</span><span class="td">' + MON[+t.due.slice(5, 7) - 1] + ' ' + +t.due.slice(8) + ' · ' + a.name + '</span></a>' }).join('')
      : '<p class="hand" style="font-size:28px">Board is clear. Go take Nala up a trail. 🐕</p>'
    applyFilter()
  }

  let filter = 'all'
  function applyFilter() {
    $$('.task').forEach((li) => {
      const d = li.classList.contains('done'), h = li.classList.contains('is-habit')
      const show = filter === 'all' || (filter === 'todo' && !d && !h) || (filter === 'done' && d) || (filter === 'habit' && h) || (filter === 'soon' && li.classList.contains('soon'))
      li.classList.toggle('hidden', !show)
    })
    $$('.area').forEach((a) => a.classList.toggle('empty', !a.querySelector('.task:not(.hidden)')))
  }
  $$('.filters button').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.f
    $$('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
    applyFilter()
  }))

  $('#printBtn').addEventListener('click', () => window.print())

  // Live done-state from the chores list (read-only: ticking happens in the app).
  const sync = $('#sync')
  const setSync = (on, txt) => { sync.classList.toggle('on', on); sync.querySelector('span').textContent = txt }
  render()
  fetch('/api/tasks', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(({ tasks }) => {
      done = {}
      for (const t of tasks || []) if (String(t.id).startsWith('evergreen-')) done[t.id.slice(10)] = !!t.done
      setSync(true, 'Live from Nala\\'s Minions')
      render()
    })
    .catch(() => setSync(false, 'Offline: open Nala\\'s Minions for ticks'))
})()
</script>
</body>
</html>
`

fs.writeFileSync(OUT, html)
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${(html.length / 1024).toFixed(0)} KB, ${EVERGREEN_TASKS.length} tasks).`)
