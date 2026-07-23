const express = require('express');
const {
  warnRiderFinal,
  submitFeedback,
  getAllUsers,
  getAdminAllUsers,
  getUserById,
  updateOnlineStatus,
  updateVehicle,
  clearWarnings,
  reportUser,
  addEarnings,
  getAdminAllReports,
  withdrawEarnings,
  getWithdrawals,
  deleteUser,
  restrictUser,
  restoreUser,
  getAdminStats,
  requestVerification,
  verifyUser,
  getAdminVerifications,
  adminVerifyUser
} = require('../controllers/userController');

const router = express.Router();

// Specific routes first
router.post('/warn-rider-final', warnRiderFinal);
router.post('/verify', requestVerification);
router.get('/admin/all', getAdminAllUsers);
router.get('/admin/stats', getAdminStats);
router.get('/admin/all-reports', getAdminAllReports);
router.get('/admin/verifications', getAdminVerifications);
router.put('/admin/verify/:id', adminVerifyUser);

// Feedback routes supporting both paths
router.post('/feedback', submitFeedback);
router.post('/rider-feedback', submitFeedback);
router.post('/:id/feedback', submitFeedback);
router.post('/:id/rider-feedback', submitFeedback);

// General list
router.get('/', getAllUsers);

// Parameter routes
router.get('/:id', getUserById);
router.put('/:id/online-status', updateOnlineStatus);
router.put('/:id/vehicle', updateVehicle);
router.post('/:id/clear-warnings', clearWarnings);
router.put('/:id/report', reportUser);
router.post('/:id/add-earnings', addEarnings);
router.post('/:id/withdraw', withdrawEarnings);
router.get('/:id/withdrawals', getWithdrawals);
router.delete('/:id', deleteUser);
router.put('/:id/restrict', restrictUser);
router.put('/:id/restore', restoreUser);
router.put('/:id/verify', verifyUser);

module.exports = router;
