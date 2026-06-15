const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
    }
  }));
}

app.get('/health', (req, res) => res.status(200).json({ status: 'API Gateway is running' }));

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
