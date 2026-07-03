const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_users';
const USERS_FILE = path.join(__dirname, 'users.json');

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('User Service connected to MongoDB');
    seedUsers();
    seedWithdrawals();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Define User Schema
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: 'active' },
  verificationStatus: { type: String, default: 'none' },
  verificationDocs: { type: [mongoose.Schema.Types.Mixed], default: [] },
  verificationAttempts: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  isOnline: { type: Boolean, default: false },
  vehicleType: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  availableEarnings: { type: Number, default: 0 },
  ratings: { type: [mongoose.Schema.Types.Mixed], default: [] },
  reports: { type: [mongoose.Schema.Types.Mixed], default: [] },
  warnings: { type: [mongoose.Schema.Types.Mixed], default: [] }
});

const User = mongoose.model('User', userSchema);

// Define Withdrawal Schema
const withdrawalSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'completed' }
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

// Seed users from JSON file or defaults
const seedUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('Seeding users from JSON file...');
      let initialUsers = [];
      if (fs.existsSync(USERS_FILE)) {
        initialUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      } else {
        initialUsers = [
          { id: 99, name: "Admin", email: "admin@gmail.com", password: "admin", role: "admin", reportCount: 0, status: "active", verificationStatus: "verified", verificationDocs: [] },
          { id: 100, name: "City Shelter", email: "ngo@gmail.com", password: "ngo", role: "ngo", reportCount: 0, status: "active", verificationStatus: "verified", verificationDocs: [] }
        ];
      }
      await User.insertMany(initialUsers);
      console.log('Seeding users completed successfully');
    }
  } catch (err) {
    console.error('Seeding users error:', err);
  }
};

// Seed withdrawals
const withdrawalsFile = path.join(__dirname, 'withdrawals.json');
const seedWithdrawals = async () => {
  try {
    const count = await Withdrawal.countDocuments();
    if (count === 0 && fs.existsSync(withdrawalsFile)) {
      console.log('Seeding withdrawals from JSON file...');
      const initialWithdrawals = JSON.parse(fs.readFileSync(withdrawalsFile, 'utf8'));
      await Withdrawal.insertMany(initialWithdrawals);
      console.log('Seeding withdrawals completed successfully');
    }
  } catch (err) {
    console.error('Seeding withdrawals error:', err);
  }
};

// Diagnostic Logging
app.use((req, res, next) => {
  console.log(`[USER-SERVICE] ${req.method} ${req.url}`);
  next();
});

const getUserQuery = (idParam) => {
  // If it's a number, search by numeric id only.
  if (typeof idParam === "number") {
    return { id: idParam };
  }

  // Convert to string.
  const id = String(idParam);

  // If it's purely numeric, search by id.
  if (/^\d+$/.test(id)) {
    return { id: Number(id) };
  }

  // Only if it's a valid MongoDB ObjectId, search by _id.
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }

  // Fallback.
  return { id };
};

