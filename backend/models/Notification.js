const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  userId: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'GENERAL' },
  relatedId: { type: mongoose.Schema.Types.Mixed, default: null },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
