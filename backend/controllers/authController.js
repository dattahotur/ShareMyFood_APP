const User = require('../models/User');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
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
    res.status(500).json({ error: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, status: { $ne: 'deleted' } });
    if (user) {
      if (user.status === 'restricted') {
        return res.status(403).json({ error: 'Your account has been restricted. Contact admin.' });
      }
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
};

module.exports = {
  register,
  login
};
