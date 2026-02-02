const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const roomsFile = path.join(dataDir, 'rooms.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load data
let users = [];
let rooms = [];

if (fs.existsSync(usersFile)) {
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    users = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading users:', e);
    users = [];
  }
}

if (fs.existsSync(roomsFile)) {
  try {
    const data = fs.readFileSync(roomsFile, 'utf8');
    rooms = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading rooms:', e);
    rooms = [];
  }
}

// Save functions with error handling
function saveUsers() {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

function saveRooms() {
  try {
    fs.writeFileSync(roomsFile, JSON.stringify(rooms, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
}

// Cleanup old completed rooms (older than 7 days)
function cleanupOldRooms() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const initialLength = rooms.length;
  rooms = rooms.filter(room => {
    if (room.status === 'completed' && room.completedAt) {
      const completedDate = new Date(room.completedAt);
      return completedDate > sevenDaysAgo;
    }
    return true;
  });
  
  if (rooms.length < initialLength) {
    saveRooms();
    console.log(`Cleaned up ${initialLength - rooms.length} old rooms`);
  }
}

// Run cleanup every hour
setInterval(cleanupOldRooms, 60 * 60 * 1000);

module.exports = {
  users,
  rooms,
  saveUsers,
  saveRooms
};
