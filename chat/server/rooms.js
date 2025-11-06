class Rooms {

    constructor() {

        // roomName = { name, isPrivate, password, ownerId, users:Set<socketId>, banned:Set<nickname> }
        this.rooms = new Map(); 

        // socketId = { id, nickname, room: string }
        this.users = new Map(); 
    }

    getPublicState() {
        // for show room list to clients without sensitive info so no passward needed
        return Array.from(this.rooms.values()).map(
            room => (
                {
                    name: room.name,
                    isPrivate: room.isPrivate,
                    count: room.users.size
                }
            )
        );
    }

    setUser(socketId, nickname) {
        // adding new user using the nickname
        this.users.set(socketId, 
            { id: socketId, nickname, room: null }
        );
    }

    
    getUser(socketId) {
        // get user info by the sociket id
        const user = this.users.get(socketId);
        return user;
    }

    removeUser(socketId) {
        const user = this.users.get(socketId);

        if (!user)
        {
            return;
        } 
        if (user.room && this.rooms.has(user.room)) {
            const room = this.rooms.get(user.room);
            room.users.delete(socketId);
            
            // if room is empty delete the room
            if (room.users.size === 0)
            {
                this.rooms.delete(room.name);
            } 
        }

        // remove the user
        this.users.delete(socketId);
    }

    createRoom({ name, isPrivate = false, password = "", ownerId }) {

        if (!name || this.rooms.has(name)) {
            return { ok: false, error: "Room name is invalid or already exists" };
        }


        this.rooms.set(
            name, 
            {
                name,
                isPrivate: !!isPrivate,
                password: isPrivate ? String(password || "") : "",
                ownerId,
                users: new Set(),
                banned: new Set()
            }
        );


        return { ok: true };
    }


    joinRoom(socketId, roomName) {
        const user = this.users.get(socketId);
        const room = this.rooms.get(roomName);

        // check if user and room exist
        if (!user || !room)
        { 
            return { ok: false, error: "Cannot join room" };
        }


        // leave previous room if any
        if (user.room && this.rooms.has(user.room)) {
            this.rooms.get(user.room).users.delete(socketId);

            // clean up empty room
            if (this.rooms.get(user.room).users.size === 0) 
            {
                this.rooms.delete(user.room);
            }
        }


        room.users.add(socketId);
        user.room = roomName;
        return { ok: true };
    }


    isOwner(socketId, roomName) {
        const room = this.rooms.get(roomName);

        // check if room exists and owner match
        return !!room && room.ownerId === socketId;
    }


    getUserNicknames(roomName) {

        const room = this.rooms.get(roomName);


        if (!room)
        {
            return [];
        }

        // map socket ides to nicknames
        return Array.from(room.users).map(id => this.users.get(id)?.nickname).filter(Boolean);
    }


    kickUser(roomName, targetNickname) {

        const room = this.rooms.get(roomName);

        
        if (!room) 
        {
            return false;
        }

        for (const [id, user] of this.users.entries()) {
            // find the target user by nickname in the room and delete that user
            if (user.nickname === targetNickname && user.room === roomName) 
            {
                room.users.delete(id);
                user.room = null;
                return true;
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

        // add user to the ban list and kick them out
        room.banned.add(targetNickname);
        this.kickUser(roomName, targetNickname);


        return true;
    }


    isBanned(roomName, nickname) {

        const room = this.rooms.get(roomName);

        // check if user in the ban list
        return room?.banned.has(nickname);
    }




}

module.exports = Rooms;