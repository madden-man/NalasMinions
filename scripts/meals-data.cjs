// The weekly menu catalog — the seed data for tommy-data.nalas-menu.
//
// The app reads its meals from MongoDB (src/storage.js -> GET /api/meals), so
// this file is not what /menu renders; it is the curated source the collection
// is seeded from. Edit a meal here and re-run `npm run seed:meals` to publish
// it. Kept as plain data (no imports) so the seeder and the unit tests can both
// use it, and so meals can be reviewed in a diff.
//
// Each meal: an id (the document _id), a name and description for the card, the
// grocery `ingredients` it needs, optional take-them-or-leave-them `options`
// (pizza toppings) the picker can toggle, and the cleaned-up cooking `steps`.
//
// `verified` marks a recipe that's been cooked from these exact steps and is
// known to work. A new meal starts unverified (the field can just be left off);
// flip it to true once it's been made and the steps hold up.
//
// `store` names where the ingredients come from, for the meals that are really
// one shop at one place — the Trader Joe's freezer run, the King Soopers pick-up.
// It shows as a chip on the meal's card so a week can be planned around a single
// trip, and it must be one of the five in server/stores.cjs: Trader Joe's, King
// Soopers, Costco, Safeway, or Whole Foods. The seeder refuses anything else.
//
// Optional, and deliberately absent from the meals below that are cooked from
// whatever is in the house: an unset store means "wherever you shop".

