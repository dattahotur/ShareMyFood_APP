const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/foodwaste_orders';

const orderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  userName: String,
  donorId: mongoose.Schema.Types.Mixed,
  recipeId: mongoose.Schema.Types.Mixed,
  quantity: Number,
  status: String,
  driverId: mongoose.Schema.Types.Mixed,
  driverName: String,
  timestamp: Date
});

const Order = mongoose.model('Order', orderSchema);

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const targetId = '69f49be42622ed47640baac2';
    const found = await Order.findById(targetId);
    
    if (found) {
        console.log(`Order ${targetId} details:`);
        console.log(`- Status: ${found.status}`);
        console.log(`- Driver ID: ${found.driverId}`);
        console.log(`- Driver Name: ${found.driverName}`);
    } else {
        console.log('Order not found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
