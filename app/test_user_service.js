const http = require('http');

const data = JSON.stringify({
  driverId: 4,
  rating: 5,
  feedback: "Test feedback from script",
  isIssue: false
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/rider-feedback',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log("Testing POST http://localhost:5001/rider-feedback...");

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