const MEALS = [
  {
    id: 'meal-pad-thai',
    name: 'Pad Thai',
    description: 'Chicken, bell peppers, and noodles in a peanut-sriracha sauce.',
    verified: true,
    // What goes on the grocery list, phrased the way you'd shop for it.
    ingredients: [
      '2 bell peppers (orange + red)',
      '2 chicken thighs',
      'Pad thai sauce',
      'Peanut butter',
      'Sriracha',
      '2 packs pad thai noodles',
    ],
    steps: [
      'Wash the orange and red bell peppers and cut them into small pieces.',
      'Rinse the 2 chicken thighs, pat them dry on paper towels, then cut them into small chunks on a plastic cutting board.',
      'Cook the bell peppers, then set them aside in a bowl.',
      'Cook the chicken, then add the sauce, the bell peppers, 2 tablespoons of peanut butter, and a splash of sriracha, and cook everything together.',
      'Boil the 2 packs of noodles in a small pot of water for 4 minutes.',
      'Mix the noodles with everything else and serve.',
    ],
  },
  {
    id: 'meal-kevins-chicken-potatoes',
    name: "Kevin's Chicken with Air-Fryer Potatoes & Rice",
    description: "Seasoned air-fryer potatoes and brown rice alongside Kevin's pre-cooked chicken.",
    verified: true,
    // Salt and water are assumed on hand, so they don't go on the list.
    ingredients: [
      'Brown rice',
      '4 potatoes',
      'Olive oil',
      'Turmeric',
      'Garlic powder',
      'Paprika',
      'Dried basil',
      "Kevin's chicken",
    ],
    steps: [
      'Start the brown rice: 1½ cups of rice in 3 cups of water; let it cook while everything else comes together.',
      'Peel the four potatoes (no need to wash them) and chop them into bite-size pieces.',
      'Toss the potatoes in a bowl with 2 spoonfuls of olive oil, ½ teaspoon of turmeric, 1 teaspoon of paprika, ¼ teaspoon of basil, and a sprinkle each of garlic powder and salt.',
      'Air-fry the potatoes at 400°F for 25 minutes, checking on them at 15.',
      "Heat up the Kevin's chicken in a pan.",
      'Serve the chicken and potatoes over the rice.',
    ],
  },
  {
    id: 'meal-flatbread-pizza',
    name: 'Flatbread Pizzas',
    description: 'Flatbread pizzas with sautéed onion and bell pepper, plus your pick of toppings.',
    verified: true,
    ingredients: [
      'Flatbread',
      'Pizza sauce',
      'Onion',
      'Bell pepper',
      'Olive oil',
    ],
    // Toppings the picker can toggle before adding to the grocery list.
    options: [
      'Mozzarella cheese',
      'Pepperoni',
      'Sausage',
    ],
    steps: [
      'Chop half an onion and a bell pepper into thumbnail-size pieces.',
      'Sauté them in a pan with olive oil over medium heat until soft.',
      'Top the flatbread with pizza sauce, mozzarella, the veggies, and pepperoni or sausage.',
      'Bake until the cheese is melted and the edges crisp.',
    ],
  },
  {
    id: 'meal-eggs-for-group',
    name: 'Eggs for Group',
    description: 'Cottage-cheese scrambled eggs for the whole group, with toasted bagels.',
    verified: true,
    // Salt and pepper are assumed on hand; garlic salt is its own buy.
    ingredients: [
      'Eggs',
      'Cottage cheese',
      'Butter',
      'Garlic salt',
      'Bagels',
    ],
    steps: [
      'Crack 8 eggs into a bowl with three scoops of cottage cheese, then whisk, crushing the cottage cheese as you go.',
      'Melt two tablespoons of butter in a pan.',
      'Pour the egg and cheese mixture in.',
      "Let it set between stirs — don't stir constantly.",
      'Season with salt, pepper, and garlic salt.',
      'Toast the bagels and serve alongside.',
    ],
  },
  {
    id: 'meal-costco-steak',
    name: 'Costco Steak with Mashed Potatoes & Broccoli',
    description: 'Thin Costco steak slices off the pan, with microwaved mashed potatoes and broccoli.',
    verified: true,
    ingredients: [
      'Costco steak (thin slices)',
      'Mashed potatoes',
      'Broccoli',
    ],
    steps: [
      "Microwave the mashed potatoes and the broccoli — if it's a lot of broccoli, sprinkle some water on it first.",
      "Lay the flat steak slices on a hot pan; they're very thin, so flip them after about a minute.",
      'Plate the steak with the potatoes and broccoli.',
    ],
  },
  {
    id: 'meal-turkey-sandwich',
    name: 'Grilled Turkey Sandwich',
    description: 'Pan-grilled turkey sandwich — mayo for Alison, Chick-fil-A sauce for Tommy.',
    verified: true,
    ingredients: [
      'Bread',
      'Sliced turkey',
      'Butter',
    ],
    // Condiments differ per person, so they're pick-your-own.
    options: [
      'Mayo',
      'Chick-fil-A sauce',
      'Cheese',
    ],
    steps: [
      'Heat a pan, then melt 1 tablespoon of butter on it until it coats the surface.',
      'Build the turkey sandwich without lettuce or tomato — mayo (Alison) or Chick-fil-A sauce (Tommy), and cheese if you like.',
      'Grill the sandwich on the pan, flipping it with a wood spatula.',
    ],
  },
  {
    id: 'meal-crockpot-mexican-chicken',
    name: 'Crockpot Mexican-Style Chicken',
    description: 'Salsa-braised chicken thighs slow-cooked with peppers and onion, then shredded.',
    verified: true,
    ingredients: [
      'Chicken thighs (4–8)',
      'Salsa (24 oz)',
      'Chicken broth',
      '2 bell peppers',
      'Onion',
    ],
    steps: [
      'Put the chicken thighs in the crockpot, cover them with the salsa, and pour in ½–1 cup of chicken broth.',
      'Slice the two bell peppers and the onion into strips and add them in.',
      'Cook in the crockpot for 3 hours.',
      'Pull a piece of chicken out on its own and check it reads 165°F.',
      'Shred the chicken with two forks or a mixer.',
    ],
  },
  {
    id: 'meal-mediterranean-burrito-bowls',
    name: 'Mediterranean Burrito Bowls',
    description: 'Oven-roasted shawarma chicken, chickpeas, and veggies over rice with hummus and feta.',
    verified: true,
    ingredients: [
      'Marinated chicken shawarma (TJ\'s marinated meats)',
      '1 onion (yellow or white)',
      '1 red pepper',
      '1 zucchini',
      '1 cucumber',
      'Pack of cherry tomatoes',
      '1 can chickpeas',
      'Rice',
      'Red pepper hummus',
      'Feta cheese crumbles',
    ],
    steps: [
      'Preheat the oven to 400°F.',
      "Lay the chicken shawarma out on a big oven pan so the pieces don't overlap (no need to cut yet).",
      'Drain the chickpeas and add them to the pan with the chicken, mixing a bit so the seasoning coats everything.',
      'Roast the chicken and chickpeas for 20–25 minutes, checking the chicken by cutting into the thickest piece to confirm it\'s cooked.',
      'Chop the red pepper, onion, and zucchini and roast them on their own pan for about 30 minutes.',
      'Cut up the cucumber and tomatoes to top the bowls with.',
      'Make the rice: rinse 2 cups of rice, add it with 4 cups of water to a pot, bring to a boil, then reduce to low and cover until done.',
      'Build bowls with rice, chicken, chickpeas, roasted veggies, cucumber, tomatoes, hummus, and feta.',
    ],
  },
  {
    id: 'meal-banana-bread',
    name: 'Banana Bread',
    description: 'Classic chocolate-chip banana bread.',
    verified: true,
    ingredients: [
      '1 stick butter',
      '1 cup sugar',
      '2 eggs',
      '¼ cup milk',
      'Vanilla extract',
      '2-3 bananas',
      '2 cups flour',
      '1 tsp baking soda',
      '½ tsp salt',
      'Cinnamon',
      '1 cup chocolate chips',
    ],
    steps: [
      'Preheat the oven to 350°F.',
      'Melt the stick of butter (a clear mug with a plate on top, 90 seconds in the microwave, works well).',
      'Whisk 1 cup of sugar into the melted butter until combined, and let it cool so it isn\'t hot.',
      'Add 2 eggs and mix well.',
      'Add ¼ cup milk and a splash of vanilla, and stir.',
      'Add the bananas and mash with the whisk until the clumps are small.',
      'Add 2 cups flour, 1 tsp baking soda, ½ tsp salt, and a dash of cinnamon, and mix until combined.',
      'Fold in 1 cup chocolate chips without overmixing.',
      'Oil a bread pan (including the sides), pour in the batter, and bake for 50 minutes.',
      'Check for doneness; if not done, bake in 5-minute increments until it is.',
    ],
  },
  {
    id: 'meal-eggs-on-toast',
    name: 'Eggs on Toast',
    description: 'Cottage-cheese scrambled eggs with buttered toast and everything-bagel spice.',
    verified: true,
    ingredients: [
      '4 eggs',
      'Cottage cheese',
      '½ stick butter',
      'Bread for toast',
      'Everything but the bagel spice',
    ],
    steps: [
      'Preheat the toaster/oven.',
      'Mix the 4 eggs with two scoops of cottage cheese in a bowl, pressing down on the curds and mixing for at least two minutes.',
      'Put the bread on to toast.',
      'Pour the egg mixture into a pan and scramble as needed.',
      'Butter the toast.',
      'Top the eggs (and toast, if you like) with everything but the bagel spice, and serve.',
    ],
  },
  {
    id: 'meal-chicken-and-potatoes',
    name: 'Chicken and Potatoes',
    description: 'Roasted bone-in chicken thighs and lemon-garlic potatoes.',
    verified: true,
    ingredients: [
      '6 bone-in, skin-on chicken thighs',
      'Olive oil',
      'Kosher salt',
      'Black pepper',
      'Paprika (smoked if you have it)',
      'Dried oregano or thyme',
      '2 lemons',
      '5–6 garlic cloves',
      '2½–3 lbs Yukon Gold or baby potatoes',
      'Dried rosemary or thyme',
    ],
    steps: [
      'Preheat the oven to 425°F.',
      'Mix olive oil, salt, pepper, paprika, oregano, and rosemary together.',
      'Halve the potatoes and toss with 2/5 of the mix, then spread them cut-side down on a large roasting or sheet pan.',
      'Pat the chicken thighs dry with a paper towel.',
      'Slice one lemon and scatter the slices around the pan; halve the other lemon and squeeze half of it into the remaining mix.',
      'Rub the remaining 3/5 of the mix all over the chicken and add the smashed garlic cloves to the pan.',
      'Roast uncovered for 40–50 minutes, until the chicken hits 165°F internally.',
      'Let rest 5–10 minutes before serving.',
    ],
  },
  {
    id: 'meal-chicken-mole-quesadillas',
    name: 'Chicken Mole Quesadillas',
    description: 'Sautéed peppers and onion with chicken mole and Mexican-style cheese, griddled between tortillas.',
    verified: true,
    ingredients: [
      '2 bell peppers',
      '½ onion',
      'Chicken mole',
      'Mexican-style shredded cheese',
      'Tortillas',
      'Oil',
    ],
    steps: [
      'Chop and dice the two bell peppers and half an onion into chunks.',
      'Sauté the peppers and onion.',
      'Heat the chicken mole in the microwave.',
      'Move the sautéed veggies into a bowl and wipe out the pan with a paper towel.',
      'Heat the pan back up on low with a bit of oil.',
      'On a tortilla, spread the chicken from the mole (leave the liquid behind), not too thick.',
      'Spread cheese all over — it\'s the glue that holds the quesadilla together.',
      'Spread the veggies on top of the cheese, then close it with a second tortilla.',
      'Cook on the pan like a grilled cheese, low to medium heat, flipping once the bottom is golden — it won\'t take long.',
    ],
  },

  // --- the easy ones ------------------------------------------------------
  //
  // Assembly rather than cooking: a freezer or deli item, a starch, and a
  // vegetable, mostly unattended. Each is one trip to one store, which is what
  // `store` is for.

  {
    id: 'meal-tj-orange-chicken',
    name: "Trader Joe's Orange Chicken",
    description: 'The frozen orange chicken crisped in the oven, with broccoli and jasmine rice.',
    verified: true,
    store: "Trader Joe's",
    ingredients: [
      'Trader Joe\'s Mandarin Orange Chicken (frozen)',
      '1 bag frozen broccoli florets',
      '2 packets frozen jasmine rice',
    ],
    steps: [
      'Heat the oven or air fryer to 400°F.',
      'Spread the frozen chicken out in a single layer and set the sauce packet aside — it goes on at the very end. Cook for 20 minutes, turning once, until the coating is genuinely crisp.',
      'While it cooks, microwave the rice packets (about 3 minutes) and steam the broccoli in its bag.',
      'Thaw the sauce packet under warm running water.',
      'Tip the crisped chicken into a bowl, off the heat, and toss it with the sauce there — saucing it in the hot pan is what turns the coating soggy.',
      'Serve over the rice with the broccoli alongside.',
    ],
  },
  {
    id: 'meal-tj-butter-chicken-dumplings',
    name: 'Butter Chicken & Soup Dumplings',
    description: "Trader Joe's butter chicken with basmati, with soup dumplings to start. Microwave only.",
    verified: true,
    store: "Trader Joe's",
    ingredients: [
      'Trader Joe\'s Butter Chicken with Basmati Rice (frozen)',
      'Trader Joe\'s Chicken Soup Dumplings (frozen)',
    ],
    steps: [
      'Slit the film on the butter chicken tray so it steams instead of bursting, then microwave it per the box — about 10 minutes.',
      'Put the dumplings in their tray with a splash of water and microwave about 2 minutes, until they are plump and hot through.',
      'Let the dumplings stand for a minute before eating. The soup inside is much hotter than the outside suggests.',
      'Eat the dumplings while the butter chicken finishes, then serve the rice and sauce straight from the tray.',
    ],
  },
  {
    id: 'meal-sausage-potatoes-broccoli',
    name: 'Smoked Apple Sausage with Mashed Potatoes & Broccoli',
    description: 'Browned smoked apple sausage over microwave mashed potatoes, with steamed broccoli.',
    verified: true,
    store: 'King Soopers',
    ingredients: [
      'Smoked apple chicken sausage',
      'Refrigerated mashed potatoes',
      '1 bag frozen broccoli florets',
    ],
    steps: [
      'Slice the sausage into coins on the diagonal. It is already fully cooked, so this is only about getting some colour on it.',
      'Brown the coins in a dry pan over medium heat for 4–5 minutes, turning once, until the edges caramelize.',
      'Microwave the mashed potatoes per the tub, stirring halfway through.',
      'Steam the broccoli in its bag, about 4 minutes.',
      'Plate the potatoes, pile the sausage on top, and put the broccoli alongside.',
    ],
  },
  {
    id: 'meal-alfredo-pasta-peas',
    name: 'Alfredo Pasta with Peas',
    description: 'Jarred alfredo, short pasta, and peas cooked in the same pot — chicken if you want it bigger.',
    verified: true,
    store: 'King Soopers',
    ingredients: [
      '1 lb short pasta (penne or shells)',
      '1 jar alfredo sauce',
      '1 bag frozen peas',
    ],
    // Turns it from a side into a dinner, but it works without.
    options: [
      'Rotisserie chicken',
      'Parmesan',
    ],
    steps: [
      'Boil the pasta in salted water per the box.',
      'Tip the frozen peas straight into the pasta water for the last 3 minutes — same pot, nothing extra to wash.',
      'Drain, but keep a mugful of the pasta water first.',
      'Off the heat, return the pasta and peas to the pot, pour in the alfredo, and stir, loosening it with a splash of the reserved water until it coats the pasta instead of clumping.',
      'Stir through pulled rotisserie chicken if you want it to be a full dinner, and finish with parmesan.',
    ],
  },
  {
    id: 'meal-rotisserie-chicken-sandwich',
    name: 'Rotisserie Chicken Sandwich',
    description: 'A rotisserie chicken pulled into sandwiches. No cooking at all.',
    verified: true,
    store: 'King Soopers',
    ingredients: [
      'Rotisserie chicken',
      'Sandwich rolls or sliced bread',
      'Mayo',
    ],
    options: [
      'Sliced cheese',
      'Lettuce',
      'Pickles',
      'Chick-fil-A sauce',
    ],
    steps: [
      'Pull the meat off the chicken while it is still warm — it comes away far more easily than it does cold.',
      'Toast the rolls if you like.',
      'Spread mayo (or Chick-fil-A sauce) on both cut sides.',
      'Pile the chicken on, add cheese, lettuce, and pickles to taste, and close it up.',
    ],
  },
  {
    id: 'meal-tomato-soup-grilled-cheese',
    name: 'Tomato Soup & Grilled Cheese',
    description: 'Tinned tomato soup and a pan-grilled cheese sandwich to dip in it.',
    verified: true,
    store: 'King Soopers',
    ingredients: [
      'Tomato soup',
      'Sliced bread',
      'Sliced cheddar or American cheese',
      'Butter',
    ],
    steps: [
      'Pour the soup into a pot over medium-low heat and let it warm through while you make the sandwiches, stirring now and then.',
      'Butter one side of each slice of bread — the buttered faces are the ones that touch the pan.',
      'Build the sandwiches with the cheese in the middle and the buttered sides facing out.',
      'Grill in a pan over medium-low for 3–4 minutes a side, pressing down lightly, until deep golden. Keep the heat low: it is what lets the middle melt before the outside burns.',
      'Cut on the diagonal and serve with the soup to dip into.',
    ],
  },
]

module.exports = { MEALS }
