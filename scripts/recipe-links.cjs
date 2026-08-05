// Replacement recipe links for library dishes the menu can't read.
//
// tommy-data.recipes belongs to the meal-planner project and this app never
// writes to it (see server/recipe-library.cjs). But a dish is only as useful as
// its link: /menu pulls a real ingredient list off the linked page to build the
// grocery list, and that fails for two kinds of dish —
//
//   * the library has no link at all, or
//   * it links somewhere this app can't read: a site that refuses server-side
//     requests (Serious Eats, Simply Recipes, The Spruce Eats and Maangchi all
//     answer 403), a page that publishes no schema.org Recipe metadata, or a
//     URL that has since gone dead.
//
// So the override lives here instead: dish _id -> a link that was checked to
// parse into a real ingredient list. Curated and in-repo on purpose, the same
// as scripts/meals-data.cjs — a link is a judgement call about which recipe the
// household actually wants, and it belongs in a diff, not in a database nobody
// reviews.
//
// Verify the whole map with `npm run check:links`, which re-fetches every URL
// and fails on any that stopped parsing. Replacing one is just editing its
// entry: any page with schema.org Recipe metadata works.
//
// `dead` lists the dish's original links that returned 404 when this map was
// built, so the menu can stop showing them. A link that merely refuses this
// app (403) is left off that list: it opens perfectly well in a browser, and
// it was somebody's pick — it keeps its place under the new one.

