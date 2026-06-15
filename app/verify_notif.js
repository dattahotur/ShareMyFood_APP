const http = require('http');

const postData = JSON.stringify({
  userId: '9',
  message: '[VERIFY] Background Polling Test',
  type: 'ORDER_PLACED',
  relatedId: 'verify_id_' + Date.now()
});

const options = {
  hostname: 'localhost',
  port: 5004,
  path: '/notify',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (e) => console.error(`problem with request: ${e.message}`));
req.write(postData);
req.end();
