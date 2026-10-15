// The how-to sections on /evergreen: frost-proofing the rear faucets, packing
// the go-bags, and stocking two weeks of food and a week of water. Read by
// scripts/build-evergreen-page.cjs; tasks point here through their `guide`.
//
// Facts come from the pages in GUIDE_SOURCES (opened Oct 15, 2026). The
// pantry quantities are our own starting list, not anyone's standard.

const GUIDE_SOURCES = [
  ['Ready.gov: water', 'https://www.ready.gov/water'],
  ['Ready.gov: food', 'https://www.ready.gov/food'],
  ['CDC: boil water advisory (3 minutes above 6,500 ft)', 'https://www.cdc.gov/natural-disasters/psa-toolkit/boil-water-advisory.html'],
  ['Mr. Rooter: protecting outdoor faucets from freezing', 'https://www.mrrooter.com/about/blog/how-to-protect-outdoor-faucets-from-freezing/'],
  ['B&W Valve: frost-proof sillcock guide', 'https://www.bwvalve.com/so/ultimate-guide-to-frost-proof-sillcocks'],
  ['Whole Dog Journal: how much water a dog drinks', 'https://www.whole-dog-journal.com/?p=584359'],
]

// Go-bag contents: the grab sheet's lists, filled out with Ready.gov's kit and
// pet kit. `id`s key the per-browser packing ticks, so keep them stable.
const GOBAG = [
  ['💧', 'Water and food', [
    ['gb-water', '3 days of water: 3 gallons each, about 25 lb, so a liter rides in the bag and a case rides in the car'],
    ['gb-food', '3 days of no-cook food: bars, nut butter packets, tuna pouches, dried fruit'],
    ['gb-opener', 'Manual can opener, spork, a cup'],
  ]],
  ['💊', 'Health', [
    ['gb-meds', 'A week of prescriptions, plus pain relievers and antacids'],
    ['gb-firstaid', 'First aid kit'],
    ['gb-n95', 'N95s, two each (smoke)'],
    ['gb-glasses', 'Glasses or contacts and solution'],
    ['gb-hygiene', 'Toothbrush, sanitizer, wipes, toilet paper, feminine supplies'],
  ]],
  ['🔦', 'Light and power', [
    ['gb-headlamp', 'Headlamp and spare batteries'],
    ['gb-battery', 'Battery bank, charged, with both phone cables'],
    ['gb-radio', 'Hand-crank or battery radio (one for the household)'],
  ]],
  ['📄', 'Papers and money', [
    ['gb-cash', '$200 cash in small bills'],
    ['gb-usb', 'IDs, insurance, deed and vet records on a USB (and in the cloud)'],
    ['gb-map', 'Paper map with both evacuation routes marked'],
    ['gb-sheet', 'The grab sheet, printed'],
  ]],
  ['🧥', 'Clothes', [
    ['gb-clothes', 'A full change of clothes and socks'],
    ['gb-boots', 'Boots by the bag, not in a closet'],
    ['gb-warm', 'Warm layer, rain shell, hat and gloves'],
  ]],
  ['🧰', 'Tools and signal', [
    ['gb-whistle', 'Whistle'],
    ['gb-tool', 'Multitool and a little duct tape'],
    ['gb-bags', 'Trash bags and zip ties'],
    ['gb-matches', 'Matches in a waterproof case'],
  ]],
]
const NALABAG = [
  ['nb-food', '5 days of food in an airtight bag, and treats'],
  ['nb-water', 'Water and a collapsible bowl'],
  ['nb-meds', 'Her meds, in a waterproof pouch'],
  ['nb-leash', 'Spare leash and harness; the tag on her collar'],
  ['nb-records', 'Vaccine and microchip records'],
  ['nb-photo', 'A photo of us with her (proves she is ours at a shelter)'],
  ['nb-comfort', 'Towel, a toy, poop bags'],
  ['nb-aid', 'Dog first aid kit (ask the vet what goes in it)'],
]

