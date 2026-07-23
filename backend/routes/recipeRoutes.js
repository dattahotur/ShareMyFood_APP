const express = require('express');
const {
  getRecipes,
  getRecipeById,
  decrementStock,
  incrementStock,
  createListing,
  deleteListing
} = require('../controllers/recipeController');

const router = express.Router();

router.get('/', getRecipes);
router.post('/', createListing);
router.get('/:id', getRecipeById);
router.put('/:id/decrement', decrementStock);
router.put('/:id/increment', incrementStock);
router.delete('/:id', deleteListing);

module.exports = router;
