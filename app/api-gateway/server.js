const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use(morgan('dev'));

// Define proxy routes
const services = {
  '/api/users': process.env.USER_SERVICE_URL || 'http://user-service:5001',
  '/api/recipes': process.env.RECIPE_SERVICE_URL || 'http://recipe-service:5002',
  '/api/orders': process.env.ORDER_SERVICE_URL || 'http://order-service:5003',
  '/api/notifications': process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5004',
  '/api/delivery': process.env.DELIVERY_SERVICE_URL || 'http://delivery-service:5005'
};

// Setup proxies
for (const [route, target] of Object.entries(services)) {
  app.use(route, createProxyMiddleware({ 
    target, 
    changeOrigin: true,
    pathRewrite: {
      [`^${route}`]: '', 
    },
    onError: (err, req, res) => {
      console.error(`Error with proxy for ${route}:`, err.message);
      res.status(500).json({ error: 'Service Unavailable' });
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[PROXY] ${req.method} ${req.url} -> ${target}${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      delete proxyRes.headers['access-control-allow-origin'];
      delete proxyRes.headers['access-control-allow-credentials'];
      delete proxyRes.headers['access-control-allow-methods'];
      delete proxyRes.headers['access-control-allow-headers'];
    }
  }));
}

app.get('/health', (req, res) => res.status(200).json({ status: 'API Gateway is running' }));

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