// Our two-week list for two adults: 14 days x 3 meals x 2 people = 84 meals.
const PANTRY = [
  ['🥣', 'Breakfast', '28', [['Instant oatmeal', '28 packets'], ['Granola or cereal', '3 boxes'], ['Shelf-stable milk', '8 quarts'], ['Instant coffee and tea', '1 jar, 1 box']]],
  ['🥪', 'Lunch', '28', [['Peanut butter', '2 jars (40 oz)'], ['Crackers', '4 boxes'], ['Tuna or chicken pouches', '14'], ['Dried fruit', '2 lb']]],
  ['🍲', 'Dinner', '28', [['Ready-to-eat soup, chili, stew', '28 cans'], ['Canned beans', '6 cans'], ['Canned vegetables', '8 cans'], ['Rice and pasta (needs the range)', '4 lb']]],
  ['🍫', 'Snacks', 'daily', [['Protein or granola bars', '28'], ['Trail mix', '2 lb'], ['Canned fruit', '8 cans'], ['Chocolate', 'for morale']]],
  ['🍽️', 'Kitchen', '', [['Manual can openers', '2'], ['Paper plates, bowls, utensils', '2 weeks'], ['Trash bags, wipes', '1 box each'], ['Long lighter for the range', '1']]],
  ['🐾', 'Nala', '14 days', [['Her kibble, in an airtight bin', '14 days'], ['Treats', '1 bag']]],
]

