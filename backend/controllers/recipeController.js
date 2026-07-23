const Recipe = require('../models/Recipe');
const User = require('../models/User');
const { getRecipeQuery, getUserQuery } = require('../utils/helpers');

const getRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find({}).limit(50).lean();
    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching recipes' });
  }
};

const getRecipeById = async (req, res) => {
  try {
    if (req.params.id === "favicon.ico") {
      return res.status(204).end();
    }

    const recipe = await Recipe.findOne(getRecipeQuery(req.params.id));
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json(recipe);
  } catch (err) {
    console.error("Error fetching recipe:", err);
    res.status(500).json({ error: "Server error fetching recipe" });
  }
};

const decrementStock = async (req, res) => {
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
};

const incrementStock = async (req, res) => {
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
};

const createListing = async (req, res) => {
  console.log('[RECIPE-SERVICE] Received listing request:', req.body);
  const { donorId, donorRole } = req.body;
  if (donorRole === 'ngo') {
    return res.status(403).json({ error: 'Unauthorized: NGOs cannot list food items.' });
  }

  // Verify donor status directly with local User model instead of making network fetch call!
  try {
    const user = await User.findOne(getUserQuery(donorId));
    if (!user || user.status === 'deleted') {
      return res.status(403).json({ error: 'Unauthorized: User account is deleted.' });
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
};

const deleteListing = async (req, res) => {
  try {
    const result = await Recipe.deleteOne(getRecipeQuery(req.params.id));
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Listing not found' });
    res.json({ message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error removing listing' });
  }
};

module.exports = {
  getRecipes,
  getRecipeById,
  decrementStock,
  incrementStock,
  createListing,
  deleteListing
};
