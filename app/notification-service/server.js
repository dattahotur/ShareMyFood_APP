const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5004;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_notifications';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Notification Service connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Notification Schema
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

app.get('/health', (req, res) => res.json({ status: 'Notification Service Alive' }));

// Get all notifications for a user
app.get('/:userId', async (req, res) => {
  try {
    const userNotifications = await Notification.find({ userId: req.params.userId });
    res.json(userNotifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

// Create a notification
app.post('/notify', async (req, res) => {
  const { userId, message, type, relatedId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const newNotification = new Notification({
      id: Date.now(),
      userId: String(userId),
      message: message || 'You have a new update',
      type: type || 'GENERAL',
      relatedId: relatedId || null,
      isRead: false,
      timestamp: new Date()
    });

    await newNotification.save();
    console.log(`[[NOTIFICATION CREATED]] for User ${userId}: ${message}`);
    res.status(201).json(newNotification);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Server error creating notification' });
  }
});

// Mark all as read for a user (optionally filter by type)
app.post('/:userId/read', async (req, res) => {
  const { type } = req.query;
  try {
    const query = { userId: req.params.userId };
    if (type) query.type = type;
    await Notification.updateMany(query, { isRead: true });
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error marking notifications as read' });
  }
});

app.listen(PORT, () => console.log(`Notification Service listening on port ${PORT}`));
