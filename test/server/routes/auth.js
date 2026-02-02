const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users, saveUsers } = require('../data/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'البريد الإلكتروني غير صحيح' });
    }

    // Check if user exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      avatar: null,
      drawings: [],
      ratings: [],
      totalRating: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(newUser);
    saveUsers();

    // Generate token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    saveUsers();

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        drawings: user.drawings.length,
        totalRating: user.totalRating,
        ratingCount: user.ratingCount,
        averageRating: user.ratingCount > 0 ? (user.totalRating / user.ratingCount).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// Google OAuth (simplified - implement proper OAuth in production)
router.post('/google', async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'بيانات Google غير كاملة' });
    }

    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create new user
      user = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        password: null,
        name: name.trim(),
        avatar: picture || null,
        googleId: googleId || null,
        drawings: [],
        ratings: [],
        totalRating: 0,
        ratingCount: 0,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      users.push(user);
      saveUsers();
    } else {
      // Update existing user
      if (picture && user.avatar !== picture) {
        user.avatar = picture;
      }
      user.lastLogin = new Date().toISOString();
      if (googleId) user.googleId = googleId;
      saveUsers();
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        drawings: user.drawings.length,
        totalRating: user.totalRating,
        ratingCount: user.ratingCount,
        averageRating: user.ratingCount > 0 ? (user.totalRating / user.ratingCount).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// Get user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      drawings: user.drawings,
      ratings: user.ratings,
      totalRating: user.totalRating,
      ratingCount: user.ratingCount,
      averageRating: user.ratingCount > 0 ? (user.totalRating / user.ratingCount).toFixed(1) : 0,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// Update profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = users.find(u => u.id === req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (name) {
      user.name = name.trim();
    }
    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    saveUsers();

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticateToken, (req, res) => {
  // In a real app, you might want to blacklist the token
  // For now, we just acknowledge the logout
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'رمز الوصول مطلوب' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'رمز الوصول غير صالح أو منتهي الصلاحية' });
    }
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  });
}

module.exports = router;
