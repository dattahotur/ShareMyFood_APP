const Order = require('../models/Order');
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const Delivery = require('../models/Delivery');
const { createNotification } = require('../services/notificationService');
const { checkUserStatus, checkDriverStatus } = require('../services/orderService');
const { isExpired, getUserQuery, getRecipeQuery } = require('../utils/helpers');

const getOrderDetail = async (req, res) => {
  try {
    const id = req.params.id.trim();
    console.log(`[ORDER-SERVICE] CRITICAL LOOKUP: "${id}"`);
    const order = await Order.findById(id);
    if (!order) {
      console.warn(`[ORDER-SERVICE] Order not found in DB: ${id}`);
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error(`[ORDER-SERVICE-ERROR] Lookup failure:`, error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resolveOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'resolved';
    await order.save();
    res.json({ message: 'Order resolved', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve order' });
  }
};

const reportRider = async (req, res) => {
  try {
    let { reporter } = req.body;
    if (!reporter) reporter = "user";

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    console.log("BEFORE CHECK:", {
      orderId: order._id,
      reporter,
      userRiderReported: order.userRiderReported,
      donorRiderReported: order.donorRiderReported
    });

    if (reporter === "user" && order.userRiderReported === true) {
      return res.status(409).json({ error: "User already submitted rider feedback" });
    }
    if (reporter === "donor" && order.donorRiderReported === true) {
      return res.status(409).json({ error: "Donor already submitted rider feedback" });
    }

    if (reporter === "donor") {
      order.donorRiderReported = true;
    } else {
      order.userRiderReported = true;
    }

    await order.save();
    res.json({ message: "Rider feedback completed", order });
  } catch (err) {
    res.status(500).json({ error: "Failed to update rider feedback" });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const uid = req.params.userId;
    const queryVal = isNaN(Number(uid)) ? uid : Number(uid);
    const orders = await Order.find({ userId: { $in: [uid, queryVal] } }).sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
};

const getDonorOrders = async (req, res) => {
  try {
    const did = req.params.donorId;
    const queryVal = isNaN(Number(did)) ? did : Number(did);
    const orders = await Order.find({ donorId: { $in: [did, queryVal] } }).sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donor orders' });
  }
};

const reportOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.foodReported = true;
    order.reportReason = req.body.reason || 'No reason provided';
    order.reportProof = req.body.proof || '';
    order.reportProofImage = req.body.proofImage || '';
    await order.save();

    // Increment donor report count directly in User collection
    try {
      const user = await User.findOne(getUserQuery(order.donorId));
      if (user) {
        user.reportCount = (user.reportCount || 0) + 1;
        await user.save();
        console.log("DONOR REPORT COUNT UPDATED LOCALLY");
      }
    } catch (err) {
      console.error("Failed to update donor report count locally:", err.message);
    }

    // Notify donor directly
    try {
      await createNotification({
        userId: order.donorId,
        message: `Your food item has been reported.`,
        type: 'FOOD_REPORTED',
        relatedId: order._id
      });
    } catch (err) {
      console.error("Failed to notify donor of report:", err.message);
    }

    res.json({ message: 'Food reported successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to report food' });
  }
};

const getAdminReported = async (req, res) => {
  try {
    const reports = await Order.find({ foodReported: true }).sort({ timestamp: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

const getAdminReports = async (req, res) => {
  try {
    const reports = await Order.find({ foodReported: true }).sort({ timestamp: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

const getAdminAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const total = await Order.countDocuments();
    const pending = await Order.countDocuments({ status: 'pending' });
    const approved = await Order.countDocuments({ status: 'approved' });
    const rejected = await Order.countDocuments({ status: 'rejected' });
    const reported = await Order.countDocuments({ status: 'reported' });
    const resolved = await Order.countDocuments({ status: 'resolved' });
    res.json({ total, pending, approved, rejected, reported, resolved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

const adminResolveOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'resolved';
    order.adminNote = req.body.note || '';
    await order.save();

    // Increment donor report count upon admin resolve directly
    if (order.donorId) {
      try {
        const user = await User.findOne(getUserQuery(order.donorId));
        if (user) {
          user.reportCount = (user.reportCount || 0) + 1;
          await user.save();
        }
      } catch (err) {
        console.error('Failed to update donor report count on resolve locally:', err.message);
      }
    }

    res.json({ message: 'Report resolved', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve report' });
  }
};

const getAvailableDeliveries = async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: 'approved', 
      deliveryMethod: 'delivery-partner',
      driverId: { $exists: false } 
    }).sort({ timestamp: -1 });

    const filteredOrders = [];
    for (const order of orders) {
      // Fetch recipe locally instead of HTTP request to recipe-service!
      const recipe = await Recipe.findOne(getRecipeQuery(order.recipeId));
      
      if (!recipe || isExpired(recipe.availableUntil)) {
        console.log(`[EXPIRY] Cancelling order ${order._id} - Recipe ${order.recipeId} expired or missing.`);
        order.status = 'cancelled';
        order.adminNote = 'Automated cancellation: Food item expired or removed.';
        await order.save();
        continue;
      }
      filteredOrders.push(order);
    }

    res.json(filteredOrders);
  } catch (error) {
    console.error('Failed to fetch available deliveries:', error.message);
    res.status(500).json({ error: 'Failed to fetch available deliveries' });
  }
};

const getDriverOrders = async (req, res) => {
  try {
    const did = req.params.driverId;
    const queryVal = isNaN(Number(did)) ? did : Number(did);
    const orders = await Order.find({ driverId: { $in: [did, queryVal] } }).sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver orders' });
  }
};

const acceptDelivery = async (req, res) => {
  try {
    const { driverId, driverName } = req.body;
    if (!driverId) return res.status(400).json({ error: 'driverId is required' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.driverId) return res.status(400).json({ error: 'Delivery already claimed by another partner' });

    order.driverId = driverId;
    order.driverName = driverName || 'Delivery Partner';
    order.deliveryStatus = 'waiting';
    await order.save();

    // Notify user directly
    try {
      await createNotification({
        userId: order.userId,
        message: `A delivery partner (${order.driverName}) has been assigned to your order.`,
        type: 'DELIVERY_ASSIGNED',
        relatedId: order._id
      });
    } catch (err) {
      console.error("Assign notification failed:", err.message);
    }

    res.json({ message: 'Delivery accepted successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept delivery', details: error.message });
  }
};

const statusUpdate = async (req, res) => {
  try {
    const { status, riderId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'rider-assigned') {
      order.driverId = riderId;
      order.deliveryStatus = 'waiting';
      
      try {
        await createNotification({
          userId: order.userId,
          message: `Rider ${riderId} has been assigned to your order!`,
          type: 'DELIVERY_ASSIGNED',
          relatedId: order._id
        });
      } catch (err) {
        console.error("Status assignment notification failed");
      }
    }

    await order.save();
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { status, driverId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const activeDriverId = driverId || order.driverId;
    if (activeDriverId) {
      try {
        await checkDriverStatus(activeDriverId);
      } catch (err) {
        if (err.message === 'DELETED') {
          return res.status(403).json({ error: 'Unauthorized: Driver account is deleted.' });
        }
      }
    }
    
    if (!order.driverId && driverId) {
      order.driverId = driverId;
    }

    if (order.driverId && driverId && String(order.driverId) !== String(driverId)) {
      console.warn(`[AUTH-MISMATCH] Order Driver: ${order.driverId}, Request Driver: ${driverId}`);
      return res.status(403).json({ error: "Unauthorized to update this delivery" });
    }

    order.deliveryStatus = status;
    if (status === 'delivered') {
      order.status = 'completed';
    }
    await order.save();

    // Notify donor and buyer directly
    try {
      console.log(`[ORDER-SERVICE] Sending notifications for status: ${status} to Donor: ${order.donorId}, Buyer: ${order.userId}`);
      if (status === 'picked_up') {
        createNotification({
          userId: order.userId,
          message: `🚚 Your food has been picked up by ${order.driverName || 'a delivery partner'} and is on the way!`,
          type: 'ORDER_PICKED_UP',
          relatedId: order._id
        }).catch(e => console.error("Failed to notify buyer:", e.message));

        createNotification({
          userId: order.donorId,
          message: `✅ The food for order #${String(order._id).slice(-6)} has been picked up from your location.`,
          type: 'DONATION_PICKED_UP',
          relatedId: order._id
        }).catch(e => console.error("Failed to notify donor:", e.message));
      } 
      else if (status === 'delivered') {
        createNotification({
          userId: order.userId,
          message: `✨ Your food has been delivered! Enjoy your meal.`,
          type: 'ORDER_DELIVERED',
          relatedId: order._id
        }).catch(e => console.error("Failed to notify buyer:", e.message));

        createNotification({
          userId: order.donorId,
          message: `🎉 Great news! The food you donated has been successfully delivered to the customer.`,
          type: 'DONATION_DELIVERED',
          relatedId: order._id
        }).catch(e => console.error("Failed to notify donor:", e.message));

        setTimeout(() => {
          createNotification({
            userId: order.userId,
            message: `⭐ How was your delivery? Please rate the rider and report any issues.`,
            type: 'RATE_RIDER',
            relatedId: order._id
          }).catch(e => {});

          createNotification({
            userId: order.donorId,
            message: `⭐ How was the pickup experience? Please rate the delivery partner.`,
            type: 'RATE_RIDER',
            relatedId: order._id
          }).catch(e => {});
        }, 2000);
      }
    } catch (err) {
      console.error("[ORDER-SERVICE-CRITICAL] Multi-party notification logic failed:", err.message);
    }

    res.json({ message: 'Delivery status updated', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
};

const dismissReport = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'approved';
    order.adminNote = req.body.note || 'Report dismissed by admin';
    await order.save();
    res.json({ message: 'Report dismissed', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss report' });
  }
};

const approveOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    try {
      await checkUserStatus(order.donorId);
    } catch (err) {
      if (err.message === 'DELETED') {
        return res.status(403).json({ error: 'Unauthorized: Account is deleted.' });
      }
    }

    if (order.status !== 'pending') return res.status(400).json({ error: 'Order is not pending' });
    
    order.status = 'approved';
    await order.save();

    // Trigger delivery locally by writing a Delivery document!
    if (order.deliveryMethod === 'delivery-partner') {
      try {
        const newDelivery = new Delivery({ 
          orderId: order._id, 
          donorId: order.donorId, 
          recipientId: order.userId, 
          pickupAddress: order.pickupAddress, 
          dropoffAddress: order.dropoffAddress, 
          userName: order.userName, 
          dropoffPhone: order.dropoffPhone 
        });
        await newDelivery.save();
        console.log(`[DELIVERY DISPATCHED LOCALLY] for Order ${order._id}`);
      } catch (err) {
        console.error("Failed to trigger delivery locally:", err.message);
      }
    }

    // Notify claimant directly
    try {
      await createNotification({
        userId: order.userId,
        message: `Your request for "${order.recipeId}" has been approved!`,
        type: 'ORDER_APPROVED',
        relatedId: order._id
      });
    } catch (err) {}

    res.json({ message: 'Order approved', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve order' });
  }
};

const rejectOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    try {
      await checkUserStatus(order.donorId);
    } catch (err) {
      if (err.message === 'DELETED') {
        return res.status(403).json({ error: 'Unauthorized: Account is deleted.' });
      }
    }

    if (order.status !== 'pending') return res.status(400).json({ error: 'Order is not pending' });
    
    order.status = 'rejected';
    await order.save();

    // Notify claimant directly
    try {
      await createNotification({
        userId: order.userId,
        message: `Your request for #${order.recipeId} was unfortunately declined.`,
        type: 'ORDER_REJECTED',
        relatedId: order._id
      });
    } catch (err) {}

    // Restore stock locally
    try {
      const recipe = await Recipe.findOne(getRecipeQuery(order.recipeId));
      if (recipe) {
        const currentQty = Number(recipe.quantity) || 0;
        recipe.quantity = currentQty + order.quantity;
        recipe.markModified('quantity');
        await recipe.save();
      }
    } catch (err) {
      console.error("Failed to restore stock locally:", err.message);
    }

    res.json({ message: 'Order rejected and stock restored', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject order' });
  }
};

const createOrder = async (req, res) => {
  try {
    const { userId, userName, donorId, recipeId, quantity, paymentMethod, claimerRole, deliveryMethod, deliveryAddress, deliveryPhone } = req.body;
    
    // Check donor and claimer status directly
    try {
      const user = await User.findOne(getUserQuery(userId));
      if (!user || user.status === 'deleted') {
        return res.status(403).json({ error: 'Unauthorized: Account has been deleted' });
      }

      const donor = await User.findOne(getUserQuery(donorId));
      if (donor && donor.status === 'deleted') {
        return res.status(403).json({ error: 'Unauthorized: Donor account has been deleted' });
      }

      if (user.role === 'restaurant') {
        return res.status(403).json({ error: 'Unauthorized: Business Partners cannot claim food donations.' });
      }
      
      if (user.role === 'ngo' && user.verificationStatus !== 'verified') {
        return res.status(403).json({ error: 'Verification Required: NGOs must be verified to claim food donations.' });
      }
    } catch (err) {
      console.error('User verification check failed locally:', err.message);
    }
    
    // Fetch recipe details and decrement stock locally
    let pickupAddress = '';
    try {
      const recipe = await Recipe.findOne(getRecipeQuery(recipeId));
      if (!recipe) {
        return res.status(400).json({ error: 'Failed to process order. Item missing.' });
      }
      pickupAddress = recipe.address || '';
      
      const currentQty = Number(recipe.quantity) || 0;
      if (currentQty < quantity) {
        return res.status(400).json({ error: 'Not enough stock available' });
      }
      recipe.quantity = currentQty - quantity;
      recipe.markModified('quantity');
      await recipe.save();
    } catch (err) {
      console.error("Failed to fetch recipe or decrement stock locally:", err.message);
      return res.status(400).json({ error: err.message || 'Failed to process order.' });
    }

    const newOrder = new Order({ 
      userId, 
      userName, 
      donorId, 
      recipeId, 
      quantity, 
      paymentMethod: paymentMethod || 'COD',
      deliveryMethod: deliveryMethod || 'self-pickup',
      claimerRole: req.body.claimerRole || 'user',
      pickupAddress,
      dropoffAddress: deliveryAddress || '',
      dropoffPhone: deliveryPhone || '',
      status: 'pending' 
    });
    await newOrder.save();

    // Send notification to donor directly
    try {
      await createNotification({
        userId: donorId,
        message: `New request received for your food item!`,
        type: 'ORDER_PLACED',
        relatedId: newOrder._id
      });
    } catch (err) {
      console.error("Failed to notify donor of new request locally:", err.message);
    }

    res.status(201).json({ message: 'Reservation request sent! Waiting for donor approval.', order: newOrder });
  } catch (error) {
    console.error('Order Creation Error:', error);
    res.status(500).json({ error: 'Failed to place order', details: error.message });
  }
};

module.exports = {
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
};
