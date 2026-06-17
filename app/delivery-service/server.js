const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5005;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_delivery';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Delivery Service connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const deliverySchema = new mongoose.Schema({
  orderId: String,
  donorId: String,
  recipientId: String,
  userName: String,
  riderId: String,
  status: { type: String, enum: ['searching', 'waiting', 'picked_up', 'delivered'], default: 'searching' },
  pickupAddress: { type: String, default: 'Donor Location' },
  dropoffAddress: { type: String, default: 'Recipient Location' },
  dropoffPhone: String,
  timestamp: { type: Date, default: Date.now }
});

const Delivery = mongoose.model('Delivery', deliverySchema);

app.get('/health', (req, res) => res.json({ status: 'Delivery Service Alive' }));

// Endpoint for Order Service to request a delivery
app.post('/request', async (req, res) => {
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
});

// Endpoint for Riders to see available requests (expected by ibm2)
app.get('/available', async (req, res) => {
  try {
    const pending = await Delivery.find({ status: 'searching' });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending deliveries' });
  }
});

// Get active delivery for a rider
app.get('/active/:riderId', async (req, res) => {
  try {
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5001';
    try {
      const userRes = await axios.get(`${userServiceUrl}/${req.params.riderId}`);
      if (userRes.data && userRes.data.status === 'deleted') {
        return res.status(403).json({ error: 'Unauthorized: Rider account has been deleted' });
      }
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 404)) {
        return res.status(403).json({ error: 'Unauthorized: Rider account has been deleted' });
      }
    }

    const active = await Delivery.findOne({ 
      riderId: req.params.riderId, 
      status: { $in: ['waiting', 'picked_up'] } 
    });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for Rider to accept a request (expected by ibm2)
app.post('/:id/accept-delivery', async (req, res) => {
  try {
    const driverId = req.body.driverId;
    if (driverId) {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5001';
      try {
        const userRes = await axios.get(`${userServiceUrl}/${driverId}`);
        if (userRes.data && userRes.data.status === 'deleted') {
          return res.status(403).json({ error: 'Unauthorized: Rider account has been deleted' });
        }
      } catch (err) {
        if (err.response && (err.response.status === 403 || err.response.status === 404)) {
          return res.status(403).json({ error: 'Unauthorized: Rider account has been deleted' });
        }
      }
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery request not found' });
    
    delivery.status = 'waiting';
    delivery.riderId = req.body.driverId || 'Rider_' + Math.floor(Math.random()*1000);
    await delivery.save();

    // Notify Order Service
    try {
      const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://order-service:5003';
      await axios.post(`${orderServiceUrl}/${delivery.orderId}/status-update`, { 
        status: 'rider-assigned',
        riderId: delivery.riderId
      });
    } catch (err) {
      console.error('Failed to notify Order Service:', err.message);
    }

    res.json({ message: 'Delivery accepted by rider', delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update delivery status (newly integrated)
app.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    delivery.status = status;
    await delivery.save();

    // Notify Order Service
    try {
      const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://order-service:5003';
      await axios.put(`${orderServiceUrl}/${delivery.orderId}/delivery-status`, { 
        status: status,
        driverId: delivery.riderId
      });
    } catch (err) {
      console.error('Failed to update Order Service status:', err.message);
    }

    // 3. CREDIT EARNINGS if delivered (Non-blocking)
    if (status === 'delivered') {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:5001';
      axios.post(`${userServiceUrl}/${delivery.riderId}/add-earnings`, { 
        amount: 45.00 
      }).then(() => {
        console.log(`[EARNINGS] Credited ₹45 to Rider ${delivery.riderId}`);
      }).catch(err => {
        console.error('Failed to credit earnings (silently continuing):', err.message);
      });
    }

    return res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Delivery Service listening on port ${PORT}`));
