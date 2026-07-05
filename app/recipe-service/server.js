const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_recipes';
const RECIPES_FILE = path.join(__dirname, 'recipes.json');

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Recipe Service connected to MongoDB');
    seedRecipes();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Define Recipe Schema (Flexible to accommodate legacy mock data)
const recipeSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: mongoose.Schema.Types.Mixed, default: 0 },
  originalPrice: { type: mongoose.Schema.Types.Mixed, default: 0 },
  restaurant: { type: String, default: '' },
  quantity: { type: mongoose.Schema.Types.Mixed, default: 1 },
  availableUntil: { type: String, default: '' },
  donorId: { type: String, default: '' },
  category: { type: String, default: 'Meals' },
  donorVerified: { type: Boolean, default: false },
  address: { type: String, default: '' },
  allowedRoles: { type: [String], default: ['user', 'ngo'] }
}, { strict: false });
recipeSchema.index({ id: 1 });
recipeSchema.index({ donorId: 1 });

const Recipe = mongoose.model('Recipe', recipeSchema);

// Seed Initial Data
const seedRecipes = async () => {
  try {
    const count = await Recipe.countDocuments();
    if (count === 0) {
      console.log('Seeding recipes from JSON file...');
      let initialRecipes = [];
      if (fs.existsSync(RECIPES_FILE)) {
        initialRecipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf8'));
      } else {
        initialRecipes = [
          { id: 1, title: 'Assorted Pastries Box', description: 'Leftover pastries from today', price: 150, originalPrice: 450, restaurant: "Joe's Bakery", quantity: 3, availableUntil: '20:00', donorId: 'seed-donor-1', category: 'Bakery', donorVerified: true, address: "Joe's Bakery, 45 Baker Street, City Centre", allowedRoles: ['user', 'ngo'] },
          { id: 2, title: 'Fresh Salad Bowl', description: 'End of day salads', price: 80, originalPrice: 220, restaurant: 'Green Leaves', quantity: 5, availableUntil: '21:00', donorId: 'seed-donor-2', category: 'Meals', donorVerified: false, address: "Green Leaves Cafe, 12 Garden Boulevard, Green Park", allowedRoles: ['user', 'ngo'] }
        ];
      }
      await Recipe.insertMany(initialRecipes);
      console.log('Seeding completed successfully');
    }
  } catch (err) {
    console.error('Seeding recipes error:', err);
  }
};

app.get('/health', (req, res) => res.json({ status: 'Recipe Service Alive' }));

app.get('/', async (req, res) => {
  try {

    const recipes = await Recipe.find({})
      .limit(50)
      .lean();

    res.json(recipes);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error fetching recipes'
    });

  }
});

const getRecipeQuery = (idParam) => {
  if (mongoose.Types.ObjectId.isValid(idParam)) {
    const num = Number(idParam);
    if (!isNaN(num)) {
      return { $or: [{ _id: idParam }, { id: num }] };
    }
    return { _id: idParam };
  }
  const numericId = Number(idParam);
  if (!isNaN(numericId)) {
    return { id: numericId };
  }
  return { id: idParam };
};

app.get('/:id', async (req, res) => {
  try {

    // block browser favicon request
    if (req.params.id === "favicon.ico") {
      return res.status(204).end();
    }

    const recipe = await Recipe.findOne(
      getRecipeQuery(req.params.id)
    );

    if (!recipe) {
      return res.status(404).json({
        error: "Recipe not found"
      });
    }

    res.json(recipe);

  } catch (err) {

    console.error("Error fetching recipe:", err);

    res.status(500).json({
      error: "Server error fetching recipe"
    });

  }
});

app.put('/:id/decrement', async (req, res) => {
  try {
    const quantity = Number(req.body.quantity) || 1;
    const recipe = await Recipe.findOne(getRecipeQuery(req.params.id));
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    
    const currentQty = Number(recipe.quantity) || 0;
    if (currentQty < quantity) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }
    
    recipe.quantity = currentQty - quantity;
    recipe.markModified('quantity');
    await recipe.save();
    res.json({ message: 'Stock updated', recipe });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating stock' });
  }
});

app.put('/:id/increment', async (req, res) => {
  try {
    const quantity = Number(req.body.quantity) || 1;
    const recipe = await Recipe.findOne(getRecipeQuery(req.params.id));
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    
    const currentQty = Number(recipe.quantity) || 0;
    recipe.quantity = currentQty + quantity;
    recipe.markModified('quantity');
    await recipe.save();
    res.json({ message: 'Stock restored', recipe });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating stock' });
  }
});

app.post('/', async (req, res) => {
  console.log('[RECIPE-SERVICE] Received listing request:', req.body);
  const { donorId, donorRole } = req.body;
  if (donorRole === 'ngo') {
    return res.status(403).json({ error: 'Unauthorized: NGOs cannot list food items.' });
  }

  // Verify donor status with user-service
  const userServiceUrl = process.env.USER_SERVICE_URL || 'https://user-service-2fy7.onrender.com';
  try {
    const userRes = await fetch(`${userServiceUrl}/${donorId}`);
    if (userRes.status === 403 || userRes.status === 404) {
      return res.status(403).json({ error: 'Unauthorized: User account is deleted.' });
    }
    if (userRes.ok) {
      const userData = await userRes.json();
      if (userData.status === 'deleted') {
        return res.status(403).json({ error: 'Unauthorized: User account is deleted.' });
      }
    }
  } catch (err) {
    console.error('Failed to verify user status in recipe-service:', err.message);
  }

  try {
    const newRecipe = new Recipe({ 
      id: Date.now(), 
      ...req.body,
      allowedRoles: req.body.allowedRoles || ['user', 'ngo'] 
    });
    await newRecipe.save();
    console.log(`[RECIPE-SERVICE] New listing created: ID=${newRecipe.id}, Title="${newRecipe.title}"`);
    res.status(201).json({ message: 'Food item listed', recipe: newRecipe });
  } catch (err) {
    res.status(500).json({ error: 'Server error creating listing' });
  }
});

app.delete('/:id', async (req, res) => {
  try {
    const result = await Recipe.deleteOne(getRecipeQuery(req.params.id));
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Listing not found' });
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error removing listing' });
  }
});

app.listen(PORT, () => console.log(`Recipe Service listening on port ${PORT}`));
