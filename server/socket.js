const { rooms, users, saveRooms, saveUsers } = require('./data/database');

function initSocket(io) {
  io.use((socket, next) => {
    // In production, verify JWT token here
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    // For now, we'll trust the client (implement JWT verification in production)
    next();
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room
    socket.on('join-room', ({ roomCode, userId }) => {
      const room = rooms.find(r => r.code === roomCode);
      if (!room) {
        socket.emit('error', { message: 'الغرفة غير موجودة' });
        return;
      }

      if (!room.participants.includes(userId)) {
        socket.emit('error', { message: 'غير مصرح لك بالدخول لهذه الغرفة' });
        return;
      }

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.userId = userId;

      // Notify others
      io.to(roomCode).emit('user-joined', {
        userId,
        participants: room.participants,
        userName: users.find(u => u.id === userId)?.name || 'مجهول'
      });

      // Send current room state
      socket.emit('room-state', {
        settings: room.settings,
        participants: room.participants,
        status: room.status,
        drawings: room.status === 'completed' || room.settings.showDrawingsDuringTimer
          ? room.drawings
          : {}
      });
    });

    // Drawing events (only for user's own canvas)
    socket.on('draw-start', ({ x, y, color, brushSize }) => {
      if (!socket.roomCode || !socket.userId) return;
      
      // Broadcast to others (they can see but not modify)
      socket.broadcast.to(socket.roomCode).emit('other-draw-start', {
        userId: socket.userId,
        x, y, color, brushSize
      });
    });

    socket.on('draw-move', ({ x, y }) => {
      if (!socket.roomCode || !socket.userId) return;
      socket.broadcast.to(socket.roomCode).emit('other-draw-move', {
        userId: socket.userId,
        x, y
      });
    });

    socket.on('draw-end', () => {
      if (!socket.roomCode || !socket.userId) return;
      socket.broadcast.to(socket.roomCode).emit('other-draw-end', {
        userId: socket.userId
      });
    });

    // Save drawing (user's own canvas only)
    socket.on('save-drawing', ({ imageData }) => {
      if (!socket.roomCode || !socket.userId) return;

      const room = rooms.find(r => r.code === socket.roomCode);
      if (!room) return;

      // Only save to user's own drawing
      room.drawings[socket.userId] = {
        imageData,
        timestamp: new Date().toISOString(),
        userId: socket.userId
      };
      saveRooms();

      // Save to user's history
      const user = users.find(u => u.id === socket.userId);
      if (user) {
        user.drawings.push({
          imageData,
          roomCode: socket.roomCode,
          timestamp: new Date().toISOString()
        });
        // Keep only last 50 drawings
        if (user.drawings.length > 50) {
          user.drawings = user.drawings.slice(-50);
        }
        saveUsers();
      }

      // Notify others if settings allow
      if (room.settings.showDrawingsDuringTimer || room.status === 'completed') {
        io.to(socket.roomCode).emit('drawing-updated', {
          userId: socket.userId,
          imageData,
          userName: user?.name || 'مجهول'
        });
      }
    });

    // Start timer (host only)
    socket.on('start-timer', () => {
      if (!socket.roomCode || !socket.userId) return;

      const room = rooms.find(r => r.code === socket.roomCode);
      if (room && room.hostId === socket.userId && room.status === 'waiting') {
        room.status = 'active';
        room.startedAt = new Date().toISOString();
        saveRooms();

        io.to(socket.roomCode).emit('timer-started', {
          duration: room.settings.timerDuration
        });

        // Auto-complete after timer
        setTimeout(() => {
          room.status = 'completed';
          room.completedAt = new Date().toISOString();
          saveRooms();
          
          io.to(socket.roomCode).emit('timer-ended', {
            drawings: room.drawings
          });
        }, room.settings.timerDuration * 1000);
      }
    });

    // Submit rating
    socket.on('submit-rating', ({ targetUserId, rating }) => {
      if (!socket.roomCode || !socket.userId) return;

      const room = rooms.find(r => r.code === socket.roomCode);
      if (!room || room.status !== 'completed') {
        socket.emit('error', { message: 'التحدي لم ينته بعد' });
        return;
      }

      if (targetUserId === socket.userId) {
        socket.emit('error', { message: 'لا يمكنك تقييم نفسك' });
        return;
      }

      // Check if already rated
      const existingRating = room.ratings[targetUserId]?.find(
        r => r.userId === socket.userId
      );
      if (existingRating) {
        socket.emit('error', { message: 'قمت بالتقييم بالفعل' });
        return;
      }

      if (!room.ratings[targetUserId]) {
        room.ratings[targetUserId] = [];
      }
      
      room.ratings[targetUserId].push({
        userId: socket.userId,
        rating,
        timestamp: new Date().toISOString()
      });
      saveRooms();

      // Update user's total ratings
      const targetUser = users.find(u => u.id === targetUserId);
      if (targetUser) {
        targetUser.totalRating += rating;
        targetUser.ratingCount += 1;
        targetUser.ratings.push({
          roomCode: socket.roomCode,
          rating,
          timestamp: new Date().toISOString()
        });
        saveUsers();
      }

      // Calculate and broadcast rankings
      const rankings = calculateRankings(room);
      io.to(socket.roomCode).emit('rankings-updated', rankings);
    });

    // Copy drawing (user can copy others' drawings to their canvas)
    socket.on('copy-drawing', ({ sourceUserId }) => {
      if (!socket.roomCode || !socket.userId) return;

      const room = rooms.find(r => r.code === socket.roomCode);
      if (room && room.drawings[sourceUserId]) {
        // Send the drawing to the user (they can use it on their canvas)
        socket.emit('drawing-copied', {
          imageData: room.drawings[sourceUserId].imageData,
          sourceUserId
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.roomCode) {
        const room = rooms.find(r => r.code === socket.roomCode);
        if (room) {
          io.to(socket.roomCode).emit('user-left', {
            userId: socket.userId,
            participants: room.participants
          });
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });
}

function calculateRankings(room) {
  const rankings = Object.keys(room.drawings).map(userId => {
    const ratings = room.ratings[userId] || [];
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    const user = users.find(u => u.id === userId);
    return {
      userId,
      userName: user ? user.name : 'مجهول',
      userAvatar: user ? user.avatar : null,
      averageRating: parseFloat(avgRating.toFixed(2)),
      totalRatings: ratings.length
    };
  });

  return rankings.sort((a, b) => b.averageRating - a.averageRating);
}

module.exports = { initSocket };
