const express = require('express');
const {
  requestDelivery,
  getAvailableDeliveries,
  getActiveDelivery,
  acceptDelivery,
  updateDeliveryStatus
} = require('../controllers/deliveryController');

const router = express.Router();

router.post('/request', requestDelivery);
router.get('/available', getAvailableDeliveries);
router.get('/active/:riderId', getActiveDelivery);
router.post('/:id/accept-delivery', acceptDelivery);
router.put('/:id/status', updateDeliveryStatus);

module.exports = router;
