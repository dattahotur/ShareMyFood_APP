const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const PORT = process.env.PORT || 5002;

const RECIPES_FILE = path.join(__dirname, 'recipes.json');

// Initialize recipes from file or defaults
let recipes = [];
try {
  if (fs.existsSync(RECIPES_FILE)) {
    recipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf8'));
  } else {
    recipes = [
      { id: 1, title: 'Assorted Pastries Box', description: 'Leftover pastries from today', price: 150, originalPrice: 450, restaurant: "Joe's Bakery", quantity: 3, availableUntil: '20:00', donorId: 'seed-donor-1', category: 'Bakery', donorVerified: true, address: "Joe's Bakery, 45 Baker Street, City Centre" },
      { id: 2, title: 'Fresh Salad Bowl', description: 'End of day salads', price: 80, originalPrice: 220, restaurant: 'Green Leaves', quantity: 5, availableUntil: '21:00', donorId: 'seed-donor-2', category: 'Meals', donorVerified: false, address: "Green Leaves Cafe, 12 Garden Boulevard, Green Park" }
    ];
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
  }
} catch (err) {
  console.error("Failed to load recipes:", err);
  recipes = [];
}

const saveRecipes = () => {
  try {
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
  } catch (err) {
    console.error("Failed to save recipes:", err);
  }
};

app.get('/health', (req, res) => res.json({ status: 'Recipe Service Alive' }));

app.get('/', (req, res) => {
  res.json(recipes);
});

app.get('/:id', (req, res) => {
  const recipe = recipes.find(r => String(r.id) === String(req.params.id));
  if (recipe) res.json(recipe);
  else res.status(404).json({ error: 'Recipe not found' });
});

app.put('/:id/decrement', (req, res) => {
  const quantity = req.body.quantity || 1;
  const recipe = recipes.find(r => String(r.id) === String(req.params.id));
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  
  if (recipe.quantity < quantity) {
    return res.status(400).json({ error: 'Not enough stock available' });
  }
  
  recipe.quantity -= quantity;
  saveRecipes();
  res.json({ message: 'Stock updated', recipe });
});

// Increment stock (used when a donor rejects an order)
app.put('/:id/increment', (req, res) => {
  const quantity = req.body.quantity || 1;
  const recipe = recipes.find(r => String(r.id) === String(req.params.id));
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  
  recipe.quantity += quantity;
  saveRecipes();
  res.json({ message: 'Stock restored', recipe });
});

app.post('/', (req, res) => {
  console.log('[RECIPE-SERVICE] Received listing request:', req.body);
  const { donorRole } = req.body;
  if (donorRole === 'ngo') {
    return res.status(403).json({ error: 'Unauthorized: NGOs cannot list food items.' });
  }

  const newRecipe = { 
    id: Date.now(), 
    ...req.body,
    allowedRoles: req.body.allowedRoles || ['user', 'ngo'] 
  };
  recipes.push(newRecipe);
  saveRecipes();
  console.log(`[RECIPE-SERVICE] New listing created: ID=${newRecipe.id}, Title="${newRecipe.title}", DonorRole=${newRecipe.donorRole}, AllowedRoles=${JSON.stringify(newRecipe.allowedRoles)}`);
  res.status(201).json({ message: 'Food item listed', recipe: newRecipe });
});

// Delete a listing (admin)
app.delete('/:id', (req, res) => {
  const idx = recipes.findIndex(r => String(r.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Listing not found' });
  recipes.splice(idx, 1);
  saveRecipes();
  res.json({ message: 'Listing removed' });
});

app.listen(PORT, () => console.log(`Recipe Service listening on port ${PORT}`));
