const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5004;

// Mock database for notifications
let notifications = [];

app.get('/health', (req, res) => res.json({ status: 'Notification Service Alive' }));

// Get all notifications for a user
app.get('/:userId', (req, res) => {
  const userNotifications = notifications.filter(n => String(n.userId) === String(req.params.userId));
  res.json(userNotifications);
});

// Create a notification
app.post('/notify', (req, res) => {
  const { userId, message, type, relatedId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const newNotification = {
    id: Date.now(),
    userId,
    message: message || 'You have a new update',
    type: type || 'GENERAL',
    relatedId: relatedId || null,
    isRead: false,
    timestamp: new Date()
  };

  notifications.push(newNotification);
  console.log(`[[NOTIFICATION CREATED]] for User ${userId}: ${message}`);
  res.status(201).json(newNotification);
});

// Mark all as read for a user (optionally filter by type)
app.post('/:userId/read', (req, res) => {
  const { type } = req.query;
  notifications.forEach(n => {
    if (String(n.userId) === String(req.params.userId)) {
      if (!type || n.type === type) {
        n.isRead = true;
      }
    }
  });
  res.json({ message: 'Notifications marked as read' });
});

app.listen(PORT, () => console.log(`Notification Service listening on port ${PORT}`));