function guides({ esc, md, taskLink }) {
  const pack = (id, text) => `<label class="pk"><input type="checkbox" data-pack="${id}"><span>${esc(text)}</span></label>`

  // A cutaway of the wall: the valve seat sits in the warm house, the barrel
  // pitches down to the outside so it drains, a new shutoff sits on the
  // supply, and the hose comes off for winter.
  const faucetArt = `<svg class="cut" viewBox="0 0 720 270" role="img" aria-label="A frost-free faucet shuts off inside the warm wall and drains outward">
  <defs><marker id="cut-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ax"/></marker></defs>
  <rect x="0" y="0" width="300" height="270" class="cold"/><rect x="380" y="0" width="340" height="270" class="warm"/>
  <text x="24" y="34" class="zone">❄️ Outside, below freezing</text><text x="696" y="34" text-anchor="end" class="zone">🔥 Inside, heated</text>
  <rect x="300" y="0" width="80" height="270" class="wall"/><text x="340" y="258" text-anchor="middle" class="small">wall</text>
  <path d="M248 150 L520 120" class="barrel"/>
  <circle cx="520" cy="120" r="11" class="seat"/>
  <text x="520" y="80" text-anchor="middle" class="lbl">valve shuts here,</text><text x="520" y="96" text-anchor="middle" class="lbl">in the warm</text>
  <path d="M531 120 H690" class="pipe"/>
  <g transform="translate(612 120)"><path d="M-12 -12 L12 12 M-12 12 L12 -12" class="valve"/><rect x="-4" y="-26" width="8" height="14" class="valve-h"/></g>
  <text x="612" y="160" text-anchor="middle" class="lbl">new shutoff + drain</text><text x="690" y="112" text-anchor="end" class="small">supply →</text>
  <g><rect x="226" y="138" width="24" height="26" rx="4" class="spout"/><path d="M238 164 v14" class="spout-l"/><circle cx="238" cy="190" r="3.5" class="drip"/><circle cx="238" cy="206" r="3" class="drip"/></g>
  <text x="24" y="104" class="lbl">5–10° down to the outside,</text><text x="24" y="120" class="lbl">so it drains when it shuts</text><path d="M200 112 L 252 136" class="lead" marker-end="url(#cut-arrow)"/>
  <path d="M206 182 C 160 210 120 196 70 226" class="hose"/><path d="M178 186 l20 20 M198 186 l-20 20" class="nope"/>
  <text x="96" y="252" class="lbl">hose off before the first freeze</text>
</svg>`

  const html = `
<section id="faucets">
  <div class="sec-head"><h2 class="sign">🚰 Frost-proof faucets</h2><p>The inspection found the rear faucets with no shutoff, easy to freeze (item 35). A burst line in a cold snap floods the inside, so this goes before the first hard freeze.</p><a class="up" href="#top">Top ↑</a></div>
  <div class="guide">
    <div class="steps3">
      <div class="step s1"><span class="n">1</span><h3>Now: the stopgap</h3><ul><li>Hose off the reel and off both rear faucets.</li><li>Foam faucet covers, sealed tight to the siding.</li><li>Foam insulation on any pipe you can see inside behind them.</li><li>Gaps where the pipes go through the wall caulked or foamed.</li></ul></div>
      <div class="step s2"><span class="n">2</span><h3>The fix: frost-free sillcocks</h3><ul><li>The valve sits 4 to 24 inches inside the wall, in the heat; pick one a little longer than the wall is thick, measured to the supply pipe.</li><li>Pitched 5 to 10 degrees down to the outside so it drains every time it shuts.</li><li>An anti-siphon model (most codes require it now).</li><li>A shutoff with a drain on each supply line inside.</li><li>Booked with ${taskLink('house-1', 'the spring plumber visit')} (gas line and heater pipe too), or sooner if a slot opens before the deep cold.</li></ul></div>
      <div class="step s3"><span class="n">3</span><h3>Every October</h3><ul><li>Hoses off: a hose left on traps water, and that is the most common way a frost-free faucet still bursts.</li><li>Close the inside shutoff, open the faucet, let it drain.</li><li>Still trickling with the shutoff closed? The valve leaks: plumber.</li><li>It is on ${taskLink('home-5', 'the October checklist')}.</li></ul></div>
    </div>
    <div class="cutwrap">${faucetArt}</div>
    <details class="diy"><summary>If we install them ourselves</summary><ol>
      <li>Shut the main water off; open the lowest faucet inside and the outdoor one to drain.</li>
      <li>Unscrew the old faucet outside; cut it free of the supply inside.</li>
      <li>Drill from inside to out, slightly larger than the barrel, angled down to the outside.</li>
      <li>Slide the sillcock in from outside, spout down; check the pitch before fastening.</li>
      <li>Connect the supply: solder, threaded, or push-fit on a square, deburred cut.</li>
      <li>Screw the flange to the wall and caulk around it with exterior silicone.</li>
      <li>Main back on; check both ends for leaks. Never insulate over the inside connection.</li>
    </ol></details>
    <div class="doit">Tasks: ${taskLink('house-2', '🏠 Faucet stopgap', true)} ${taskLink('house-1', '🏠 Spring plumber visit', true)} ${taskLink('home-5', '🛠️ October: faucets drained', true)}</div>
  </div>
</section>

<section id="gobags">
  <div class="sec-head"><h2 class="sign">🎒 Go-bags</h2><p>One each in the hall closet and Nala's clipped to the crate, packed for an Evacuation Warning. Tick items as they go in; ticks stay in this browser.</p><a class="up" href="#top">Top ↑</a></div>
  <div class="guide">
    <div class="ps">Grab the six P's on the way out: <b>people and Nala</b>, <b>prescriptions</b>, <b>papers</b>, <b>personal needs</b>, <b>priceless things</b>, <b>phones and chargers</b>.</div>
    <div class="packgrid">
      ${GOBAG.map(([e, t, items]) => `<div class="pack"><h3><span>${e}</span>${esc(t)}<em class="pc" data-pc></em></h3>${items.map(([id, x]) => pack(id, x)).join('')}</div>`).join('\n      ')}
      <div class="pack nala"><h3><span>🐾</span>Nala's bag<em class="pc" data-pc></em></h3>${NALABAG.map(([id, x]) => pack(id, x)).join('')}</div>
    </div>
    <p class="packfoot"><b id="packCount">0</b> of ${GOBAG.reduce((n, g) => n + g[2].length, 0) + NALABAG.length} packed · <button type="button" class="linkbtn" id="packReset">start over</button></p>
    <div class="doit">Tasks: ${taskLink('supplies-1', "🎒 Pack go-bags and Nala's bag", true)} ${taskLink('supplies-3', '🎒 April and October swap', true)} · Also: <a class="chip" href="#grab">📋 Grab sheet</a></div>
  </div>
</section>

<section id="stock">
  <div class="sec-head"><h2 class="sign">🥫 Food and water</h2><p>Enough to sit tight through a snowed-in week or a boil-water order without a store run. Inside the heated house, not the garage: jugs and cans freeze out there.</p><a class="up" href="#top">Top ↑</a></div>
  <div class="guide">
    <div class="water">
      <div class="wcalc">
        <h3>💧 7 days of water</h3>
        <p>A gallon a person a day, for drinking and washing up. Nala drinks about an ounce per pound a day.</p>
        <label class="nala-w">Nala weighs <input type="number" id="nalaLb" min="5" max="150" step="1" inputmode="numeric" placeholder="lb"> lb</label>
        <div class="jugs" id="jugs" aria-hidden="true"></div>
        <p class="wtotal"><b id="galTotal">14</b> gallons: <span id="galSplit">14 for us</span></p>
      </div>
      <div class="wsteps">
        <h3>How to store it</h3>
        <ol>
          <li><b>Easiest: buy it.</b> Sealed gallon jugs or cases, kept in their packaging somewhere cool and dark.</li>
          <li><b>Or fill our own</b> in food-grade containers: wash with dish soap, sanitize with 1 teaspoon of unscented bleach per quart of water, fill from the tap.</li>
          <li><b>Date it.</b> Water we bottle ourselves gets replaced every six months: the ${taskLink('supplies-5', 'April and October swap')}.</li>
        </ol>
        <h3>When the stock runs out</h3>
        <ul>
          <li><b>Boil:</b> a rolling boil for 3 minutes, not 1: Evergreen is above 6,500 feet.</li>
          <li><b>Or bleach:</b> 1/8 teaspoon of plain 5 to 6% bleach per gallon, stir, wait 30 minutes; it should smell faintly of chlorine.</li>
          <li>Don't ration unless told to, and coffee, soda and beer don't count.</li>
        </ul>
      </div>
    </div>
    <h3 class="ph">🥫 14 days of food for two</h3>
    <p class="pantry-lede">84 meals. Food we already eat, mostly no-cook, so it works cold if the power is out. Rice and pasta only if the gas range burners light with a match: check that now.</p>
    <div class="pantry">
      ${PANTRY.map(([e, t, n, rows]) => `<div class="shelf"><h4><span>${e}</span>${esc(t)}${n ? `<em>${esc(n)}</em>` : ''}</h4><ul>${rows.map(([a, q]) => `<li><span>${esc(a)}</span><b>${esc(q)}</b></li>`).join('')}</ul></div>`).join('\n      ')}
    </div>
    <div class="rules">
      <div><b>Keep it good.</b> Cans in a cool, dry spot; boxes in sealed plastic or metal bins. Nothing swollen, dented or rusty.</div>
      <div><b>Rotate.</b> Eat the oldest first and restock at the April and October swap.</div>
      <div><b>In an outage.</b> Keep the fridge shut (about 4 hours cold). Perishables above 40°F for 2 hours get tossed. When in doubt, throw it out.</div>
    </div>
    <div class="doit">Tasks: ${taskLink('supplies-2', '🎒 Stock 7 days water, 14 days food', true)} ${taskLink('supplies-5', '🎒 Rotate water and food', true)}</div>
  </div>
</section>
`

  const css = `
/* how-tos */
.guide{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:var(--shadow)}
.guide h3{font-family:"Zilla Slab",Georgia,serif;font-weight:500;font-size:22px;color:var(--forest);margin-bottom:6px}
.steps3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
@media (max-width:820px){.steps3{grid-template-columns:1fr}}
.step{position:relative;background:var(--paper-2);border-radius:12px;padding:16px 16px 14px 16px;border-top:5px solid var(--moss)}
.step.s2{border-top-color:var(--bark)} .step.s3{border-top-color:var(--clay)}
.step .n{position:absolute;top:-16px;right:14px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--sign);color:var(--sign-ink);font-family:"Alfa Slab One",Georgia,serif;font-size:15px}
.step ul,.wsteps ul,.wsteps ol,.diy ol{margin:0;padding-left:20px;display:grid;gap:5px;font-size:15px}
.cutwrap{overflow-x:auto;margin:20px 0 8px}
.cut{display:block;width:100%;min-width:600px;height:auto;border-radius:12px;border:1px solid var(--line)}
.cut .cold{fill:color-mix(in srgb,#6E8FA6 16%,var(--paper))} .cut .warm{fill:color-mix(in srgb,var(--clay) 12%,var(--paper))}
.cut .wall{fill:var(--bark-soft);stroke:var(--bark);stroke-width:1.5}
.cut .barrel{stroke:var(--forest);stroke-width:12;stroke-linecap:round;fill:none}
.cut .pipe{stroke:var(--forest);stroke-width:8;fill:none}
.cut .seat{fill:var(--clay);stroke:var(--paper);stroke-width:2}
.cut .valve{stroke:var(--bark-deep);stroke-width:4} .cut .valve-h{fill:var(--bark-deep)}
.cut .spout{fill:var(--forest)} .cut .spout-l{stroke:var(--forest);stroke-width:5}
.cut .drip{fill:#6E8FA6}
.cut .hose{stroke:#7E9A5A;stroke-width:7;fill:none;stroke-linecap:round;opacity:.6}
.cut .nope{stroke:var(--clay);stroke-width:5;stroke-linecap:round}
.cut .ax{fill:var(--muted)} .cut .lead{stroke:var(--muted);stroke-width:1.25;fill:none}
.cut text{fill:var(--ink);font-family:Karla,sans-serif}
.cut .zone{font-size:15px;font-weight:700} .cut .lbl{font-size:14px} .cut .small{font-size:12px;fill:var(--muted)}
details.diy{margin-top:12px;background:var(--paper-2);border-radius:10px;padding:10px 14px}
details.diy summary{cursor:pointer;font-weight:700;color:var(--forest)}
details.diy ol{margin-top:8px}
.ps{background:var(--bark-soft);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:15px}
.packgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:14px}
.pack{border:2px dashed var(--line-strong);border-radius:12px;padding:12px 14px}
.pack.nala{border-color:var(--pine);background:var(--moss-soft)}
.pack h3{display:flex;gap:8px;align-items:center;font-size:19px}
.pack h3 .pc{margin-left:auto;font-style:normal;font-family:Karla,sans-serif;font-size:12px;font-weight:700;color:var(--bark)}
.pk{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:start;padding:5px 0;font-size:15px;cursor:pointer}
.pk input{appearance:none;-webkit-appearance:none;width:18px;height:18px;margin:2px 0 0;border:2px solid var(--line-strong);border-radius:5px;display:grid;place-items:center;cursor:pointer}
.pk input:checked{background:var(--pine);border-color:var(--pine)}
.pk input:checked::after{content:"✓";color:var(--paper);font-size:12px;font-weight:900}
.pk input:checked + span{color:var(--muted);text-decoration:line-through;text-decoration-color:var(--moss)}
.packfoot{margin-top:12px;font-size:14px;color:var(--muted)}
.linkbtn{font:inherit;background:none;border:none;color:var(--pine);text-decoration:underline;cursor:pointer;padding:0}
.water{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:18px}
@media (max-width:820px){.water{grid-template-columns:1fr}}
.wcalc{background:var(--paper-2);border-radius:12px;padding:16px}
.wcalc p{font-size:15px}
.nala-w{display:inline-flex;gap:8px;align-items:center;margin:10px 0;font-weight:700}
.nala-w input{width:72px;font:inherit;padding:4px 8px;border-radius:8px;border:2px solid var(--line-strong);background:var(--paper);color:var(--ink)}
.jugs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px}
.jug{width:24px;height:32px;border-radius:6px 6px 5px 5px;background:linear-gradient(to top,#6E8FA6 var(--fill,100%),transparent var(--fill,100%));border:2px solid #6E8FA6;position:relative}
.jug::before{content:"";position:absolute;top:-7px;left:6px;width:8px;height:5px;border-radius:2px 2px 0 0;background:#6E8FA6}
.jug.dog{border-color:var(--bark);background:linear-gradient(to top,var(--bark) var(--fill,100%),transparent var(--fill,100%))}
.jug.dog::before{background:var(--bark)}
.wtotal{font-size:15px}
.wtotal b{font-family:"Alfa Slab One",Georgia,serif;font-size:26px;color:var(--forest);font-weight:400}
.wsteps h3+ol,.wsteps h3+ul{margin-bottom:14px}
.ph{margin-top:22px}
.pantry-lede{font-size:15px;color:var(--muted);margin-bottom:12px}
.pantry{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr));gap:12px}
.shelf{background:var(--paper-2);border-radius:10px;padding:12px 14px;border-bottom:6px solid var(--bark)}
.shelf h4{display:flex;gap:8px;align-items:center;font-weight:700;margin-bottom:6px}
.shelf h4 em{margin-left:auto;font-style:normal;font-size:12px;color:var(--bark);font-weight:700}
.shelf ul{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:14px}
.shelf li{display:flex;justify-content:space-between;gap:10px;border-top:1px dashed var(--line);padding-top:4px}
.shelf li:first-child{border-top:none}
.shelf li b{white-space:nowrap;color:var(--forest)}
.rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:10px;margin-top:14px;font-size:15px}
.rules div{border-left:5px solid var(--moss);padding:6px 12px}

`

  const js = `
  // Go-bag packing ticks: per browser, a convenience only.
  const PK = 'evergreen-pack'
  let packed = {}
  try { packed = JSON.parse(localStorage.getItem(PK) || '{}') || {} } catch (e) { packed = {} }
  const boxes = $$('[data-pack]')
  function renderPack() {
    boxes.forEach((b) => { b.checked = !!packed[b.dataset.pack] })
    $('#packCount').textContent = boxes.filter((b) => b.checked).length
    $$('.pack').forEach((p) => { const bs = [...p.querySelectorAll('[data-pack]')]; p.querySelector('[data-pc]').textContent = bs.filter((b) => b.checked).length + '/' + bs.length })
  }
  const savePack = () => { try { localStorage.setItem(PK, JSON.stringify(packed)) } catch (e) {} }
  boxes.forEach((b) => b.addEventListener('change', () => { packed[b.dataset.pack] = b.checked; savePack(); renderPack() }))
  $('#packReset').addEventListener('click', () => { packed = {}; savePack(); renderPack() })
  renderPack()

  // Water: 1 gal x 2 people x 7 days, plus Nala at about 1 oz per lb per day.
  const lbIn = $('#nalaLb')
  try { lbIn.value = localStorage.getItem('evergreen-nala-lb') || '' } catch (e) {}
  function renderWater() {
    const lb = Math.max(0, Math.min(150, Number(lbIn.value) || 0))
    const dog = lb * 7 / 128
    const total = 14 + dog
    const t1 = Math.round(total * 10) / 10
    $('#galTotal').textContent = t1
    $('#galSplit').textContent = lb ? '14 for us + ' + dog.toFixed(1) + ' for Nala' : '14 for us; add Nala\\u2019s weight for hers'
    let jugs = ''
    for (let i = 0; i < 14; i++) jugs += '<span class="jug"></span>'
    for (let left = dog; left > 0.01; left -= 1) jugs += '<span class="jug dog" style="--fill:' + Math.round(Math.min(1, left) * 100) + '%"></span>'
    $('#jugs').innerHTML = jugs
  }
  lbIn.addEventListener('input', () => { try { localStorage.setItem('evergreen-nala-lb', lbIn.value) } catch (e) {}; renderWater() })
  renderWater()
`

  return { html, css, js }
}

module.exports = { guides, GUIDE_SOURCES }
