const Notification = require('../models/Notification');
const { createNotification: localCreateNotification } = require('../services/notificationService');

const getUserNotifications = async (req, res) => {
  try {
    const userNotifications = await Notification.find({ userId: req.params.userId });
    res.json(userNotifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
};

const createNotification = async (req, res) => {
  const { userId, message, type, relatedId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const newNotif = await localCreateNotification({ userId, message, type, relatedId });
    res.status(201).json(newNotif);
  } catch (err) {
    res.status(500).json({ error: 'Server error creating notification' });
  }
};

const markNotificationsAsRead = async (req, res) => {
  const { type } = req.query;
  try {
    const query = { userId: req.params.userId };
    if (type) query.type = type;
    await Notification.updateMany(query, { isRead: true });
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error marking notifications as read' });
  }
};

module.exports = {
  getUserNotifications,
  createNotification,
  markNotificationsAsRead
};
