const express = require('express');
const {
  getUserNotifications,
  createNotification,
  markNotificationsAsRead
} = require('../controllers/notificationController');

const router = express.Router();

router.post('/notify', createNotification);
router.get('/:userId', getUserNotifications);
router.post('/:userId/read', markNotificationsAsRead);

module.exports = router;
