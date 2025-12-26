const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");

const rooms = new Map();

const broadcast = (roomId, payload, excludeId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(payload);
  room.forEach((client, peerId) => {
    if (client.readyState === 1 && peerId !== excludeId) {
      client.send(data);
    }
  });
};

const removeClient = (roomId, peerId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  if (!room.size) {
    rooms.delete(roomId);
  }
};

const initLiveSocket = (server) => {
  const wss = new WebSocketServer({
    server,
    path: "/ws/live",
  });

  wss.on("connection", (socket, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const roomId = url.searchParams.get("roomId");
    const peerId = url.searchParams.get("peerId") || randomUUID();
    const userId = url.searchParams.get("userId") || "";

    console.log(`[WS] New connection attempt from ${peerId} (User: ${userId}) for Room: ${roomId}`);

    if (!roomId) {
      console.log("[WS] Connection rejected: No roomId");
      socket.close();
      return;
    }

    // Store metadata on socket
    socket.userId = userId;
    socket.mediaState = { mic: true, cam: true }; // Default state

    // --- NEW LOGIC: Check Capacity & Booking ---
    const { LiveSession, Booking, User } = require("../models");
    
    // We need to fetch session details to check capacity and booking
    // Note: In real app, cache this or optimize query
    LiveSession.findByPk(roomId).then(async (session) => {
       if (!session) {
          console.log("[WS] Connection rejected: Session not found");
          socket.close(1008, "Session not found"); // Policy Violation
          return;
       }

       // 1. Check if Host (Instructor)
       const isHost = String(session.instructor_id) == String(userId);
       socket.isHost = isHost;

       // 2. Check Capacity (if not host)
       if (!isHost) {
          const currentCount = rooms.get(roomId)?.size || 0;
          // Count only participants (exclude host if needed, but simple count is safer)
          if (currentCount >= session.max_capacity + 1) { // +1 for host
             console.log(`[WS] Connection rejected: Room full (${currentCount}/${session.max_capacity})`);
             socket.close(1008, "Room is full");
             return;
          }
       }

       // 3. User Role & Booking Validation
       if (!isHost) {
          // Find confirmed booking for this user & session
          const booking = await Booking.findOne({
             where: {
                user_id: userId,
                session_id: roomId,
                status: 'confirmed'
             }
          });

          if (!booking) {
             // Strict Mode: Reject if no booking
             // console.log("[WS] Connection rejected: No booking found");
             // socket.close(1008, "No booking found");
             // return;
             
             // Open Mode (For now): Allow as observer if no booking? 
             // Or just treat as 'observer' by default to not break current flow
             socket.role = 'observer'; 
          } else {
             socket.role = booking.role || 'speaker';
          }
       } else {
          socket.role = 'host';
       }

       // --- END NEW LOGIC ---

       if (!rooms.has(roomId)) {
         rooms.set(roomId, new Map());
       }
       rooms.get(roomId).set(peerId, socket);
   
       // Get existing participants with metadata
       const room = rooms.get(roomId);
       const existingParticipants = [];
       room.forEach((client, id) => {
         if (id !== peerId) {
           existingParticipants.push({
             peerId: id,
             userId: client.userId || "Unknown",
             mediaState: client.mediaState || { mic: true, cam: true }, // Include state
             role: client.role || 'observer' // Send role
           });
         }
       });
   
       socket.send(
         JSON.stringify({
           type: "connected",
           peerId,
           participants: existingParticipants,
           role: socket.role, // Tell user their role
         })
       );
   
       broadcast(
         roomId,
         {
           type: "peer-joined",
           peerId,
           userId,
           mediaState: socket.mediaState, // Include initial state
           role: socket.role, // Broadcast role
         },
         peerId
       );

    }).catch(err => {
       console.error("[WS] Error validating session:", err);
       socket.close(1011, "Internal Server Error");
    });
    
    // Original code moved inside .then() or removed to avoid race condition
    // For safety, I will comment out the original generic join logic below
    /*
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(peerId, socket);
    ...
    */

    socket.on("message", (message) => {
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (err) {
        return;
      }

      if (!payload || !payload.type) return;

      if (payload.type === "chat-message") {
        broadcast(
          roomId,
          {
            type: "chat-message",
            sender: payload.sender, // Name of sender
            text: payload.text,
            time: new Date().toISOString(),
          },
          peerId // Exclude sender from broadcast (they add their own locally)
        );
        return;
      }

      if (payload.type === "mute-user") {
        const targetSocket = rooms.get(roomId)?.get(payload.target);
        if (targetSocket?.readyState === 1) {
          targetSocket.send(JSON.stringify({ type: "mute-forced", sender: peerId }));
        }
        return;
      }

      if (payload.type === "ban-user") {
        const targetSocket = rooms.get(roomId)?.get(payload.target);
        if (targetSocket?.readyState === 1) {
           targetSocket.send(JSON.stringify({ type: "banned", sender: peerId }));
           setTimeout(() => {
              targetSocket.close(1008, "Banned by host");
           }, 100);
        }
        return;
      }

      if (payload.type === "peer-update") {
         // Update server state
         socket.mediaState = payload.mediaState;
         
         broadcast(roomId, {
            type: "peer-update",
            peerId,
            mediaState: payload.mediaState
         }, peerId); 
         return;
      }

      if (payload.target && rooms.get(roomId)?.has(payload.target)) {
        const targetSocket = rooms.get(roomId).get(payload.target);
        if (targetSocket?.readyState === 1) {
          targetSocket.send(
            JSON.stringify({
              ...payload,
              sender: peerId,
            })
          );
        }
        return;
      }

      broadcast(
        roomId,
        {
          ...payload,
          sender: peerId,
        },
        peerId
      );
    });

    socket.on("close", () => {
      removeClient(roomId, peerId);
      broadcast(
        roomId,
        {
          type: "peer-left",
          peerId,
        },
        peerId
      );
    });

    socket.on("error", () => {
      socket.close();
    });
  });

  console.log("Live session WebSocket server ready on /ws/live");
};

module.exports = { initLiveSocket };
