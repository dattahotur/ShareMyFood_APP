const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  userName: String,
  donorId: mongoose.Schema.Types.Mixed,
  recipeId: mongoose.Schema.Types.Mixed,
  quantity: Number,
  status: { type: String, default: 'pending' },
  claimerRole: { type: String, default: 'user' },
  reportReason: String,
  reportProof: String,
  reportProofImage: String,
  adminNote: String,
  driverId: mongoose.Schema.Types.Mixed,
  driverName: String,
  deliveryStatus: { type: String, enum: ['waiting', 'picked_up', 'delivered', 'cancelled'], default: 'waiting' },
  pickupAddress: String,
  dropoffAddress: String,
  dropoffPhone: String,
  foodReported: { type: Boolean, default: false },
  userRiderReported: { type: Boolean, default: false },
  donorRiderReported: { type: Boolean, default: false },
  riderRated: { type: Boolean, default: false },
  paymentMethod: { type: String, default: 'COD' },
  deliveryMethod: { type: String, enum: ['self-pickup', 'delivery-partner'], default: 'self-pickup' },
  timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
