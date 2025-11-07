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

            if (!me)
            {
                return ack?.({ ok: false, error: "Login first." });
            } 

            const result = this.rooms.createRoom(
            {
                name,
                isPrivate,
                password,
                ownerNickname: me.nickname,
            });

            if (!result.ok)
            {
                return ack?.(result);
            } 

            // owner auto join the room
            this.rooms.joinRoom(socket.id, name);
            socket.join(name);

            // updates
            this.io.emit("lobby:rooms", this.rooms.getPublicState());
            this.io.to(name).emit("room:users", this.rooms.getUserNicknames(name));

            ack?.({ ok: true, room: name, owner: me.nickname });
        });

        // join the room
        socket.on("room:join", ({ name, password }, ack) => {
            const me = this.rooms.getUser(socket.id);
            const room = this.rooms.rooms.get(name);


            if (!me)
            {
                return ack?.({ ok: false, error: "Login first" });
            } 

            if (!room)
            {
                return ack?.({ ok: false, error: "Room not found" });
            }

            // check user is banned
            if (this.rooms.isBanned(name, me.nickname))
            {
                return ack?.({ ok: false, error: "You are banned" });
            }
             
            // check password
            if (room.isPrivate && room.password !== password)
            {
                return ack?.({ ok: false, error: "Incorrect password" });
            }
                

            const res = this.rooms.joinRoom(socket.id, name);
            
            if (!res.ok)
            {
                return ack?.(res);
            } 

            // switch rooms at socket.io level too
            // leave all rooms except its private id
            for (const r of socket.rooms) 
            {
                if (r !== socket.id)
                {
                    socket.leave(r);
                } 
            }

            
            socket.join(name);

            // updates the users on the list
            this.io.to(name).emit("room:users", this.rooms.getUserNicknames(name));
            this.io.emit("lobby:rooms", this.rooms.getPublicState());
            ack?.({ ok: true, room: name, owner: room.ownerNickname });
        });

        socket.on("room:leave", () => {
            const me = this.rooms.getUser(socket.id);
            const current = me?.room;


            if (!current) 
            {
                return;
            }

            this.rooms.leaveRoom(socket.id);
            socket.leave(current);

            // rejoin lobby 
            socket.join("lobby"); 


            // Update user lists
            this.io.to(current).emit("room:users", this.rooms.getUserNicknames(current));
            this.io.to("lobby").emit("room:users", this.rooms.getUserNicknames("lobby"));
            this.io.emit("lobby:rooms", this.rooms.getPublicState());
        });

        // kick out
        socket.on("room:kick", ({ targetNickname }, ack) => {
            const me = this.rooms.getUser(socket.id);

            if (!me?.room)
            {
                return ack?.({ ok: false, error: "Join a room first" });
            } 


            if (!this.rooms.isOwner(socket.id, me.room))
            {
                return ack?.({ ok: false, error: "Only the room owner can kick" });
            }


            const kickedId = this.rooms.kickUser(me.room, targetNickname);
            if (!kickedId)
            {
                return ack?.({ ok: false, error: "User not found" });
            } 

            // notify and force leave the kicked user
            const targetSock = this.io.sockets.sockets.get(kickedId);
            targetSock?.emit("room:kicked", { room: me.room });
            targetSock?.leave(me.room);

            this.io.to(me.room).emit("room:users", this.rooms.getUserNicknames(me.room));
            ack?.({ ok: true });
        });

        // BAN
        socket.on("room:ban", ({ targetNickname }, ack) => {
            const me = this.rooms.getUser(socket.id);

            if (!me?.room) 
            {
                return ack?.({ ok: false, error: "Join a room first" });
            }


            if (!this.rooms.isOwner(socket.id, me.room))
            {
                return ack?.({ ok: false, error: "Only the room owner can ban." });
            }
                

            const kickedId = this.rooms.banUser(me.room, targetNickname);
            if (!kickedId)
            {
                return ack?.({ ok: false, error: "User not found." });
            } 

            // notify and force leave the banned user
            const targetSock = this.io.sockets.sockets.get(kickedId);
            targetSock?.emit("room:banned", { room: me.room });
            targetSock?.leave(me.room);


            // update user list
            this.io.to(me.room).emit("room:users", this.rooms.getUserNicknames(me.room));
            ack?.({ ok: true });
        });

        // caht message
        socket.on("chat:send", ({ text, to }, ack) => {
            const me = this.rooms.getUser(socket.id);
            if (!me?.room)
            {
                return ack?.({ ok: false, error: "Join a room first" });
            } 

            const msg = { from: me.nickname, text, ts: Date.now() };
            if (to) 
            {
                // private message to specific user in the same room
                const target = [...this.rooms.users.values()].find(
                    u => u.nickname === to && u.room === me.room
                );

                if (!target)
                {
                    return ack?.({ ok: false, error: "User not in room" });
                } 

                // send to both sender and receiver
                this.io.to(target.id).emit("chat:private", msg);
                socket.emit("chat:private", { ...msg, to });

            } 
            else 
            {
                this.io.to(me.room).emit("chat:public", msg);
            }
            ack?.({ ok: true });
        });

        // disconnect 
        socket.on("disconnect", () => {
            const me = this.rooms.getUser(socket.id);
            const roomName = me?.room;
            this.rooms.removeUser(socket.id);


            if (roomName) 
            {
                // update user list in the room
                this.io.to(roomName).emit("room:users", this.rooms.getUserNicknames(roomName));
            }

            // update lobby room list
            this.io.emit("lobby:rooms", this.rooms.getPublicState());

            this.io.to("lobby").emit("room:users", this.rooms.getUserNicknames("lobby"));
        });
    }
}

module.exports = ChatServer;
