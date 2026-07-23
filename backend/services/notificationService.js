const Notification = require('../models/Notification');

const createNotification = async ({ userId, message, type, relatedId }) => {
  if (!userId) throw new Error('userId is required');
  try {
    const newNotification = new Notification({
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId: String(userId),
      message: message || 'You have a new update',
      type: type || 'GENERAL',
      relatedId: relatedId || null,
      isRead: false,
      timestamp: new Date()
    });
    await newNotification.save();
    console.log(`[[NOTIFICATION CREATED LOCALLY]] for User ${userId}: ${message}`);
    return newNotification;
  } catch (err) {
    console.error('Error creating notification locally:', err);
    throw err;
  }
};

module.exports = { createNotification };
