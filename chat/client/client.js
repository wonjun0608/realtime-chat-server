
class UIManager {

    // cache elements
    constructor() {
        this.$login = document.getElementById("login");
        this.$app = document.getElementById("app");
        this.$nickname = document.getElementById("nickname");
        this.$loginError = document.getElementById("loginError");
        this.$roomList = document.getElementById("roomList");
        this.$roomTitle = document.getElementById("roomTitle");
        this.$userList = document.getElementById("userList");
        this.$messages = document.getElementById("messages");
    }


    // show main app UI
    showApp() {
        this.$login.classList.add("hidden");
        this.$app.classList.remove("hidden");
    }

    // display room list in the lobby
    showRooms(rooms, onJoin) {
        this.$roomList.innerHTML = "";
        if (!rooms.length) 
        {
            this.$roomList.innerHTML = "<li><em>No rooms</em></li>";
            return;
        }

        // populate room list
        rooms.forEach(r => {
            const li = document.createElement("li");
            const btn = document.createElement("button");
            btn.textContent = `${r.name} (${r.count})${r.isPrivate ? " Password" : ""}`;
            btn.onclick = () => onJoin(r.name, r.isPrivate);
            li.appendChild(btn);
            this.$roomList.appendChild(li);
        });
    }

    showUsers(users, isOwner, onKick, onBan) {
        this.$userList.innerHTML = "";

        // get user list
        users.forEach(u => {
            const li = document.createElement("li");
            li.textContent = u;


            // only show kick or ban for owners and not self
            if (isOwner && u !== App.instance.nickname) 
            {
                // kick button
                const kick = document.createElement("button");
                kick.textContent = "Kick";
                kick.onclick = () => onKick(u);

                // ban button
                const ban = document.createElement("button");
                ban.textContent = "Ban";
                ban.onclick = () => onBan(u);
                li.append(" ", kick, ban);
            }
            this.$userList.appendChild(li);
        });
    }

    // add message to chat box
    addMessage(msg, isPrivate = false, to = null) {
        const div = document.createElement("div");
        div.className = "msg";
        const prefix = isPrivate ? "[PM] " : "";
        const target = to ? ` → ${to}` : "";
        div.textContent = `${prefix}${msg.from}${target}: ${msg.text}`;
        this.$messages.appendChild(div);
        this.$messages.scrollTop = this.$messages.scrollHeight;
    }


    clearMessages() {
        this.$messages.innerHTML = "";
    }
}

class SocketClient {
    constructor(ui) {
        this.socket = io();
        this.ui = ui;
        this.currentRoom = null;
        this.isOwner = false;
        this.registerHandlers();
    }

    // register socket event handler
    registerHandlers() {
        this.socket.on("lobby:rooms", rooms =>

            this.ui.showRooms(rooms, (name, priv) => {
                if (priv) 
                {
                    const pass = prompt("Password?");
                    this.joinRoom(name, pass || "");
                } 
                else 
                {
                    this.joinRoom(name, "");
                }
                    
            })
        );

        this.socket.on("room:users", list =>
            this.ui.showUsers(list, this.isOwner,
                u => this.kickUser(u),
                u => this.banUser(u)
            )
        );


        this.socket.on("chat:public", msg => this.ui.addMessage(msg));


        this.socket.on("chat:private", msg =>
            this.ui.addMessage(msg, true, msg.to)
        );

        // kick notification
        this.socket.on("room:kicked", ({ room }) => {
            alert(`You were kicked from ${room}`);
            this.leaveRoom();
        });

        // ban notification
        this.socket.on("room:banned", ({ room }) => {
            alert(`You were banned from ${room}`);
            this.leaveRoom();
        });
    }

    login(nickname) {
        this.socket.emit("login", nickname, res => {
            if (!res.ok)
            {
                return (this.ui.$loginError.textContent = res.error);
            } 
            
            // successful login
            App.instance.nickname = nickname;
            
            // store nickname locally
            localStorage.setItem("nickname", nickname);
            this.ui.showApp();
        });
    }

    createRoom(name, isPrivate, password) {
        this.socket.emit("room:create", { name, isPrivate, password }, res => {
            if (!res.ok)
            {
                alert(res.error);
            } 
        });
    }

    joinRoom(name, password) {
        this.socket.emit("room:join", { name, password }, res => {
            if (!res.ok)
            {
                return alert(res.error);
            } 

            // successfully joined
            this.currentRoom = name;
            this.isOwner = App.instance.nickname === res.owner;
            this.ui.$roomTitle.textContent = name;

            // enable leave button except in lobby
            document.getElementById("leaveBtn").disabled = false;
            this.ui.clearMessages();
        });
    }

    leaveRoom() {
        this.socket.emit("room:leave");
        this.currentRoom = "lobby"; 
        this.isOwner = false;
        this.ui.$roomTitle.textContent = "Lobby";

        // disable leave in lobby since you can't leave lobby
        document.getElementById("leaveBtn").disabled = true; 
        this.ui.clearMessages();
    }

    sendMessage(text) {
        // check for private message command
        if (text.startsWith("/pm ")) 
        {
            const [, user, ...rest] = text.split(" ");
            this.socket.emit("chat:send", { text: rest.join(" "), to: user });
        } 
        else 
        {
            this.socket.emit("chat:send", { text });
        }
    }

    kickUser(user) {
        this.socket.emit("room:kick", { targetNickname: user });
    }

    banUser(user) {
        this.socket.emit("room:ban", { targetNickname: user });
    }

    
    }

class App {
    constructor() {
        App.instance = this;
        this.ui = new UIManager();
        this.client = new SocketClient(this.ui);
        this.nickname = localStorage.getItem("nickname") || null;
        this.bindEvents();

        if (this.nickname) {
            // auto login if stored in cache
            this.client.login(this.nickname);
        }
    }


    bindEvents() {
        // login
        document.getElementById("loginForm").onsubmit = e => {
            e.preventDefault();
            this.client.login(this.ui.$nickname.value.trim());
        };

        // create room
        document.getElementById("createForm").onsubmit = e => {
            e.preventDefault();
            const name = document.getElementById("roomName").value.trim();
            const isPrivate = document.getElementById("privateRoom").checked;
            const pass = document.getElementById("roomPass").value;
            this.client.createRoom(name, isPrivate, pass);
        };

        // leave room
        document.getElementById("leaveBtn").onclick = () => this.client.leaveRoom();

        // send message
        document.getElementById("msgForm").onsubmit = e => {
            e.preventDefault();
            const input = document.getElementById("msgInput");
            const text = input.value.trim();
            if (text) this.client.sendMessage(text);
            input.value = "";
        };
    }
}

window.addEventListener("DOMContentLoaded", () => new App());
