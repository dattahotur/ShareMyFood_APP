const mongoose = require('mongoose');

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

module.exports = User;
