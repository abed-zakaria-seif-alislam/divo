const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map();

// Track active calls
const activeCalls = new Map();

// Record online status
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Register user with their ID
  socket.on('registerUser', ({ userId, userType }) => {
    console.log(`User registered: ${userId} (${userType})`);
    connectedUsers.set(userId, { socket: socket.id, userType });
    
    // Notify others that this user is online
    socket.broadcast.emit('userOnline', { userId, userType });
    
    // Send currently online users to the newly connected user
    const onlineUsers = Array.from(connectedUsers.entries()).map(([id, data]) => ({
      userId: id,
      userType: data.userType
    }));
    socket.emit('onlineUsers', onlineUsers);
  });

  // Handle call signaling
  socket.on('callUser', (data) => {
    const userSocketId = connectedUsers.get(data.userToCall)?.socket;
    
    if (userSocketId) {
      io.to(userSocketId).emit('callUser', {
        signal: data.signalData,
        from: data.from
      });
      
      // Record the call
      activeCalls.set(data.from + '-' + data.userToCall, {
        caller: data.from,
        recipient: data.userToCall,
        startTime: new Date()
      });
    }
  });

  socket.on('answerCall', (data) => {
    const userSocketId = connectedUsers.get(data.to)?.socket;
    
    if (userSocketId) {
      io.to(userSocketId).emit('callAccepted', data.signal);
    }
  });
  
  // Handle chat messages
  socket.on('sendMessage', (data) => {
    const userSocketId = connectedUsers.get(data.to)?.socket;
    
    if (userSocketId) {
      io.to(userSocketId).emit('chatMessage', data.message);
    }
  });
  
  // Handle screen sharing status
  socket.on('screenShareStarted', (data) => {
    const userSocketId = connectedUsers.get(data.to)?.socket;
    
    if (userSocketId) {
      io.to(userSocketId).emit('partnerScreenShareStarted');
    }
  });
  
  socket.on('screenShareStopped', (data) => {
    const userSocketId = connectedUsers.get(data.to)?.socket;
    
    if (userSocketId) {
      io.to(userSocketId).emit('partnerScreenShareStopped');
    }
  });

  // Handle call ended
  socket.on('endCall', (data) => {
    const userSocketId = connectedUsers.get(data.to)?.socket;
    
    if (userSocketId) {
      io.to(userSocketId).emit('callEnded');
      
      // Update call records
      const callKey = data.from + '-' + data.to;
      const reverseCallKey = data.to + '-' + data.from;
      
      if (activeCalls.has(callKey)) {
        const call = activeCalls.get(callKey);
        call.endTime = new Date();
        call.duration = (call.endTime - call.startTime) / 1000; // in seconds
        
        // Here you could save call records to a database
        console.log('Call ended:', call);
        
        activeCalls.delete(callKey);
      } else if (activeCalls.has(reverseCallKey)) {
        const call = activeCalls.get(reverseCallKey);
        call.endTime = new Date();
        call.duration = (call.endTime - call.startTime) / 1000; // in seconds
        
        // Here you could save call records to a database
        console.log('Call ended:', call);
        
        activeCalls.delete(reverseCallKey);
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove the disconnected user
    for (const [userId, data] of connectedUsers.entries()) {
      if (data.socket === socket.id) {
        connectedUsers.delete(userId);
        
        // Notify others this user is offline
        socket.broadcast.emit('userOffline', { userId });
        
        // Check if user was in a call and notify the other participant
        for (const [callKey, call] of activeCalls.entries()) {
          if (call.caller === userId || call.recipient === userId) {
            const otherPartyId = call.caller === userId ? call.recipient : call.caller;
            const otherPartySocketId = connectedUsers.get(otherPartyId)?.socket;
            
            if (otherPartySocketId) {
              io.to(otherPartySocketId).emit('callEnded', { reason: 'disconnected' });
            }
            
            activeCalls.delete(callKey);
          }
        }
        
        break;
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    connectedUsers: connectedUsers.size,
    activeCalls: activeCalls.size
  });
});

server.listen(3001, () => {
  console.log('Video call server running on port 3001');
});
