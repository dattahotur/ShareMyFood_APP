const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Recipe = require('../models/Recipe');

const USERS_FILE = path.join(__dirname, 'users.json');
const RECIPES_FILE = path.join(__dirname, 'recipes.json');

const seedData = async () => {
  try {
    // Seed Users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[SEED] Seeding users...');
      if (fs.existsSync(USERS_FILE)) {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        await User.insertMany(users);
        console.log('[SEED] Users seeded successfully.');
      } else {
        const fallbackUsers = [
          { id: 99, name: "Admin", email: "admin@gmail.com", password: "admin", role: "admin", reportCount: 0, status: "active", verificationStatus: "verified", verificationDocs: [] },
          { id: 100, name: "City Shelter", email: "ngo@gmail.com", password: "ngo", role: "ngo", reportCount: 0, status: "active", verificationStatus: "verified", verificationDocs: [] }
        ];
        await User.insertMany(fallbackUsers);
        console.log('[SEED] Fallback users seeded.');
      }
    }

    // Seed Recipes
    const recipeCount = await Recipe.countDocuments();
    if (recipeCount === 0) {
      console.log('[SEED] Seeding recipes...');
      if (fs.existsSync(RECIPES_FILE)) {
        const recipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf-8'));
        if (recipes.length > 0) {
          await Recipe.insertMany(recipes);
          console.log('[SEED] Recipes seeded successfully.');
        } else {
          console.log('[SEED] Recipe seed file is empty. Skipping.');
        }
      }
    }
  } catch (err) {
    console.error('[SEED] Seeding error:', err);
  }
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_database';
    await mongoose.connect(mongoUri);
    console.log('[DATABASE] MongoDB connected successfully to:', mongoUri);
    await seedData();
  } catch (err) {
    console.error('[DATABASE] Connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
