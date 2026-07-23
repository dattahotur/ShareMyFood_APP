const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { getUserQuery } = require('../utils/helpers');

const requestDelivery = async (req, res) => {
  try {
    const { orderId, donorId, recipientId, pickupAddress, dropoffAddress, userName, dropoffPhone } = req.body;
    const newDelivery = new Delivery({ 
      orderId, 
      donorId, 
      recipientId, 
      pickupAddress, 
      dropoffAddress, 
      userName, 
      dropoffPhone 
    });
    await newDelivery.save();
    
    console.log(`Delivery requested for Order ${orderId} with Pickup: ${pickupAddress}, Dropoff: ${dropoffAddress}`);
    res.status(201).json(newDelivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAvailableDeliveries = async (req, res) => {
  try {
    const pending = await Delivery.find({ status: 'searching' });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending deliveries' });
  }
};

const getActiveDelivery = async (req, res) => {
  console.log("ACTIVE ROUTE HIT:", req.params.riderId);
  try {
    const rider = await User.findOne(getUserQuery(req.params.riderId));
    if (rider && rider.status === 'deleted') {
      return res.status(403).json({ error: 'Unauthorized: Rider account has been deleted' });
    }

    const active = await Delivery.findOne({ 
      riderId: req.params.riderId, 
      status: { $in: ['waiting', 'picked_up'] } 
    });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const acceptDelivery = async (req, res) => {
  try {
    const driverId = req.body.driverId;
    if (driverId) {
      const rider = await User.findOne(getUserQuery(driverId));
      if (rider && rider.status === 'deleted') {
        return res.status(403).json({ error: 'Unauthorized: Rider account has been deleted' });
      }
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery request not found' });
    
    delivery.status = 'waiting';
    delivery.riderId = req.body.driverId || 'Rider_' + Math.floor(Math.random()*1000);
    await delivery.save();

    // Update corresponding Order
    const order = await Order.findById(delivery.orderId);
    if (order) {
      order.driverId = delivery.riderId;
      order.deliveryStatus = 'waiting';
      await order.save();

      // Notify claimant about rider assignment
      try {
        await createNotification({
          userId: order.userId,
          message: `Rider ${delivery.riderId} has been assigned to your order!`,
          type: 'DELIVERY_ASSIGNED',
          relatedId: order._id
        });
      } catch (err) {
        console.error("Assign notification failed locally");
      }
    }

    res.json({ message: 'Delivery accepted by rider', delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    delivery.status = status;
    await delivery.save();

    // Update corresponding Order & trigger multi-party notifications locally
    const order = await Order.findById(delivery.orderId);
    if (order) {
      order.deliveryStatus = status;
      if (status === 'delivered') {
        order.status = 'completed';
      }
      await order.save();

      try {
        console.log(`[DELIVERY-CONTROLLER] Local notifications for status: ${status} to Donor: ${order.donorId}, Buyer: ${order.userId}`);
        
        if (status === 'picked_up') {
          // Notify Buyer
          createNotification({
            userId: order.userId,
            message: `🚚 Your food has been picked up by ${order.driverName || 'a delivery partner'} and is on the way!`,
            type: 'ORDER_PICKED_UP',
            relatedId: order._id
          }).catch(e => console.error("Failed to notify buyer:", e.message));

          // Notify Donor
          createNotification({
            userId: order.donorId,
            message: `✅ The food for order #${String(order._id).slice(-6)} has been picked up from your location.`,
            type: 'DONATION_PICKED_UP',
            relatedId: order._id
          }).catch(e => console.error("Failed to notify donor:", e.message));
        } 
        else if (status === 'delivered') {
          // Notify Buyer
          createNotification({
            userId: order.userId,
            message: `✨ Your food has been delivered! Enjoy your meal.`,
            type: 'ORDER_DELIVERED',
            relatedId: order._id
          }).catch(e => console.error("Failed to notify buyer:", e.message));

          // Notify Donor
          createNotification({
            userId: order.donorId,
            message: `🎉 Great news! The food you donated has been successfully delivered to the customer.`,
            type: 'DONATION_DELIVERED',
            relatedId: order._id
          }).catch(e => console.error("Failed to notify donor:", e.message));

          // Rating/Issue Prompts after 2 seconds
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
        console.error("[DELIVERY-CONTROLLER-CRITICAL] Multi-party notification logic failed:", err.message);
      }
    }

    // Credit earnings directly (non-blocking)
    if (status === 'delivered') {
      try {
        const rider = await User.findOne(getUserQuery(delivery.riderId));
        if (rider) {
          rider.availableEarnings = (rider.availableEarnings || 0) + 45.00;
          await rider.save();
          console.log(`[EARNINGS] Credited ₹45 to Rider ${delivery.riderId} locally`);
        }
      } catch (err) {
        console.error('Failed to credit earnings locally:', err.message);
      }
    }

    return res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  requestDelivery,
  getAvailableDeliveries,
  getActiveDelivery,
  acceptDelivery,
  updateDeliveryStatus
};
