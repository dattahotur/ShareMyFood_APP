const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function sync() {
  console.log("--- SYNCING ORDERS ---");
  try {
    const orders = await get('http://localhost:5003/');
    const pending = orders.filter(o => o.status === 'approved' && o.deliveryMethod === 'delivery-partner' && !o.driverId);
    
    console.log(`Found ${pending.length} orders.`);
    for (const order of pending) {
      await post('http://localhost:5005/request', {
        orderId: order._id,
        donorId: order.donorId,
        recipientId: order.userId
      });
      console.log(`Migrated #${order._id}`);
    }
    console.log("DONE");
  } catch (err) {
    console.log("Error: " + err.message);
  }
}

sync();
