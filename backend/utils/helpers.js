const mongoose = require('mongoose');

const getUserQuery = (idParam) => {
  if (typeof idParam === "number") {
    return { id: idParam };
  }

  const id = String(idParam);

  if (/^\d+$/.test(id)) {
    return { id: Number(id) };
  }

  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }

  return { id };
};

const getRecipeQuery = (idParam) => {
  if (typeof idParam === "number") {
    return { id: idParam };
  }
  const id = String(idParam);
  if (/^\d+$/.test(id)) {
    return { id: Number(id) };
  }
  if (mongoose.Types.ObjectId.isValid(id)) {
    const num = Number(id);
    if (!isNaN(num)) {
      return { $or: [{ _id: id }, { id: num }] };
    }
    return { _id: id };
  }
  return { id };
};

const isExpired = (availableUntil) => {
  if (!availableUntil) return false;
  
  const parts = availableUntil.split(':');
  if (parts.length !== 2) {
    const hour = parseInt(availableUntil);
    if (isNaN(hour)) return false;
    const now = new Date();
    return now.getHours() >= hour;
  }

  const [expiryHours, expiryMinutes] = parts.map(Number);
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (currentHours > expiryHours) return true;
  if (currentHours === expiryHours && currentMinutes >= expiryMinutes) return true;
  
  return false;
};

module.exports = {
  getUserQuery,
  getRecipeQuery,
  isExpired
};