// Submit a warning/report resolution
app.post('/warn-rider-final', async (req, res) => {
  const { targetUserId, userId, donorId, reason, adminName, orderId } = req.body;
  const targetId = targetUserId || userId || donorId;
  console.log(`[[FINAL-WARN-ACTION]] User: ${targetId}, Order: ${orderId}`);
  
  try {
    const user = await User.findOne(getUserQuery(targetId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Add Warning
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
      user.reportCount = user.reports.length;
    }

    user.markModified('warnings');
    user.markModified('reports');
    await user.save();

    // 3. Notify
    try {
      const notifServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service-t1t1.onrender.com';
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
  } catch (err) {
    res.status(500).json({ error: 'Server error resolving warning' });
  }
});

app.param('id', async (req, res, next, id) => {
  if (req.path.endsWith('/restore')) {
    return next();
  }
  try {
    const user = await User.findOne(getUserQuery(id));
    if (user && user.status === 'deleted') {
      return res.status(403).json({ error: 'Account has been deleted' });
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Submit feedback/issue
app.post(/.*feedback$/, async (req, res) => {
  console.log(`[USER-SERVICE-FEEDBACK] Handling feedback for URL: ${req.url}`);
  const { rating, feedback, isIssue, fromId, fromName, orderId, driverId } = req.body;
  
  const pathSegments = req.url.split('/');
  const idFromPath = pathSegments.find(s => s && !isNaN(s) && s !== 'feedback' && s !== 'rider-feedback');
  const targetId = idFromPath || driverId || req.params.id;
  
  if (!targetId) {
    console.error(`[USER-SERVICE-FEEDBACK] No target ID found in URL: ${req.url}`);
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const user = await User.findOne(getUserQuery(targetId));
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
      user.markModified('reports');
    } else {
      if (!user.ratings) user.ratings = [];
      user.ratings.push(record);
      user.markModified('ratings');
    }

    await user.save();
    console.log(`[USER-SERVICE-FEEDBACK] Successfully saved feedback for user ${targetId}`);
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error submitting feedback' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'User Service Alive' }));

app.get('/', async (req, res) => {
  try {
    const activeUsers = await User.find({ status: { $ne: 'deleted' } });
    res.json(activeUsers.map(u => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

app.get('/admin/all', async (req, res) => {
  try {
    const allUsers = await User.find({});
    res.json(allUsers.map(u => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/:id', async (req,res)=>{
  try {

    const user = await User.findOne(getUserQuery(req.params.id));

    if(!user){
      return res.status(404).json({
        error:"User not found"
      });
    }

    const obj = user.toObject();

    delete obj.password;

    // don't send huge base64 docs
    delete obj.verificationDocs;

    res.json(obj);


  }catch(err){

    res.status(500).json({
      error:"Server error"
    });

  }
});

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        error: "Email already exists"
      });
    }

    let hashedPassword = password;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newUser = new User({
      id: Date.now(),
      ...req.body,
      password: hashedPassword,
      status: "active",
      verificationStatus: "none",
      verificationDocs: []
    });

    await newUser.save();

    const obj = newUser.toObject();
    delete obj.password;

    res.status(201).json({
      message: "User registered successfully",
      user: obj
    });

  } catch (err) {
    console.error("Register error:", err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

app.put('/:id/online-status', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isOnline = req.body.isOnline;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Status updated', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating online status' });
  }
});

app.put('/:id/vehicle', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.vehicleType = req.body.vehicleType || user.vehicleType;
    user.vehicleNumber = req.body.vehicleNumber || user.vehicleNumber;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Vehicle updated', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating vehicle' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, status: { $ne: 'deleted' } });
    if (user) {
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (err) {}
      if (!isMatch) {
        isMatch = (password === user.password);
      }
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const obj = user.toObject();
      delete obj.password;
      res.json({ message: 'Login successful', user: obj });
    } else {
      res.status(401).json({ error: 'Invalid credentials or account deleted' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/:id/clear-warnings', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.warnings = [];
    user.markModified('warnings');
    await user.save();
    res.json({ message: 'All warnings cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/:id/report', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.reportCount = (user.reportCount || 0) + 1;
    await user.save();
    res.json({ message: 'Report count updated', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/:id/add-earnings', async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.availableEarnings = (user.availableEarnings || 0) + Number(amount);
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Earnings added', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/all-reports', async (req, res) => {
  try {
    const allUsers = await User.find({});
    const allReports = [];
    allUsers.forEach(u => {
      if (u.reports && u.reports.length > 0) {
        u.reports.forEach(r => {
          allReports.push({ ...r, targetUserId: u.id, targetUserName: u.name });
        });
      }
    });
    res.json(allReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/:id/withdraw', async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    const withdrawAmount = amount ? Number(amount) : (user.availableEarnings || 0);
    if (withdrawAmount > (user.availableEarnings || 0)) {
      return res.status(400).json({ error: 'Insufficient earnings' });
    }

    const record = new Withdrawal({
      userId: user.id,
      amount: withdrawAmount,
      date: new Date().toISOString(),
      status: 'completed'
    });
    await record.save();

    user.availableEarnings -= withdrawAmount;
    await user.save();
    res.json({ message: 'Withdrawal successful', withdrawal: record });
  } catch (err) {
    res.status(500).json({ error: 'Server error during withdrawal' });
  }
});

app.get('/:id/withdrawals', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    const withdrawals = await Withdrawal.find({ userId: user.id });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/:id', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Soft delete account
    user.status = 'deleted';

    // Release email so user can register again
    user.email = `deleted_${Date.now()}_${user.email}`;

    // Disable old password login
    user.password = `deleted_${Date.now()}`;

    await user.save();

    const obj = user.toObject();
    delete obj.password;

    res.json({
      message: 'User account deleted',
      user: obj
    });

  } catch (err) {
    console.error("Delete user error:", err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

app.put('/:id/restore', async (req, res) => {
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = 'active';
    user.reportCount = 0;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'User account restored', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/stats', async (req, res) => {
  try {
    const active = await User.find({ status: 'active', role: { $ne: 'admin' } });
    const deleted = await User.find({ status: 'deleted' });
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
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

  app.post('/verify', async (req, res) => {
    const { userId, documents } = req.body;
    try {
      const user = await User.findOne(getUserQuery(userId));
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.status === 'deleted') {
        return res.status(403).json({ error: 'Account has been deleted' });
      }

      user.verificationStatus = 'pending';
      user.verificationDocs = documents || [];
      user.markModified('verificationDocs');
      await user.save();
      const obj = user.toObject();
      delete obj.password;
      res.json({ message: 'Verification requested', user: obj });
    } catch (err) {
  console.error('Verification Error:', err);
  res.status(500).json({
    error: err.message
  });
}
  });

app.put('/:id/verify', async (req, res) => {
  const { verificationStatus } = req.body;
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.verificationStatus = verificationStatus;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: `User verification ${verificationStatus}`, user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/verifications', async (req, res) => {
  try {
    const requests = await User.find({ verificationStatus: 'pending' });
    res.json(requests.map(u => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/admin/verify/:id', async (req, res) => {
  const { status } = req.body; // 'verified' or 'rejected'
  try {
    const user = await User.findOne(getUserQuery(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.verificationStatus = status;
    await user.save();
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: `User verification ${status}`, user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Catch-all for debugging
app.use((req, res) => {
  console.log(`[USER-SERVICE-404] ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found in User Service' });
});

app.listen(PORT, () => console.log(`User Service listening on port ${PORT}`));
