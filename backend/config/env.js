const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_database',
  DELIVERY_USER_SERVICE_URL: process.env.DELIVERY_USER_SERVICE_URL || 'https://deliver-user-service.onrender.com',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

module.exports = env;
