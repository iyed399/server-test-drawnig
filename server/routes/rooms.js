const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { rooms, saveRooms, users } = require('../data/database');
const { authenticateToken } = require('../middleware/auth');

// Create room
router.post('/create', authenticateToken, (req, res) => {
  try {
    const { settings } = req.body;
    const userId = req.userId;

    // Generate unique room code
    let roomCode;
    let isUnique = false;
    while (!isUnique) {
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      isUnique = !rooms.find(r => r.code === roomCode);
    }
    
    const newRoom = {
      id: uuidv4(),
      code: roomCode,
      hostId: userId,
      participants: [userId],
      settings: {
        timerEnabled: settings?.timerEnabled || false,
        timerDuration: settings?.timerDuration || 300, // 5 minutes default
        votingEnabled: settings?.votingEnabled !== undefined ? settings.votingEnabled : true,
        showDrawingsDuringTimer: settings?.showDrawingsDuringTimer || false,
        maxParticipants: settings?.maxParticipants || 10
      },
      drawings: {},
      ratings: {},
      status: 'waiting', // waiting, active, completed
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    rooms.push(newRoom);
    saveRooms();

    res.status(201).json({
      room: {
        id: newRoom.id,
        code: newRoom.code,
        settings: newRoom.settings,
        participants: [userId],
        status: newRoom.status
      }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'خطأ في إنشاء الغرفة' });
  }
});

// Join room
router.post('/join', authenticateToken, (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;

    if (!code) {
      return res.status(400).json({ error: 'كود الغرفة مطلوب' });
    }

    const room = rooms.find(r => r.code === code.toUpperCase() && r.status !== 'completed');
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة أو منتهية' });
    }

    // Check max participants
    if (room.participants.length >= room.settings.maxParticipants) {
      return res.status(403).json({ error: 'الغرفة ممتلئة' });
    }

    // Add participant if not already in room
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      saveRooms();
    }

    res.json({
      room: {
        id: room.id,
        code: room.code,
        settings: room.settings,
        participants: room.participants,
        status: room.status,
        hostId: room.hostId
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'خطأ في الانضمام للغرفة' });
  }
});

// Get room info
router.get('/:code', authenticateToken, (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.userId;
    
    const room = rooms.find(r => r.code === code.toUpperCase());

    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    // Check if user is participant
    if (!room.participants.includes(userId)) {
      return res.status(403).json({ error: 'غير مصرح لك بالدخول لهذه الغرفة' });
    }

    res.json({
      room: {
        id: room.id,
        code: room.code,
        settings: room.settings,
        participants: room.participants,
        status: room.status,
        hostId: room.hostId,
        createdAt: room.createdAt,
        startedAt: room.startedAt,
        completedAt: room.completedAt
      }
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'خطأ في جلب معلومات الغرفة' });
  }
});

// Update room settings (host only)
router.put('/:code/settings', authenticateToken, (req, res) => {
  try {
    const { code } = req.params;
    const { settings } = req.body;
    const userId = req.userId;

    const room = rooms.find(r => r.code === code.toUpperCase());
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({ error: 'فقط المضيف يمكنه تعديل الإعدادات' });
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'لا يمكن تعديل الإعدادات بعد بدء التحدي' });
    }

    // Update settings
    room.settings = {
      ...room.settings,
      ...settings
    };
    saveRooms();

    res.json({ settings: room.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'خطأ في تحديث الإعدادات' });
  }
});

// Get room results
router.get('/:code/results', authenticateToken, (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.userId;

    const room = rooms.find(r => r.code === code.toUpperCase());
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }

    if (!room.participants.includes(userId)) {
      return res.status(403).json({ error: 'غير مصرح لك بالدخول لهذه الغرفة' });
    }

    if (room.status !== 'completed') {
      return res.status(400).json({ error: 'التحدي لم ينته بعد' });
    }

    // Calculate rankings
    const rankings = Object.keys(room.drawings).map(userId => {
      const userRatings = room.ratings[userId] || [];
      const avgRating = userRatings.length > 0
        ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length
        : 0;

      const user = users.find(u => u.id === userId);
      return {
        userId,
        userName: user ? user.name : 'مجهول',
        userAvatar: user ? user.avatar : null,
        drawing: room.drawings[userId],
        averageRating: parseFloat(avgRating.toFixed(2)),
        totalRatings: userRatings.length
      };
    }).sort((a, b) => b.averageRating - a.averageRating);

    res.json({
      rankings,
      topThree: rankings.slice(0, 3),
      winner: rankings[0] || null
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'خطأ في جلب النتائج' });
  }
});

module.exports = router;
