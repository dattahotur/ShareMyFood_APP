const mongoose = require('mongoose');

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

module.exports = Recipe;
