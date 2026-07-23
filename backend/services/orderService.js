const User = require('../models/User');
const axios = require('axios');

const checkUserStatus = async (userId) => {
  if (!userId) return;
  
  let query = { id: Number(userId) };
  if (isNaN(Number(userId)) && mongoose.Types.ObjectId.isValid(userId)) {
    query = { _id: userId };
  }
  
  const user = await User.findOne(query);
  if (user && user.status === 'deleted') {
    throw new Error('DELETED');
  }
};

const checkDriverStatus = async (driverId) => {
  if (!driverId) return;
  const driverServiceUrl = process.env.DELIVERY_USER_SERVICE_URL;
  if (!driverServiceUrl) {
    console.warn("[WARNING] DELIVERY_USER_SERVICE_URL is not set. Skipping driver status check.");
    return;
  }
  
  try {
    const res = await axios.get(`${driverServiceUrl}/${driverId}`);
    if (res.data && res.data.status === "deleted") {
      throw new Error("DELETED");
    }
  } catch (err) {
    if (err.message === "DELETED" || (err.response && (err.response.status === 403 || err.response.status === 404))) {
      throw new Error("DELETED");
    }
  }
};

module.exports = {
  checkUserStatus,
  checkDriverStatus
};
