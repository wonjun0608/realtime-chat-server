class Rooms {

    constructor() {

        // roomName = { name, isPrivate, password, ownerId, users:Set<socketId>, banned:Set<nickname> }
        this.rooms = new Map(); 

        // socketId = { id, nickname, room: string }
        this.users = new Map(); 
    }

    getPublicState() {
        // For show room list to clients without sensitive info so no passward needed
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
        // Adding new user using the nickname
        this.users.set(socketId, 
            { id: socketId, nickname, room: null }
        );
    }

    
    getUser(socketId) {
        // Get user info by the sociket id
        let user = this.users.get(socketId);
        return user;
    }



}

module.exports = Rooms;