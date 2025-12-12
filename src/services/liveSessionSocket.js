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

    if (!roomId) {
      socket.close();
      return;
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(peerId, socket);

    socket.send(
      JSON.stringify({
        type: "connected",
        peerId,
        participants: Array.from(rooms.get(roomId).keys()).filter(
          (id) => id !== peerId
        ),
      })
    );

    broadcast(
      roomId,
      {
        type: "peer-joined",
        peerId,
        userId,
      },
      peerId
    );

    socket.on("message", (message) => {
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (err) {
        return;
      }

      if (!payload || !payload.type) return;

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
