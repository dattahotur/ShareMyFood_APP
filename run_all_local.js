const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVICES = [
  {
    name: 'user-service',
    dir: 'app/user-service',
    command: 'node',
    args: ['server.js'],
    env: {
      PORT: '5001',
    }
  },
  {
    name: 'recipe-service',
    dir: 'app/recipe-service',
    command: 'node',
    args: ['server.js'],
    env: {
      PORT: '5002',
      USER_SERVICE_URL: 'http://localhost:5001'
    }
  },
  {
    name: 'order-service',
    dir: 'app/order-service',
    command: 'node',
    args: ['server.js'],
    env: {
      PORT: '5003',
      MONGO_URI: 'mongodb://localhost:27017/foodwaste_orders',
      NOTIFICATION_SERVICE_URL: 'http://localhost:5004',
      RECIPE_SERVICE_URL: 'http://localhost:5002',
      USER_SERVICE_URL: 'http://localhost:5001',
      DELIVERY_SERVICE_URL: 'http://localhost:5005'
    }
  },
  {
    name: 'notification-service',
    dir: 'app/notification-service',
    command: 'node',
    args: ['server.js'],
    env: {
      PORT: '5004'
    }
  },
  {
    name: 'delivery-service',
    dir: 'app/delivery-service',
    command: 'node',
    args: ['server.js'],
    env: {
      PORT: '5005',
      MONGO_URI: 'mongodb://localhost:27017/foodwaste_delivery',
      ORDER_SERVICE_URL: 'http://localhost:5003',
      USER_SERVICE_URL: 'http://localhost:5010'
    }
  },
  {
    name: 'api-gateway',
    dir: 'app/api-gateway',
    command: 'node',
    args: ['server.js'],
    env: {
      PORT: '5000',
      USER_SERVICE_URL: 'http://localhost:5001',
      RECIPE_SERVICE_URL: 'http://localhost:5002',
      ORDER_SERVICE_URL: 'http://localhost:5003',
      NOTIFICATION_SERVICE_URL: 'http://localhost:5004',
      DELIVERY_SERVICE_URL: 'http://localhost:5005'
    }
  },
  {
    name: 'sharemyfood-frontend',
    dir: 'app/frontend',
    command: 'npm.cmd', // use npm.cmd on Windows
    args: ['run', 'dev'],
    env: {
      PORT: '5173'
    }
  },
  {
    name: 'delivery-partner-frontend',
    dir: '../DeliverMyFood',
    command: 'npm.cmd', // use npm.cmd on Windows
    args: ['run', 'dev'],
    env: {
      PORT: '5175'
    }
  },
  {
    name: 'delivery-partner-backend',
    dir: '../DeliverMyFood/server',
    command: 'node',
    args: ['user-service.js'],
    env: {
      PORT: '5010'
    }
  }
];

const children = [];

console.log('Starting all local microservices and frontends...');

const baseDir = __dirname;

// Create a logs directory
const logsDir = path.join(baseDir, 'local_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

SERVICES.forEach(service => {
  const serviceDir = path.resolve(baseDir, service.dir);
  const logStream = fs.createWriteStream(path.join(logsDir, `${service.name}.log`));

  console.log(`Launching ${service.name} in ${serviceDir}...`);

  const childEnv = { ...process.env, ...service.env };
  
  const child = spawn(service.command, service.args, {
    cwd: serviceDir,
    env: childEnv,
    shell: true
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.log(`[${service.name}] ${line}`);
    });
    logStream.write(data);
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.error(`[${service.name} ERROR] ${line}`);
    });
    logStream.write(data);
  });

  child.on('close', (code) => {
    console.log(`[${service.name}] Exited with code ${code}`);
    logStream.end();
  });

  children.push(child);
});

process.on('SIGINT', () => {
  console.log('Shutting down all services...');
  children.forEach(child => {
    child.kill('SIGINT');
  });
  process.exit();
});

process.on('exit', () => {
  children.forEach(child => {
    child.kill();
  });
});
