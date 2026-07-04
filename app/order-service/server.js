const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Global logger
app.use((req, res, next) => {
  console.log(`[ORDER-SERVICE-REQ] ${req.method} ${req.url}`);
  next();
});

// Get single order by ID (Internal/Detail) - MOVED TO TOP
app.get('/order-detail/:id', async (req, res) => {
  try {
    const id = req.params.id.trim();
    console.log(`[ORDER-SERVICE] CRITICAL LOOKUP: "${id}"`);
    
    // Use the most direct lookup possible
    const order = await Order.findById(id);
    
    if (!order) {
      console.warn(`[ORDER-SERVICE] Order not found in DB: ${id}`);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log(`[ORDER-SERVICE] Found: ${order._id}`);
    res.json(order);
  } catch (error) {
    console.error(`[ORDER-SERVICE-ERROR] Lookup failure:`, error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_orders';

const isExpired = (availableUntil) => {
  if (!availableUntil) return false;
  
  // Basic HH:mm parser (24h)
  const parts = availableUntil.split(':');
  if (parts.length !== 2) {
    // Fallback for simple hour numbers if they exist
    const hour = parseInt(availableUntil);
    if (isNaN(hour)) return false;
    const now = new Date();
    return now.getHours() >= hour;
  }

  const [expiryHours, expiryMinutes] = parts.map(Number);
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  if (currentHours > expiryHours) return true;
  if (currentHours === expiryHours && currentMinutes >= expiryMinutes) return true;
  
  return false;
};

mongoose.connect(MONGO_URI)
  .then(() => console.log('Order Service connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const orderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  userName: String,
  donorId: mongoose.Schema.Types.Mixed,
  recipeId: mongoose.Schema.Types.Mixed,
  quantity: Number,
  status: { type: String, default: 'pending' },
  claimerRole: { type: String, default: 'user' },
  reportReason: String,
  reportProof: String,
  reportProofImage: String,
  adminNote: String,
  driverId: mongoose.Schema.Types.Mixed,
  driverName: String,
  deliveryStatus: { type: String, enum: ['waiting', 'picked_up', 'delivered', 'cancelled'], default: 'waiting' },
  pickupAddress: String,
  dropoffAddress: String,
  dropoffPhone: String,
  // customer reports food
  foodReported: { 
    type: Boolean, 
    default: false 
  },

  // customer reports rider
  userRiderReported: { 
    type: Boolean, 
    default: false 
  },

  // donor reports rider
  donorRiderReported: { 
    type: Boolean, 
    default: false 
  },

  riderRated: { 
    type: Boolean, 
    default: false 
  },
  paymentMethod: { type: String, default: 'COD' },
  deliveryMethod: { type: String, enum: ['self-pickup', 'delivery-partner'], default: 'self-pickup' },
  timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

const checkUserStatus = async (userId) => {
  if (!userId) return;
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5001';
  try {
    const res = await axios.get(`${userServiceUrl}/${userId}`);
    if (res.data && res.data.status === 'deleted') {
      throw new Error('DELETED');
    }
  } catch (err) {
    if (err.message === 'DELETED' || (err.response && (err.response.status === 403 || err.response.status === 404))) {
      throw new Error('DELETED');
    }
  }
};
const checkDriverStatus = async (driverId) => {
  if (!driverId) return;

  const driverServiceUrl =
    process.env.DELIVERY_USER_SERVICE_URL;

  try {
    const res = await axios.get(`${driverServiceUrl}/${driverId}`);

    if (res.data && res.data.status === "deleted") {
      throw new Error("DELETED");
    }

  } catch (err) {

    if (
      err.message === "DELETED" ||
      (err.response &&
        (err.response.status === 403 ||
         err.response.status === 404))
    ) {
      throw new Error("DELETED");
    }
  }
};
app.get('/health', (req, res) => res.json({ status: 'Order Service Alive' }));

// Resolve a reported order
app.put('/:id/resolve', async (req, res) => {
  console.log(`[ORDER-SERVICE] Resolve requested for: ${req.params.id}`);
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'resolved';
    await order.save();
    res.json({ message: 'Order resolved', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve order' });
  }
});

// Mark rider feedback completed for an order
app.post('/:id/rider-report', async (req, res) => {
  try {

    const { reporter } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }


    console.log("BEFORE CHECK:", {
      orderId: order._id,
      reporter,
      userRiderReported: order.userRiderReported,
      donorRiderReported: order.donorRiderReported
    });


    if (reporter === "user" && order.userRiderReported === true) {

      console.log("BLOCKED USER DUPLICATE");

      return res.status(409).json({
        error: "User already submitted rider feedback"
      });
    }


    if (reporter === "donor" && order.donorRiderReported === true) {

      console.log("BLOCKED DONOR DUPLICATE");

      return res.status(409).json({
        error: "Donor already submitted rider feedback"
      });
    }


    if (reporter === "donor") {
      order.donorRiderReported = true;
    } else {
      order.userRiderReported = true;
    }


    await order.save();


    console.log("AFTER SAVE:", {
      userRiderReported: order.userRiderReported,
      donorRiderReported: order.donorRiderReported
    });


    res.json({
      message: "Rider feedback completed",
      order
    });


  } catch (err) {

    console.log(err);

    res.status(500).json({
      error:"Failed to update rider feedback"
    });

  }
});

// Get all orders
app.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get orders placed BY a specific user (claimant)
app.get('/user/:userId', async (req, res) => {
  try {
    const uid = req.params.userId;
    // Query both string and number versions to handle type mismatch
    const orders = await Order.find({ userId: { $in: [uid, parseInt(uid)] } }).sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Get orders FOR a specific donor (incoming requests)
app.get('/donor/:donorId', async (req, res) => {
  try {
    const did = req.params.donorId;
    const orders = await Order.find({ donorId: { $in: [did, parseInt(did)] } }).sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donor orders' });
  }
});

// Report food order
app.post('/:id/report', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found' 
      });
    }

    // only mark food report
    order.foodReported = true;

    // DON'T change completed status
    // order.status = 'reported';  ❌ remove

    order.reportReason = req.body.reason || 'No reason provided';
    order.reportProof = req.body.proof || '';
    order.reportProofImage = req.body.proofImage || '';

    await order.save();


    // update donor reports
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL;

      await axios.put(
        `${userServiceUrl}/${order.donorId}/report`
      );

      console.log("DONOR REPORT COUNT UPDATED");

    } catch (err) {
      console.error(
        "Failed donor report:",
        err.response?.data || err.message
      );
    }


    // notify donor
    try {

      const notificationServiceUrl =
        process.env.NOTIFICATION_SERVICE_URL 
        || 'http://notification-service:5004';

      axios.post(`${notificationServiceUrl}/notify`, {
        userId: order.donorId,
        message: `Your food item has been reported.`,
        type: 'FOOD_REPORTED',
        relatedId: order._id
      });

    } catch(err){}


    res.json({
      message:'Food reported successfully',
      order
    });


  } catch(error){

    res.status(500).json({
      error:'Failed to report food'
    });

  }
});

// ============ ADMIN ENDPOINTS ============

// Resolve a reported order
app.put('/:id/resolve', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'resolved';
    await order.save();
    res.json({ message: 'Order resolved', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve order' });
  }
});

// Get reported orders for admin
// Get reported food orders
app.get('/admin/reported', async (req, res) => {
  try {
    const reports = await Order.find({
      foodReported: true
    }).sort({
      timestamp: -1
    });

    res.json(reports);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch reports'
    });
  }
});


// Get all reported orders
app.get('/admin/reports', async (req, res) => {
  try {
    const reports = await Order.find({
      foodReported: true
    }).sort({
      timestamp: -1
    });

    res.json(reports);

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch reports'
    });
  }
});

