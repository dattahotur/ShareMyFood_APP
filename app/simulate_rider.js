const http = require('http');

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
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function simulate() {
  console.log("--- STARTING RIDER SIMULATION ---");
  try {
    const pending = await get('http://localhost:5000/api/delivery/pending');
    if (!pending || pending.length === 0) {
      console.log("No pending deliveries found. Please Approve a 'delivery-partner' request in the UI.");
      return;
    }

    const delivery = pending[0];
    console.log(`Accepting Delivery: ${delivery._id}`);
    
    const result = await post(`http://localhost:5000/api/delivery/${delivery._id}/accept`, {
      riderId: "Rider_Alex"
    });
    
    console.log("SUCCESS:", result.message);
  } catch (err) {
    console.log("Error during simulation. Ensure the services are running.");
  }
}

simulate();
