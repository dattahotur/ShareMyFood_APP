const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: String,
  donorId: String,
  recipientId: String,
  userName: String,
  riderId: String,
  status: { type: String, enum: ['searching', 'waiting', 'picked_up', 'delivered'], default: 'searching' },
  pickupAddress: { type: String, default: 'Donor Location' },
  dropoffAddress: { type: String, default: 'Recipient Location' },
  dropoffPhone: String,
  timestamp: { type: Date, default: Date.now }
});

const Delivery = mongoose.model('Delivery', deliverySchema);

module.exports = Delivery;