// Get all orders (admin)
app.get('/admin/all', async (req, res) => {
  try {
    const orders = await Order.find().sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get admin stats
app.get('/admin/stats', async (req, res) => {
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
});

// Resolve a report (admin action)
app.post('/:id/resolve', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'resolved';
    order.adminNote = req.body.note || '';
    await order.save();

    // Increment donor report count upon admin resolve
    if (order.donorId) {
      try {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5001';
        await axios.put(`${userServiceUrl}/${order.donorId}/report`);
      } catch (err) {
        console.error('Failed to update donor report count on resolve:', err.message);
      }
    }

    res.json({ message: 'Report resolved', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// ============ DELIVERY PARTNER ENDPOINTS ============

// Get all available deliveries
app.get('/deliveries/available', async (req, res) => {
  try {
    const orders = await Order.find({ 
      status: 'approved', 
      deliveryMethod: 'delivery-partner',
      driverId: { $exists: false } 
    }).sort({ timestamp: -1 });

    // Filter by recipe expiry
    const recipeServiceUrl = process.env.RECIPE_SERVICE_URL || 'http://recipe-service:5002';
    const recipesRes = await axios.get(recipeServiceUrl);
    const recipes = recipesRes.data;

    const filteredOrders = [];
    for (const order of orders) {
      const recipe = recipes.find(r => String(r.id) === String(order.recipeId));
      
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
});

// Get orders assigned TO a specific driver
app.get('/driver/:driverId', async (req, res) => {
  try {
    const did = req.params.driverId;
    const orders = await Order.find({ 
      driverId: { $in: [did, parseInt(did)] }
    }).sort({ timestamp: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver orders' });
  }
});

// Accept a delivery
app.post('/:id/accept-delivery', async (req, res) => {
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

    // Notify user that a partner was assigned
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004';
      axios.post(`${notificationServiceUrl}/notify`, {
        userId: order.userId,
        message: `A delivery partner (${order.driverName}) has been assigned to your order.`,
        type: 'DELIVERY_ASSIGNED',
        relatedId: order._id
      }).catch(e => console.error("Notification failed:", e.message));
    } catch (err) {}

    res.json({ message: 'Delivery accepted successfully', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept delivery', details: error.message });
  }
});

// Update order status from external services (like Delivery Service)
app.post('/:id/status-update', async (req, res) => {
  try {
    const { status, riderId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'rider-assigned') {
      order.driverId = riderId;
      order.deliveryStatus = 'waiting';
      
      // Notify claimant about rider assignment
      try {
        const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004';
        axios.post(`${notificationServiceUrl}/notify`, {
          userId: order.userId,
          message: `Rider ${riderId} has been assigned to your order!`,
          type: 'DELIVERY_ASSIGNED',
          relatedId: order._id
        }).catch(e => console.error("Notification failed"));
      } catch (err) {}
    }

    await order.save();
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update delivery status manually (existing endpoint)
app.put('/:id/delivery-status', async (req, res) => {
  try {
    const { status, driverId } = req.body; // status: 'picked_up', 'delivered'
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
    
    // Assign driver if not already assigned
    if (!order.driverId && driverId) {
      order.driverId = driverId;
    }

    // Prevent different rider updating after assignment
    if (
      order.driverId &&
      driverId &&
      String(order.driverId) !== String(driverId)
    ) {
      console.warn(
        `[AUTH-MISMATCH] Order Driver: ${order.driverId}, Request Driver: ${driverId}`
      );

      return res.status(403).json({
        error: "Unauthorized to update this delivery"
      });
    }

    order.deliveryStatus = status;
    if (status === 'delivered') {
      order.status = 'completed'; // Sync main status
    }
    await order.save();

    // NOTIFY BOTH DONOR AND BUYER
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004';
      console.log(`[ORDER-SERVICE] Sending notifications for status: ${status} to Donor: ${order.donorId}, Buyer: ${order.userId}`);
      
      if (status === 'picked_up') {
        // Notify Buyer
        axios.post(`${notificationServiceUrl}/notify`, {
          userId: order.userId,
          message: `🚚 Your food has been picked up by ${order.driverName || 'a delivery partner'} and is on the way!`,
          type: 'ORDER_PICKED_UP',
          relatedId: order._id
        }).catch(e => console.error(`[NOTIFICATION-ERROR] Failed to notify buyer: ${e.message}`));

        // Notify Donor
        axios.post(`${notificationServiceUrl}/notify`, {
          userId: order.donorId,
          message: `✅ The food for order #${String(order._id).slice(-6)} has been picked up from your location.`,
          type: 'DONATION_PICKED_UP',
          relatedId: order._id
        }).catch(e => console.error(`[NOTIFICATION-ERROR] Failed to notify donor: ${e.message}`));
      } 
      else if (status === 'delivered') {
        // Notify Buyer
        axios.post(`${notificationServiceUrl}/notify`, {
          userId: order.userId,
          message: `✨ Your food has been delivered! Enjoy your meal.`,
          type: 'ORDER_DELIVERED',
          relatedId: order._id
        }).catch(e => console.error(`[NOTIFICATION-ERROR] Failed to notify buyer: ${e.message}`));

        // Notify Donor
        axios.post(`${notificationServiceUrl}/notify`, {
          userId: order.donorId,
          message: `🎉 Great news! The food you donated has been successfully delivered to the customer.`,
          type: 'DONATION_DELIVERED',
          relatedId: order._id
        }).catch(e => console.error(`[NOTIFICATION-ERROR] Failed to notify donor: ${e.message}`));

        // Rating/Issue Prompts
        setTimeout(() => {
          axios.post(`${notificationServiceUrl}/notify`, {
            userId: order.userId,
            message: `⭐ How was your delivery? Please rate the rider and report any issues.`,
            type: 'RATE_RIDER',
            relatedId: order._id
          }).catch(e => {});

          axios.post(`${notificationServiceUrl}/notify`, {
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
});

// Dismiss a report (admin sets it back to approved)
app.post('/:id/dismiss', async (req, res) => {
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
});

// Approve an order (donor accepts the request)
app.post('/:id/approve', async (req, res) => {
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

    // TRIGGER DELIVERY PARTNER APP if selected
    if (order.deliveryMethod === 'delivery-partner') {
      try {
        const deliveryServiceUrl = process.env.DELIVERY_SERVICE_URL || 'http://delivery-service:5005';
        axios.post(`${deliveryServiceUrl}/request`, {
          orderId: order._id,
          donorId: order.donorId,
          recipientId: order.userId,
          pickupAddress: order.pickupAddress,
          dropoffAddress: order.dropoffAddress,
          userName: order.userName,
          dropoffPhone: order.dropoffPhone
        }).catch(e => console.error("Delivery Service unreachable, but order approved."));
      } catch (err) {
        console.error("Failed to trigger delivery:", err.message);
      }
    }

    // Notify claimant
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004';
      axios.post(`${notificationServiceUrl}/notify`, {
        userId: order.userId,
        message: `Your request for "${order.recipeId}" has been approved!`,
        type: 'ORDER_APPROVED',
        relatedId: order._id
      }).catch(e => console.error("Notification failed:", e.message));
    } catch (err) {}

    res.json({ message: 'Order approved', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// Reject an order (donor declines, stock is restored)
app.post('/:id/reject', async (req, res) => {
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

    // Notify claimant
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004';
      axios.post(`${notificationServiceUrl}/notify`, {
        userId: order.userId,
        message: `Your request for #${order.recipeId} was unfortunately declined.`,
        type: 'ORDER_REJECTED',
        relatedId: order._id
      }).catch(e => console.error("Notification failed:", e.message));
    } catch (err) {}

    // Restore stock in recipe-service
    try {
      const recipeServiceUrl = process.env.RECIPE_SERVICE_URL || 'http://recipe-service:5002';
      await axios.put(`${recipeServiceUrl}/${order.recipeId}/increment`, { quantity: order.quantity });
    } catch (err) {
      console.error("Failed to restore stock:", err.response?.data || err.message);
    }

    res.json({ message: 'Order rejected and stock restored', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// Place a new order (status starts as 'pending' - awaiting donor approval)
app.post('/', async (req, res) => {
  try {
    const { userId, userName, donorId, recipeId, quantity, paymentMethod, claimerRole, deliveryMethod, deliveryAddress, deliveryPhone } = req.body;
    
    // STRICT ROLE & VERIFICATION CHECK
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5001';
      const userRes = await axios.get(`${userServiceUrl}/${userId}`);
      const userData = userRes.data;

      if (userData.status === 'deleted') {
        return res.status(403).json({ error: 'Unauthorized: Account has been deleted' });
      }

      const donorRes = await axios.get(`${userServiceUrl}/${donorId}`);
      if (donorRes.data && donorRes.data.status === 'deleted') {
        return res.status(403).json({ error: 'Unauthorized: Donor account has been deleted' });
      }

      if (userData.role === 'restaurant') {
        return res.status(403).json({ error: 'Unauthorized: Business Partners cannot claim food donations.' });
      }
      
      if (userData.role === 'ngo' && userData.verificationStatus !== 'verified') {
        return res.status(403).json({ error: 'Verification Required: NGOs must be verified to claim food donations.' });
      }
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 404)) {
        return res.status(403).json({ error: 'Unauthorized: Account is deleted or inactive' });
      }
      console.error('User verification check failed:', err.message);
      // If user-service is down, we fallback to a cautious approach
      if (claimerRole === 'restaurant') return res.status(403).json({ error: 'Unauthorized role.' });
    }
    
    // Fetch recipe details to get the pickup address
    let pickupAddress = '';
    try {
      const recipeServiceUrl = 'https://recipe-service-1g2k.onrender.com';
      const recipeRes = await axios.get(`${recipeServiceUrl}/${recipeId}`);
      pickupAddress = recipeRes.data.address || '';
      
      // Also decrement stock
      await axios.put(`${recipeServiceUrl}/${recipeId}/decrement`, { quantity });
    } catch (err) {
      console.error("Failed to fetch recipe or decrement stock:", err.response?.data || err.message);
      return res.status(400).json({ error: err.response?.data?.error || 'Failed to process order. Item might be sold out or missing.' });
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

    // Send notification to donor about new request
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004';
      axios.post(`${notificationServiceUrl}/notify`, {
        userId: donorId,
        message: `New request received for your food item!`,
        type: 'ORDER_PLACED',
        relatedId: newOrder._id
      }).catch(e => console.error("Notification Service not reachable"));
    } catch (err) {
      console.error(err);
    }

    res.status(201).json({ message: 'Reservation request sent! Waiting for donor approval.', order: newOrder });
  } catch (error) {
    console.error('Order Creation Error:', error);
    res.status(500).json({ 
      error: 'Failed to place order', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => console.log(`Order Service listening on port ${PORT}`));
