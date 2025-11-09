// server/chat.js
const Rooms = require("./rooms");

class ChatServer {
    constructor(io) {
        this.io = io;
        this.rooms = new Rooms();
        this.registerEvents();
    }

    registerEvents() 
    {
        this.io.on("connection", (socket) => this.handleConnection(socket));
    }

    handleConnection(socket) 
    {
        // login
        socket.on("login", (nickname, ack) => {
            // get the nickname and trim whitespace
            nickname = (nickname || "").trim();


            if (!nickname)
            {
                return ack?.({ ok: false, error: "Nickname required" });
            } 


            if ([...this.rooms.users.values()].some(u => u.nickname === nickname))
            {
                return ack?.({ ok: false, error: "Nickname already in use." });
            }
                

            // register user in the rooms manager
            this.rooms.setUser(socket.id, nickname);
            socket.join("lobby"); 
            ack?.({ ok: true });

            // notify everyone in the lobby
            this.io.to("lobby").emit("room:users", this.rooms.getUserNicknames("lobby"));
            socket.emit("lobby:rooms", this.rooms.getPublicState());
        });

        // create room
        socket.on("room:create", ({ name, isPrivate, password }, ack) => {
            const me = this.rooms.getUser(socket.id);
            if (!me) return ack?.({ ok: false, error: "Login first." });

            const result = this.rooms.createRoom({
                name,
                isPrivate,
                password,
                ownerNickname: me.nickname,
            });
            if (!result.ok) return ack?.(result);

            this.rooms.joinRoom(socket.id, name);
            socket.join(name);

            this.io.to("lobby").emit("lobby:rooms", this.rooms.getPublicState());
            this.io.to(name).emit("room:users", this.rooms.getUserNicknames(name));

            ack?.({ ok: true, room: name, owner: me.nickname });
        });

        // join the room
        socket.on("room:join", ({ name, password }, ack) => {
            const me = this.rooms.getUser(socket.id);
            const room = this.rooms.rooms.get(name);

            if (!me) return ack?.({ ok: false, error: "Login first" });
            if (!room) return ack?.({ ok: false, error: "Room not found" });
            if (this.rooms.isBanned(name, me.nickname)) return ack?.({ ok: false, error: "You are banned" });
            if (room.isPrivate && room.password !== password) return ack?.({ ok: false, error: "Incorrect password" });

            if (socket.rooms.has("lobby")) socket.leave("lobby");
            socket.join(name);

    
            const res = this.rooms.joinRoom(socket.id, name);
            if (!res.ok) return ack?.(res);


            this.io.to(name).emit("room:users", this.rooms.getUserNicknames(name));
            this.io.to("lobby").emit("lobby:rooms", this.rooms.getPublicState());

            const history = this.rooms.getRoomMessages(name);
            socket.emit("chat:history", history);

            ack?.({ ok: true, room: name, owner: room.ownerNickname });
        });


        // leave room
        socket.on("room:leave", () => {
            const me = this.rooms.getUser(socket.id);
            const current = me?.room;
            if (!current) return;

   
            socket.leave(current);

   
            this.rooms.leaveRoom(socket.id);

    
            socket.join("lobby");
            this.rooms.joinRoom(socket.id, "lobby");

            this.io.to(current).emit("room:users", this.rooms.getUserNicknames(current));
            this.io.to("lobby").emit("room:users", this.rooms.getUserNicknames("lobby"));
            socket.emit("lobby:rooms", this.rooms.getPublicState());
        });

        // kick out
        socket.on("room:kick", ({ targetNickname }, ack) => {
            const me = this.rooms.getUser(socket.id);
            if (!me?.room) return ack?.({ ok: false, error: "Join a room first" });
            if (!this.rooms.isOwner(socket.id, me.room))
                return ack?.({ ok: false, error: "Only the room owner can kick" });

            const kickedId = this.rooms.kickUser(me.room, targetNickname);
            if (!kickedId) return ack?.({ ok: false, error: "User not found" });

            const targetSock = this.io.sockets.sockets.get(kickedId);
            targetSock?.emit("room:kicked", { room: me.room });
            targetSock?.leave(me.room);

            this.io.to(me.room).emit("room:users", this.rooms.getUserNicknames(me.room));
            ack?.({ ok: true });
        });

        // BAN
        socket.on("room:ban", ({ targetNickname }, ack) => {
            const me = this.rooms.getUser(socket.id);
            if (!me?.room) return ack?.({ ok: false, error: "Join a room first" });
            if (!this.rooms.isOwner(socket.id, me.room))
                return ack?.({ ok: false, error: "Only the room owner can ban." });

            const kickedId = this.rooms.banUser(me.room, targetNickname);
            if (!kickedId) return ack?.({ ok: false, error: "User not found." });

            const targetSock = this.io.sockets.sockets.get(kickedId);
            targetSock?.emit("room:banned", { room: me.room });
            targetSock?.leave(me.room);

            this.io.to(me.room).emit("room:users", this.rooms.getUserNicknames(me.room));
            ack?.({ ok: true });
        });

        // chat message
        socket.on("chat:send", ({ text, to, replyTo }, ack) => {
        const me = this.rooms.getUser(socket.id);
        if (!me?.room) return ack?.({ ok: false, error: "Join a room first" });

    
        const msgId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const msg = { id: msgId, from: me.nickname, text, ts: Date.now() };

        if (replyTo) {
            const original = this.rooms
            .getRoomMessages(me.room)
            .find(m => m.id === replyTo);
            if (original) {
                msg.replyTo = replyTo;  
                msg.replyToText = original.text;
                msg.replyToFrom = original.from;
            }
        }

        if (to) {
            const target = [...this.rooms.users.values()].find(
                (u) => u.nickname === to && u.room === me.room
            );
            if (!target) return ack?.({ ok: false, error: "User not in room" });

            this.io.to(target.id).emit("chat:private", msg);
            socket.emit("chat:private", { ...msg, to });
        } else {
            this.rooms.addMessageToRoom(me.room, msg);
            this.io.to(me.room).emit("chat:public", msg);
        }

        ack?.({ ok: true });
    });

    socket.on("chat:delete", ({ msgId }) => {
        const me = this.rooms.getUser(socket.id);
        if (!me?.room) return;

        const roomName = me.room;
        console.log(`[DELETE] ${me.nickname} deleted message ${msgId} in ${roomName}`);

    
        this.io.to(roomName).emit("chat:deleted", { msgId });
    });


        // typing indicator when other user is typing, you can see who is typing at that moment
    socket.on("typing", ({ isTyping }) => {
        const me = this.rooms.getUser(socket.id);
    
        if (!me) {
            console.warn(`[WARN] typing: socket ${socket.id} not registered`);
            return;
        }
        if (!me.room) {
        console.warn(`[WARN] typing: user ${me.nickname} not in a room`);
        return;
    }


    socket.to(me.room).emit("typing", { nickname: me.nickname, isTyping });
    });

        

        // disconnect 
        socket.on("disconnect", () => {
            const me = this.rooms.getUser(socket.id);
            const roomName = me?.room;
            this.rooms.removeUser(socket.id);

            if (roomName) {
                this.io.to(roomName).emit("room:users", this.rooms.getUserNicknames(roomName));
            }

            this.io.to("lobby").emit("lobby:rooms", this.rooms.getPublicState());
            this.io.to("lobby").emit("room:users", this.rooms.getUserNicknames("lobby"));
        });
    }
}

module.exports = ChatServer;