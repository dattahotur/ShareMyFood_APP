const express = require('express');
const {
  getOrderDetail,
  resolveOrder,
  reportRider,
  getOrders,
  getUserOrders,
  getDonorOrders,
  reportOrder,
  getAdminReported,
  getAdminReports,
  getAdminAllOrders,
  getAdminStats,
  adminResolveOrder,
  getAvailableDeliveries,
  getDriverOrders,
  acceptDelivery,
  statusUpdate,
  updateDeliveryStatus,
  dismissReport,
  approveOrder,
  rejectOrder,
  createOrder
} = require('../controllers/orderController');

const router = express.Router();

// Specific routes first
router.get('/order-detail/:id', getOrderDetail);
router.get('/deliveries/available', getAvailableDeliveries);
router.get('/driver/:driverId', getDriverOrders);
router.get('/user/:userId', getUserOrders);
router.get('/donor/:donorId', getDonorOrders);

router.get('/admin/reported', getAdminReported);
router.get('/admin/reports', getAdminReports);
router.get('/admin/all', getAdminAllOrders);
router.get('/admin/stats', getAdminStats);

router.post('/:id/rider-report', reportRider);
router.post('/:id/report', reportOrder);
router.post('/:id/accept-delivery', acceptDelivery);
router.post('/:id/status-update', statusUpdate);
router.put('/:id/delivery-status', updateDeliveryStatus);
router.post('/:id/dismiss', dismissReport);
router.post('/:id/approve', approveOrder);
router.post('/:id/reject', rejectOrder);

// Resolve has both PUT and POST in order-service
router.put('/:id/resolve', resolveOrder);
router.post('/:id/resolve', adminResolveOrder);

// Base routes
router.get('/', getOrders);
router.post('/', createOrder);

module.exports = router;