const RECIPE_LINKS = {
  // Kimchi Jjigae (week 2) — the linked site blocks server-side reads (403).
  '6a70f2a8ec268d4f241e9b9e': {
    dish: 'Kimchi Jjigae',
    label: 'Kimchi Jjigae Recipe - Authentic Korean Stew for Ultimate Comfort Food',
    url: 'https://mykoreankitchen.com/kimchi-jjigae/',
  },
  // Steak Frites (week 5) — the linked site blocks server-side reads (403).
  '6a70f2a9ec268d4f241e9ba6': {
    dish: 'Steak Frites',
    label: 'Steak au Poivre',
    url: 'https://www.onceuponachef.com/recipes/steak-au-poivre.html',
  },
  // Bánh Mì Night (week 11) — the linked page publishes no recipe metadata.
  '6a70f2a9ec268d4f241e9bb7': {
    dish: 'Bánh Mì Night',
    label: 'Bánh Mì Recipe - Vietnamese Sandwiches w/ Pork Belly',
    url: 'https://www.hungryhuy.com/banh-mi-recipe/',
  },
  // Lasagna with Spring Salad (week 12) — the linked site blocks server-side reads (403).
  '6a70f2a9ec268d4f241e9bb8': {
    dish: 'Lasagna with Spring Salad',
    label: 'Lasagna',
    url: 'https://www.recipetineats.com/lasagna/',
  },
  // Falafel Bowls (week 13) — the linked page publishes no recipe metadata.
  '6a70f2a9ec268d4f241e9bba': {
    dish: 'Falafel Bowls',
    label: 'How to Make Falafel',
    url: 'https://www.themediterraneandish.com/how-to-make-falafel/',
  },
  // Spring Vegetable Risotto (week 14) — the linked page publishes no recipe metadata.
  '6a70f2a9ec268d4f241e9bbd': {
    dish: 'Spring Vegetable Risotto',
    label: 'Spring Risotto with Asparagus & Peas',
    url: 'https://www.onceuponachef.com/recipes/spring-risotto-with-asparagus-peas.html',
    dead: [
      'https://www.loveandlemons.com/risotto-recipe/',
    ],
  },
  // Chicken Tinga Tacos (week 17) — the linked site blocks server-side reads (403).
  '6a70f2aaec268d4f241e9bc6': {
    dish: 'Chicken Tinga Tacos',
    label: 'Chicken Tinga',
    url: 'https://www.isabeleats.com/chicken-tinga/',
  },
  // Grilled Sausages with Pasta Salad (week 20) — the linked page publishes no recipe metadata.
  '6a70f2aaec268d4f241e9bd0': {
    dish: 'Grilled Sausages with Pasta Salad',
    label: 'Italian Pasta Salad with Homemade Italian Dressing',
    url: 'https://www.recipetineats.com/italian-pasta-salad/',
  },
  // Churrasco (Brazilian Grilled Steak) (week 21) — the linked site blocks server-side reads (403).
  '6a70f2aaec268d4f241e9bd1': {
    dish: 'Churrasco (Brazilian Grilled Steak)',
    label: 'Picanha Recipe | Brazilian Culotte Steaks',
    url: 'https://braziliankitchenabroad.com/picanha-brazilian-culotte-steaks/',
  },
  // Pasta Primavera (week 23) — the linked site blocks server-side reads (403).
  '6a70f2aaec268d4f241e9bd7': {
    dish: 'Pasta Primavera',
    label: 'Pasta Primavera',
    url: 'https://www.recipetineats.com/pasta-primavera/',
  },
  // Zucchini & Ricotta Galette (week 23) — the linked page publishes no recipe metadata.
  '6a70f2aaec268d4f241e9bd9': {
    dish: 'Zucchini & Ricotta Galette',
    label: 'Savory Galette with Summer Veggies and Za’atar',
    url: 'https://www.themediterraneandish.com/summer-savory-galette/',
  },
  // Smoked Ribs with Cornbread and Coleslaw (week 27) — the linked site blocks server-side reads (403).
  '6a70f2abec268d4f241e9be3': {
    dish: 'Smoked Ribs with Cornbread and Coleslaw',
    label: 'Oven Pork Ribs with Barbecue Sauce',
    url: 'https://www.recipetineats.com/oven-baked-barbecue-pork-ribs/',
    dead: [
      'https://www.kingarthurbaking.com/recipes/peach-cobbler-recipe',
    ],
  },
  // Eggplant Parmesan (week 28) — the linked page publishes no recipe metadata.
  '6a70f2abec268d4f241e9be6': {
    dish: 'Eggplant Parmesan',
    label: 'Eggplant Parmesan',
    url: 'https://www.onceuponachef.com/recipes/eggplant-parmesan.html',
  },
  // Fresh Tomato Pasta with Basil and Burrata (week 28) — the linked site blocks server-side reads (403).
  '6a70f2abec268d4f241e9be5': {
    dish: 'Fresh Tomato Pasta with Basil and Burrata',
    label: 'Fresh Tomato Basil Pasta with Ricotta',
    url: 'https://www.budgetbytes.com/fresh-tomato-basil-pasta-with-ricotta/',
    dead: [
      'https://www.gimmesomeoven.com/fresh-tomato-pasta/',
    ],
  },
  // Carne Asada Tacos (week 30) — the linked site blocks server-side reads (403).
  '6a70f2abec268d4f241e9beb': {
    dish: 'Carne Asada Tacos',
    label: 'Carne Asada Tacos',
    url: 'https://www.isabeleats.com/carne-asada-tacos/',
  },
  // Panang Curry (week 33) — the library has no link for this dish.
  '6a70f2abec268d4f241e9bf6': {
    dish: 'Panang Curry',
    label: 'Authentic Thai Panang Curry',
    url: 'https://hot-thai-kitchen.com/panang-curry/',
  },
  // Bibim Guksu (week 34) — the library has no link for this dish.
  '6a70f2abec268d4f241e9bf8': {
    dish: 'Bibim Guksu',
    label: 'Bibim Guksu (Spicy Cold Noodles)',
    url: 'https://www.koreanbapsang.com/bibim-guksu-korean-spicy-cold-noodles/',
  },
  // Dakgalbi (week 34) — the library has no link for this dish.
  '6a70f2acec268d4f241e9bf9': {
    dish: 'Dakgalbi',
    label: 'Dak Galbi (Korean Spicy Chicken Stir Fry)',
    url: 'https://mykoreankitchen.com/dak-galbi/',
  },
  // Korean BBQ Bulgogi (week 34) — the linked site blocks server-side reads (403).
  '6a70f2abec268d4f241e9bf7': {
    dish: 'Korean BBQ Bulgogi',
    label: 'Bulgogi (Korean BBQ Beef)',
    url: 'https://mykoreankitchen.com/bulgogi-korean-bbq-beef/',
  },
  // Red Beans & Rice (week 35) — the library has no link for this dish.
  '6a70f2acec268d4f241e9bfb': {
    dish: 'Red Beans & Rice',
    label: 'Louisiana Style Red Beans and Rice with Sausage',
    url: 'https://www.budgetbytes.com/louisiana-red-beans-rice/',
  },
  // Shrimp Étouffée (week 35) — the linked site blocks server-side reads (403).
  '6a70f2acec268d4f241e9bfa': {
    dish: 'Shrimp Étouffée',
    label: 'Cajun Shrimp Étouffée',
    url: 'https://www.littlespicejar.com/cajun-shrimp-etouffee/',
  },
  // Corn & Zucchini Skillet with Sausage (week 36) — the library has no link for this dish.
  '6a70f2acec268d4f241e9bfe': {
    dish: 'Corn & Zucchini Skillet with Sausage',
    label: 'Cajun Sausage and Summer Vegetable Skillet',
    url: 'https://www.thekitchn.com/sausage-corn-zucchini-skillet-recipe-23729824',
  },
  // Grilled Chicken Caesar (week 36) — the library has no link for this dish.
  '6a70f2acec268d4f241e9bfd': {
    dish: 'Grilled Chicken Caesar',
    label: 'Classic Caesar Salad Recipe',
    url: 'https://foolproofliving.com/classic-caesar-salad/',
  },
  // Tri-Tip with Chimichurri (week 36) — the linked site blocks server-side reads (403).
  '6a70f2acec268d4f241e9bfc': {
    dish: 'Tri-Tip with Chimichurri',
    label: 'Tri Tip Roast Recipe',
    url: 'https://www.daringgourmet.com/tri-tip-roast-recipe/',
  },
  // Bocadillos (week 37) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c01': {
    dish: 'Bocadillos',
    label: 'Serranito Bocadillo Recipe',
    url: 'https://spanishsabores.com/serranito-bocadillo-recipe-how-to-make-classic-spanish-sandwich/',
  },
  // Gazpacho + Tortilla Española (week 37) — the linked site blocks server-side reads (403).
  '6a70f2acec268d4f241e9bff': {
    dish: 'Gazpacho + Tortilla Española',
    label: 'Authentic Gazpacho Recipe',
    url: 'https://spanishsabores.com/recipe-gazpacho-andaluz/',
  },
  // Pisto with Fried Eggs (week 37) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c00': {
    dish: 'Pisto with Fried Eggs',
    label: 'Pisto (Spanish Vegetable Stew)',
    url: 'https://www.themediterraneandish.com/pisto-spanish-vegetable-stew/',
  },
  // Gomen with Injera (week 38) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c03': {
    dish: 'Gomen with Injera',
    label: 'Ethiopian Collard Greens and Chard',
    url: 'https://www.forksoverknives.com/recipes/vegan-sides/ethiopian-collard-greens/',
  },
  // Arroz con Pollo (week 39) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c05': {
    dish: 'Arroz con Pollo',
    label: 'Chicken rice {Arroz con pollo}',
    url: 'https://www.laylita.com/recipes/arroz-con-pollo/',
  },
  // Sauerbraten-Style Pot Roast (week 40) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c07': {
    dish: 'Sauerbraten-Style Pot Roast',
    label: 'Authentic Sauerbraten',
    url: 'https://www.daringgourmet.com/authentic-german-sauerbraten/',
  },
  // Chicken Provençal (week 41) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c09': {
    dish: 'Chicken Provençal',
    label: 'Chicken Provencal',
    url: 'https://www.themediterraneandish.com/chicken-provencal/',
  },
  // Croque Madame (week 41) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c0a': {
    dish: 'Croque Madame',
    label: 'Croque Madame',
    url: 'https://tastesbetterfromscratch.com/croque-madame/',
  },
  // French Onion Soup with Gruyère Toasts (week 41) — the linked site blocks server-side reads (403).
  '6a70f2acec268d4f241e9c08': {
    dish: 'French Onion Soup with Gruyère Toasts',
    label: 'Classic French Onion Soup',
    url: 'https://www.onceuponachef.com/recipes/french-onion-soup.html',
  },
  // Char Siu with Rice (week 42) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c0d': {
    dish: 'Char Siu with Rice',
    label: 'Char Siu (Chinese BBQ Pork)',
    url: 'https://thewoksoflife.com/chinese-bbq-pork-cha-siu/',
  },
  // Dan Dan Noodles (week 42) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c0c': {
    dish: 'Dan Dan Noodles',
    label: 'Dan Dan Noodles',
    url: 'https://thewoksoflife.com/dan-dan-noodles/',
  },
  // Enchiladas Verdes (week 43) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c0f': {
    dish: 'Enchiladas Verdes',
    label: 'Enchiladas Verdes',
    url: 'https://www.isabeleats.com/salsa-verde-chicken-enchiladas/',
  },
  // Pozole Rojo (week 43) — the linked site blocks server-side reads (403).
  '6a70f2acec268d4f241e9c0e': {
    dish: 'Pozole Rojo',
    label: 'Pozole Rojo',
    url: 'https://www.isabeleats.com/red-posole-recipe/',
  },
  // Chickpea & Squash Stew (week 44) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c11': {
    dish: 'Chickpea & Squash Stew',
    label: 'Tagine',
    url: 'https://theplantbasedschool.com/tagine/',
  },
  // Shiro Wat (week 45) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c13': {
    dish: 'Shiro Wat',
    label: 'Ethiopian Shiro Wat',
    url: 'https://urbanfarmie.com/shiro-wat/',
  },
  // Butternut Squash Soup (week 46) — the library has no link for this dish.
  '6a70f2acec268d4f241e9c15': {
    dish: 'Butternut Squash Soup',
    label: 'Butternut Squash Soup',
    url: 'https://www.onceuponachef.com/recipes/butternut-squash-soup.html',
  },
  // Thanksgiving Turkey Dinner (week 46) — the linked site blocks server-side reads (403).
  '6a70f2acec268d4f241e9c14': {
    dish: 'Thanksgiving Turkey Dinner',
    label: 'Dry Brine Turkey',
    url: 'https://www.onceuponachef.com/recipes/thanksgiving-turkey.html',
  },
  // Ginger Turkey Congee (week 47) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c18': {
    dish: 'Ginger Turkey Congee',
    label: 'Cháo Gà (Vietnamese Chicken Rice Porridge / Congee)',
    url: 'https://www.hungryhuy.com/chao-ga-vietnamese-porridge/',
  },
  // Turkey Bánh Mì (week 47) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c17': {
    dish: 'Turkey Bánh Mì',
    label: 'Chicken banh mi (Vietnamese sandwich)',
    url: 'https://www.recipetineats.com/chicken-banh-mi-vietnamese-sandwich/',
  },
  // Bigos (week 48) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c1a': {
    dish: 'Bigos',
    label: 'Bigos: Polish Hunter’s Stew with Game (Venison, Wild Boar) and Juniper Berries',
    url: 'https://www.polonist.com/bigos-polish-hunters-stew/',
  },
  // Brisket with Latkes (week 49) — the linked site blocks server-side reads (403).
  '6a70f2adec268d4f241e9c1b': {
    dish: 'Brisket with Latkes',
    label: 'Classic Braised Brisket with Onions',
    url: 'https://www.onceuponachef.com/recipes/onion-braised-beef-brisket.html',
    dead: [
      'https://www.onceuponachef.com/recipes/moms-brisket.html',
    ],
  },
  // Matzo Ball Soup (week 49) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c1c': {
    dish: 'Matzo Ball Soup',
    label: 'Matzo Ball Soup',
    url: 'https://www.onceuponachef.com/recipes/matzo-ball-soup.html',
  },
  // Feast of the Seven Fishes (week 50) — the linked site blocks server-side reads (403).
  '6a70f2adec268d4f241e9c1d': {
    dish: 'Feast of the Seven Fishes',
    label: 'Shrimp Scampi with Pasta',
    url: 'https://www.onceuponachef.com/recipes/shrimp-scampi.html',
  },
  // Linguine with Clams (week 50) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c1e': {
    dish: 'Linguine with Clams',
    label: 'Linguine with Clams',
    url: 'https://www.onceuponachef.com/recipes/linguini-with-clams.html',
  },
  // Sausage & Peppers (week 50) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c1f': {
    dish: 'Sausage & Peppers',
    label: 'Sausage and Peppers',
    url: 'https://www.wellplated.com/sausage-and-peppers/',
  },
  // Baked Ziti or Prime Rib Feast (week 51) — the linked site blocks server-side reads (403).
  '6a70f2adec268d4f241e9c20': {
    dish: 'Baked Ziti or Prime Rib Feast',
    label: 'Baked Ziti',
    url: 'https://www.recipetineats.com/baked-ziti/',
  },
  // Prime Rib Hash & Soup (week 51) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c21': {
    dish: 'Prime Rib Hash & Soup',
    label: 'Beef Standing Rib Roast (Prime Rib)',
    url: 'https://www.recipetineats.com/standing-rib-roast/',
  },
  // Oden (week 52) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c24': {
    dish: 'Oden',
    label: 'Oden (Japanese Fish Cake Stew)',
    url: 'https://www.justonecookbook.com/oden/',
  },
  // Toshikoshi Soba (week 52) — the library has no link for this dish.
  '6a70f2adec268d4f241e9c23': {
    dish: 'Toshikoshi Soba',
    label: 'Toshikoshi Soba (New Year\'s Eve Soba Noodle Soup)',
    url: 'https://www.justonecookbook.com/toshikoshi-soba/',
  },
}

// The override for a library dish, or undefined when its own links are fine.
function overrideFor(id) {
  return RECIPE_LINKS[String(id)]
}

module.exports = { RECIPE_LINKS, overrideFor }
