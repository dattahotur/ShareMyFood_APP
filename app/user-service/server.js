const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Diagnostic Logging
app.use((req, res, next) => {
  console.log(`[USER-SERVICE] ${req.method} ${req.url}`);
  next();
});

// ULTIMATE SOLUTION: Completely unique path to avoid ANY routing conflict
app.post('/warn-rider-final', async (req, res) => {
  const { targetUserId, userId, donorId, reason, adminName, orderId } = req.body;
  const targetId = targetUserId || userId || donorId;
  console.log(`[[FINAL-WARN-ACTION]] User: ${targetId}, Order: ${orderId}`);
  
  const user = users.find(u => String(u.id) === String(targetId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  // 1. Add Warning
  if (!user.warnings) user.warnings = [];
  const warning = {
    id: Date.now(),
    reason: reason || "Violation of platform terms.",
    adminName: adminName || "System Admin",
    timestamp: new Date().toISOString(),
    isActive: true
  };
  user.warnings.push(warning);

  // 2. Resolve/Remove the report
  if (user.reports) {
    const cleanId = String(orderId || '').replace('#', '');
    user.reports = user.reports.filter(r => {
      const rCleanId = String(r.orderId || '').replace('#', '');
      return rCleanId !== cleanId;
    });
  }

  saveUsers();

  // 3. Notify
  try {
    const notifServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004';
    await fetch(`${notifServiceUrl}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        message: `FORMAL WARNING: ${warning.reason}`,
        type: 'WARNING',
        relatedId: warning.id
      })
    });
  } catch (err) {
    console.error('Notification error:', err.message);
  }

  res.json({ message: 'Success', warning });
});

const PORT = process.env.PORT || 5001;

const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users from file or defaults
let users = [];
try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } else {
    users = [
      { id: 99, name: "Admin", email: "admin@gmail.com", password: "admin", role: "admin", reportCount: 0, status: "active", verificationStatus: "verified", verificationDocs: [] },
      { id: 100, name: "City Shelter", email: "ngo@gmail.com", password: "ngo", role: "ngo", reportCount: 0, status: "active", verificationStatus: "verified", verificationDocs: [] }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }
} catch (err) {
  console.error("Failed to load users:", err);
  users = [];
}

const saveUsers = () => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Failed to save users:", err);
  }
};

// ULTRA-ROBUST: Submit a rating/report for a user (e.g. rider)
// Matches any POST ending in 'rider-feedback' or 'feedback'
app.post(/.*feedback$/, (req, res) => {
  console.log(`[USER-SERVICE-FEEDBACK] Handling feedback for URL: ${req.url}`);
  const { rating, feedback, isIssue, fromId, fromName, orderId, driverId } = req.body;
  
  // Try to find target ID in URL params, URL path segments, or body
  const pathSegments = req.url.split('/');
  const idFromPath = pathSegments.find(s => s && !isNaN(s) && s !== 'feedback' && s !== 'rider-feedback');
  const targetId = idFromPath || driverId || req.params.id;
  
  if (!targetId) {
    console.error(`[USER-SERVICE-FEEDBACK] No target ID found in URL: ${req.url} or body:`, req.body);
    return res.status(400).json({ error: 'User ID is required' });
  }

  const user = users.find(u => String(u.id) === String(targetId));
  if (!user) {
    console.error(`[USER-SERVICE-FEEDBACK] User ${targetId} not found`);
    return res.status(404).json({ error: 'User not found' });
  }

  const record = {
    rating: Number(rating) || 5,
    feedback: feedback || '',
    proofImage: req.body.proofImage || '',
    fromId,
    fromName: fromName || 'Anonymous',
    orderId,
    timestamp: new Date().toISOString()
  };

  if (isIssue) {
    if (!user.reports) user.reports = [];
    user.reports.push(record);
    user.reportCount = (user.reportCount || 0) + 1;
  } else {
    if (!user.ratings) user.ratings = [];
    user.ratings.push(record);
  }

  saveUsers();
  console.log(`[USER-SERVICE-FEEDBACK] Successfully saved feedback for user ${targetId}`);
  res.json({ message: 'Feedback submitted successfully' });
});

app.get('/health', (req, res) => res.json({ status: 'User Service Alive' }));

// Get all users
app.get('/', (req, res) => res.json(users.filter(u => u.status !== 'deleted')));

// Get all users (admin) — includes deleted
app.get('/admin/all', (req, res) => res.json(users));

// Get single user by id
app.get('/:id', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (user) return res.json(user);
  res.status(404).json({ error: 'User not found' });
});

app.post('/register', (req, res) => {
  const newUser = {
    id: users.length + 1,
    ...req.body,
    reportCount: 0,
    status: "active",
    verificationStatus: "none",
    verificationDocs: [],
    verificationAttempts: 0,
    isOnline: false,
    vehicleType: "",
    vehicleNumber: "",
    availableEarnings: 0,
    ratings: [],
    reports: [],
    warnings: []
  };
  users.push(newUser);
  saveUsers();
  res.status(201).json({ message: 'User registered', user: newUser });
});


// Toggle online/offline status
app.put('/:id/online-status', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.isOnline = req.body.isOnline;
  saveUsers();
  res.json({ message: 'Status updated', user });
});

// Update vehicle details
app.put('/:id/vehicle', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.vehicleType = req.body.vehicleType || user.vehicleType;
  user.vehicleNumber = req.body.vehicleNumber || user.vehicleNumber;
  saveUsers();
  res.json({ message: 'Vehicle updated', user });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.status !== 'deleted');
  if (user) {
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { password: pw, ...safeUser } = user;
    res.json({ message: 'Login successful', user: safeUser });
  } else {
    res.status(401).json({ error: 'Invalid credentials or account deleted' });
  }
});

// Admin: Clear all warnings for a user
app.post('/:id/clear-warnings', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.warnings = [];
  saveUsers();
  res.json({ message: 'All warnings cleared' });
});

// Increment report count for a user (called by order-service)
app.put('/:id/report', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.reportCount = (user.reportCount || 0) + 1;
  saveUsers();
  res.json({ message: 'Report count updated', user });
});

// Add earnings to user (called by delivery-service when delivery completed)
app.post('/:id/add-earnings', (req, res) => {
  const { amount } = req.body;
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.availableEarnings = (user.availableEarnings || 0) + Number(amount);
  saveUsers();
  res.json({ message: 'Earnings added', user });
});


// Admin: Get all reports/issues across all users
app.get('/admin/all-reports', (req, res) => {
  const allReports = [];
  users.forEach(u => {
    if (u.reports && u.reports.length > 0) {
      u.reports.forEach(r => {
        allReports.push({ ...r, targetUserId: u.id, targetUserName: u.name });
      });
    }
  });
  res.json(allReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

// Withdraw earnings endpoint (auto‑approved)
app.post('/:id/withdraw', (req, res) => {
  const { amount } = req.body;
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  const withdrawAmount = amount ? Number(amount) : (user.availableEarnings || 0);
  if (withdrawAmount > (user.availableEarnings || 0)) {
    return res.status(400).json({ error: 'Insufficient earnings' });
  }
  // Record withdrawal
  const withdrawalsFile = path.join(__dirname, 'withdrawals.json');
  let withdrawals = [];
  if (fs.existsSync(withdrawalsFile)) {
    withdrawals = JSON.parse(fs.readFileSync(withdrawalsFile, 'utf8'));
  }
  const record = { userId: user.id, amount: withdrawAmount, date: new Date().toISOString(), status: 'completed' };
  withdrawals.push(record);
  fs.writeFileSync(withdrawalsFile, JSON.stringify(withdrawals, null, 2));
  // Deduct earnings
  user.availableEarnings -= withdrawAmount;
  saveUsers();
  res.json({ message: 'Withdrawal successful', withdrawal: record });
});

// Get withdrawal history for a user
app.get('/:id/withdrawals', (req, res) => {
  const withdrawalsFile = path.join(__dirname, 'withdrawals.json');
  if (!fs.existsSync(withdrawalsFile)) return res.json([]);
  const withdrawals = JSON.parse(fs.readFileSync(withdrawalsFile, 'utf8'));
  const userWithdrawals = withdrawals.filter(w => String(w.userId) === String(req.params.id));
  res.json(userWithdrawals);
});

// Delete user account (admin only)
app.delete('/:id', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.status = 'deleted';
  saveUsers();
  res.json({ message: 'User account deleted', user });
});

// Restore user account (admin only)
app.put('/:id/restore', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.status = 'active';
  user.reportCount = 0;
  saveUsers();
  res.json({ message: 'User account restored', user });
});

// Get platform stats
app.get('/admin/stats', (req, res) => {
  const active = users.filter(u => u.status === 'active' && u.role !== 'admin');
  const deleted = users.filter(u => u.status === 'deleted');
  const restaurants = active.filter(u => u.role === 'restaurant');
  const regularUsers = active.filter(u => u.role === 'user');
  const ngos = active.filter(u => u.role === 'ngo');
  res.json({
    totalUsers: active.length,
    deletedUsers: deleted.length,
    restaurants: restaurants.length,
    regularUsers: regularUsers.length,
    ngos: ngos.length
  });
});

// Submit verification documents
app.post('/verify', (req, res) => {
  const { userId, documents } = req.body;
  const user = users.find(u => String(u.id) === String(userId));
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.verificationStatus = 'pending';
  user.verificationDocs = documents || []; // Array of { name, url: base64 }
  saveUsers();
  res.json({ message: 'Verification requested', user });
});

// Admin: Update verification status (Frontend expected endpoint)
app.put('/:id/verify', (req, res) => {
  const { verificationStatus } = req.body;
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.verificationStatus = verificationStatus;
  saveUsers();
  res.json({ message: `User verification ${verificationStatus}`, user });
});

// Admin: Get all verification requests
app.get('/admin/verifications', (req, res) => {
  const requests = users.filter(u => u.verificationStatus === 'pending');
  res.json(requests);
});

// Admin: Update verification status
app.put('/admin/verify/:id', (req, res) => {
  const { status } = req.body; // 'verified' or 'rejected'
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.verificationStatus = status;
  saveUsers(); // Added saveUsers()
  res.json({ message: `User verification ${status}`, user });
});

// Catch-all for debugging
app.use((req, res) => {
  console.log(`[USER-SERVICE-404] ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found in User Service' });
});

app.listen(PORT, () => console.log(`User Service listening on port ${PORT}`));
