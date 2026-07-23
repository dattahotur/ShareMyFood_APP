const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Body Parser
app.use(express.json({ limit: '10mb' }));

// CORS configuration (matching the API Gateway exactly)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sharemyfood-a193h9az7-dattas-projects-41fd6ae5.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      origin.endsWith('.vercel.app');
      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// HTTP Request Logger
app.use(morgan('dev'));

// Mount routes under /api (matching the API Gateway paths)
app.use('/api/users', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'Monolithic Backend is running' }));

// Error Handler Middleware
app.use(errorHandler);

// Connect Database and Start Server
connectDB().then(() => {
  app.listen(env.PORT, () => {
    console.log(`[SERVER] Monolithic backend listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
  });
});
