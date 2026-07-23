const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const { getUserQuery } = require('../utils/helpers');
const { createNotification } = require('../services/notificationService');

const warnRiderFinal = async (req, res) => {
  const { targetUserId, userId, donorId, reason, adminName, orderId } = req.body;
  const targetId = targetUserId || userId || donorId;
  console.log(`[[FINAL-WARN-ACTION]] User: ${targetId}, Order: ${orderId}`);
  
  try {
    const user = await User.findOne(getUserQuery(targetId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const warning = {
      id: Date.now(),
      reason: reason || "Violation of platform terms.",
      adminName: adminName || "System Admin",
      timestamp: new Date().toISOString(),
      isActive: true
    };
    user.warnings.push(warning);

    if (user.reports) {
      const cleanId = String(orderId || '').replace('#', '');
      user.reports = user.reports.filter(r => {
        const rCleanId = String(r.orderId || '').replace('#', '');
        return rCleanId !== cleanId;
      });
      user.reportCount = user.reports.length;
    }

    user.markModified('warnings');
    user.markModified('reports');
    await user.save();

    try {
      await createNotification({
        userId: user.id,
        message: `FORMAL WARNING: ${warning.reason}`,
        type: 'WARNING',
        relatedId: warning.id
      });
    } catch (err) {
      console.error('Notification error:', err.message);
    }

    res.json({ message: 'Success', warning });
  } catch (err) {
    res.status(500).json({ error: 'Server error resolving warning' });
  }
};

const submitFeedback = async (req, res) => {
  console.log(`[USER-SERVICE-FEEDBACK] Handling feedback for URL: ${req.originalUrl}`);
  const { rating, feedback, isIssue, fromId, fromName, orderId, driverId } = req.body;
  
  const pathSegments = req.originalUrl.split('/');
  const idFromPath = pathSegments.find(s => s && !isNaN(s) && s !== 'feedback' && s !== 'rider-feedback');
  const targetId = idFromPath || driverId || req.params.id;
  
  if (!targetId) {
    console.error(`[USER-SERVICE-FEEDBACK] No target ID found in URL: ${req.originalUrl}`);
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const user = await User.findOne(getUserQuery(targetId));
    if (!user) {
      console.error(`[USER-SERVICE-FEEDBACK] User ${targetId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    const record = {
      rating: Number(rating) || 5,
      feedback: feedback || '',
      proofImage: req.body.proofImage || '',
      fromId,
      fromName: fromName || 'Anonymous',
      orderId,
      timestamp: new Date().toISOString()
    };

    if (isIssue) {
      if (!user.reports) user.reports = [];
      user.reports.push(record);
      user.reportCount = (user.reportCount || 0) + 1;
      user.markModified('reports');
    } else {
      if (!user.ratings) user.ratings = [];
      user.ratings.push(record);
      user.markModified('ratings');
    }

    await user.save();
    console.log(`[USER-SERVICE-FEEDBACK] Successfully saved feedback for user ${targetId}`);
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error submitting feedback' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const activeUsers = await User.find({ status: { $ne: 'deleted' } });
    res.json(activeUsers.map(u => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching users' });
  }
};

const getAdminAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find({});
    res.json(allUsers.map(u => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status === 'restricted') {
      return res.status(403).json({ error: "Your account has been restricted. Contact admin." });
    }

    const obj = user.toObject();
    delete obj.password;
    delete obj.verificationDocs; // don't send huge base64 docs
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const updateOnlineStatus = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isOnline = req.body.isOnline;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Status updated', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating online status' });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.vehicleType = req.body.vehicleType || user.vehicleType;
    user.vehicleNumber = req.body.vehicleNumber || user.vehicleNumber;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Vehicle updated', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating vehicle' });
  }
};

const clearWarnings = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.warnings = [];
    user.markModified('warnings');
    await user.save();
    res.json({ message: 'All warnings cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const reportUser = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.reportCount = (user.reportCount || 0) + 1;
    await user.save();
    res.json({ message: 'Report count updated', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const addEarnings = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.availableEarnings = (user.availableEarnings || 0) + Number(amount);
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Earnings added', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAdminAllReports = async (req, res) => {
  try {
    const allUsers = await User.find({});
    const allReports = [];
    allUsers.forEach(u => {
      if (u.reports && u.reports.length > 0) {
        u.reports.forEach(r => {
          allReports.push({ ...r, targetUserId: u.id, targetUserName: u.name });
        });
      }
    });
    res.json(allReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const withdrawEarnings = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const withdrawAmount = amount ? Number(amount) : (user.availableEarnings || 0);
    if (withdrawAmount > (user.availableEarnings || 0)) {
      return res.status(400).json({ error: 'Insufficient earnings' });
    }

    const record = new Withdrawal({
      userId: user.id,
      amount: withdrawAmount,
      date: new Date().toISOString(),
      status: 'completed'
    });
    await record.save();

    user.availableEarnings -= withdrawAmount;
    await user.save();
    res.json({ message: 'Withdrawal successful', withdrawal: record });
  } catch (err) {
    res.status(500).json({ error: 'Server error during withdrawal' });
  }
};

const getWithdrawals = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    const withdrawals = await Withdrawal.find({ userId: user.id });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = 'deleted';
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.password = `deleted_${Date.now()}`;
    await user.save();

    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'User account deleted', user: obj });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};

const restrictUser = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = 'restricted';
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'User account restricted', user: obj });
  } catch (err) {
    console.error("Restrict user error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};

const restoreUser = async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = 'active';
    user.reportCount = 0;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'User account restored', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const active = await User.find({ status: 'active', role: { $ne: 'admin' } });
    const deleted = await User.find({ status: 'deleted' });
    const restaurants = active.filter(u => u.role === 'restaurant');
    const regularUsers = active.filter(u => u.role === 'user');
    const ngos = active.filter(u => u.role === 'ngo');
    res.json({
      totalUsers: active.length,
      deletedUsers: deleted.length,
      restaurants: restaurants.length,
      regularUsers: regularUsers.length,
      ngos: ngos.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const requestVerification = async (req, res) => {
  const { userId, documents } = req.body;
  try {
    const user = await User.findOne(getUserQuery(userId));
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'deleted') {
      return res.status(403).json({ error: 'Account has been deleted' });
    }

    user.verificationStatus = 'pending';
    user.verificationDocs = documents || [];
    user.markModified('verificationDocs');
    await user.save();
    
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Verification requested', user: obj });
  } catch (err) {
    console.error('Verification Error:', err);
    res.status(500).json({ error: err.message });
  }
};

const verifyUser = async (req, res) => {
  const { verificationStatus } = req.body;
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.verificationStatus = verificationStatus;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: `User verification ${verificationStatus}`, user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAdminVerifications = async (req, res) => {
  try {
    const requests = await User.find({ verificationStatus: 'pending' });
    res.json(requests.map(u => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const adminVerifyUser = async (req, res) => {
  const { status } = req.body; // 'verified' or 'rejected'
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.verificationStatus = status;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: `User verification ${status}`, user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
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
};
