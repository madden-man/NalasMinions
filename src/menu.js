// The weekly meal menu.
//
// MEALS is the catalog of meals the household knows how to prep, each carrying
// the grocery ingredients it needs and the cleaned-up cooking steps shown on
// /menu. A meal may also carry `options` — take-them-or-leave-them extras
// (pizza toppings) the picker can toggle before adding. Picking a meal for the
// week drops its ingredients onto the /grocery list as one-off items (they're
// bought once for that week, unlike the renewing staples). Pure and
// framework-free so it can be unit-tested (test/menu.test.mjs), mirroring
// grocery.js.

// Extension included so Node's test runner can resolve it (Vite doesn't mind).
import { addOneOff } from './grocery.js'

export const MEALS = [
  {
    id: 'meal-pad-thai',
    name: 'Pad Thai',
    description: 'Chicken, bell peppers, and noodles in a peanut-sriracha sauce.',
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
]

// Put a meal's ingredients on the grocery list as one-off items, plus whichever
// of its optional extras were kept (all of them by default). Ingredients
// already on the list (matched case-insensitively, bought or not) are skipped,
// so picking the same meal twice — or two meals sharing an ingredient — never
// duplicates a line. Returns the same task reference when nothing was added,
// so callers can skip a needless save (same contract as renewGroceryItems).
export function addMealToGrocery(task, meal, now = new Date(), selectedOptions = meal.options || []) {
  const existing = new Set((task.oneOffs || []).map((i) => i.text.trim().toLowerCase()))
  let result = task
  let added = 0
  for (const ingredient of [...meal.ingredients, ...selectedOptions]) {
    if (existing.has(ingredient.trim().toLowerCase())) continue
    // Offset the timestamp so each item gets a distinct id even though they're
    // all added in one tick.
    result = addOneOff(result, ingredient, new Date(now.getTime() + added))
    added += 1
  }
  return result
}
