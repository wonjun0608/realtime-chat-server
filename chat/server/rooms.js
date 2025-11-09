// server/Rooms.js
class Rooms {
    constructor() {
        // Map<roomName, { name, isPrivate, password, ownerNickname, users:Set<socketId>, banned:Set<nickname> }>
        this.rooms = new Map();
        // Map<socketId, { id, nickname, room: string|null }>
        this.users = new Map();

        // Create the public lobby room
        this.rooms.set("lobby", {
            name: "lobby",
            isPrivate: false,
            password: "",
            ownerNickname: null,
            users: new Set(),
            banned: new Set(),
            kicked: new Set(),
            messages: []
        });

    }

    // Get public state of all rooms (for lobby listing)
    getPublicState() {

        return Array.from(this.rooms.values())
            .filter(r => r.name !== "lobby") // hide lobby
            .map(r => (
                {
                name: r.name,
                isPrivate: r.isPrivate,
                count: r.users.size,
                }
            ));
    }


    // Setting users
    setUser(socketId, nickname) {

        this.users.set(socketId, { id: socketId, nickname, room: "lobby" });
        const lobby = this.rooms.get("lobby");

        lobby.users.add(socketId);
    }

    getUser(socketId) {

        return this.users.get(socketId);
    }

    removeUser(socketId) {

        // Leave any room, but keep the room
        this.leaveRoom(socketId);
        this.users.delete(socketId);
    }


    createRoom({ name, isPrivate = false, password = "", ownerNickname }) {
        if (!name || this.rooms.has(name)) 
        {
            return { ok: false, error: "Room name is invalid or already exists" };
        }


        this.rooms.set(name, {
            name,
            isPrivate: !!isPrivate,
            password: isPrivate ? String(password || "") : "",
            ownerNickname,        // track owner by nickname
            users: new Set(),
            banned: new Set(),
            kicked: new Set(),
            messages: []
        });

        return { ok: true };
    }

    

    // Check if the user is the owner of the room
    isOwner(socketId, roomName) {

        const room = this.rooms.get(roomName);
        const user = this.users.get(socketId);

        // owner identified by nickname
        return !!room && !!user && room.ownerNickname === user.nickname;
    }


    // Check if a user is banned from a room
    isBanned(roomName, nickname) {
        const room = this.rooms.get(roomName);

        return !!room && room.banned.has(nickname);
    }

    getUserNicknames(roomName) {

        const room = this.rooms.get(roomName);
        if (!room)
        {
            return [];
        }

        return Array.from(room.users).map(id => this.users.get(id)?.nickname).filter(Boolean);
    }


    joinRoom(socketId, roomName) {
        const user = this.users.get(socketId);
        const room = this.rooms.get(roomName);


        if (!user || !room)
        {
            return { ok: false, error: "Cannot join room." };
        }
            

        // leave previous room
        if (user.room && this.rooms.has(user.room)) 
        {
            const prev = this.rooms.get(user.room);
            prev.users.delete(socketId);
        }

        room.users.add(socketId);
        user.room = roomName;
        return { ok: true };
    }

    leaveRoom(socketId) {
    const user = this.users.get(socketId);
    if (!user?.room) return { ok: true };

    const current = this.rooms.get(user.room);
    if (current) {
        current.users.delete(socketId);
    }

    const lobby = this.rooms.get("lobby");
    lobby.users.add(socketId);
    user.room = "lobby";

   
    user.room = null;
    return { ok: true };
}
    // To save previous meesages when come back to the room
    getRoomMessages(roomName) {
        const room = this.rooms.get(roomName);
        if (!room) return [];
        return room.messages;
    }

    addMessageToRoom(roomName, msg) {
        const room = this.rooms.get(roomName);
        if (!room) return;
        room.messages.push(msg);

        if (room.messages.length > 100) room.messages.shift();
    }


    kickUser(roomName, targetNickname) {
        const room = this.rooms.get(roomName);
        if (!room)
        {
            return false;
        }

        for (const [id, u] of this.users.entries()) {
            if (u.nickname === targetNickname && u.room === roomName) 
            {
                room.users.delete(id);
                u.room = null;
                return id; // return socketId that was kicked out
            }
        }
        return false;
    }

    banUser(roomName, targetNickname) {
        const room = this.rooms.get(roomName);
        if (!room)
        {
            return false;
        } 
        room.banned.add(targetNickname);

        // Also kick the user if currently in the room
        return this.kickUser(roomName, targetNickname);
    }
}

module.exports = Rooms;
