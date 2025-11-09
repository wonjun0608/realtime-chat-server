
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
    div.dataset.id = msg.id;

     if (msg.from === App.instance.nickname) {
        div.classList.add("self");
    } else {
        div.classList.add("other");
    }

    const textWrapper = document.createElement("div");
    textWrapper.className = "msg-text";


    const prefix = isPrivate ? "[PM] " : "";
    const target = to ? ` → ${to}` : "";

    const time = new Date(msg.ts).toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true 
    });


if (msg.replyToText) {
    const quote = document.createElement("div");
    quote.className = "reply-quote";
    quote.textContent = `↩︎ ${msg.replyToFrom}: ${msg.replyToText.slice(0, 40)}${msg.replyToText.length > 40 ? "..." : ""}`;
    quote.style.fontSize = "0.8rem";
    quote.style.opacity = "0.65";
    quote.style.marginBottom = "4px";
    quote.style.padding = "3px 6px";
    quote.style.borderLeft = "3px solid #5da3fa";
    quote.style.borderRadius = "4px";
    quote.style.background = "rgba(255,255,255,0.05)";
    quote.style.cursor = "pointer";
    quote.title = "Click to scroll to original message";


    quote.onclick = () => {
    setTimeout(() => {
        const original = document.querySelector(`[data-id="${msg.replyTo}"]`);
        if (original) {
            original.scrollIntoView({ behavior: "smooth", block: "center" });
            original.style.transition = "background 0.3s ease";
            original.style.background = "rgba(93,163,250,0.2)";
            setTimeout(() => {
                original.style.background = "";
            }, 1600);
        } else {
            console.warn("⚠️ Original message not found:", msg.replyTo);
        }
    }, 100); 
};


    textWrapper.appendChild(quote);
}


    const textSpan = document.createElement("span");
    textSpan.innerHTML = `${prefix}<strong>${msg.from}${target}</strong> ${msg.text}`;


    // Delte emojin. Only for my own's text
    let delBtn = null;
    if (msg.from === App.instance.nickname) {
        delBtn = document.createElement("button");
        delBtn.textContent = "🗑️";
        delBtn.style.marginLeft = "6px";
        delBtn.style.background = "transparent";
        delBtn.style.border = "none";
        delBtn.style.cursor = "pointer";
        delBtn.onclick = () => {
            console.log("[CLIENT] delete click, emit chat:delete", msg.id);
            App.instance.client.socket.emit("chat:delete", { msgId: msg.id });
        };
        textWrapper.appendChild(delBtn);
    }

    // reply button for everyone
        const replyBtn = document.createElement("button");
        replyBtn.textContent = "↩️";
        replyBtn.style.marginLeft = "4px";
        replyBtn.style.background = "transparent";
        replyBtn.style.border = "none";
        replyBtn.style.cursor = "pointer";
        replyBtn.onclick = () => {
            App.instance.replyTarget = {
                id: msg.id,
                text: msg.text,
                from: msg.from
            };
            App.instance.showReplyPreview(msg); 
        };
        textWrapper.appendChild(replyBtn);

   
    textWrapper.prepend(textSpan);


    const timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    timeSpan.textContent = time;

  
    div.appendChild(textWrapper);
    div.appendChild(timeSpan);

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

  
    registerHandlers() {
   
    const sound = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
    //// Sound effect used for incoming messages
    // Source: Google Actions Sound Library (Free-to-use sound effects)
    // URL: https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg

  
    this.socket.on("lobby:rooms", rooms =>
        this.ui.showRooms(rooms, (name, priv) => {
            if (priv) {
                const pass = prompt("Password?");
                this.joinRoom(name, pass || "");
            } else {
                this.joinRoom(name, "");
            }
        })
    );

    

    this.socket.on("room:users", list =>
        this.ui.showUsers(
            list,
            this.isOwner,
            u => this.kickUser(u),
            u => this.banUser(u)
        )
     );

    this.socket.on("chat:deleted", ({ msgId }) => {
    console.log("[CLIENT] chat:deleted received:", msgId);
    const msgEl = document.querySelector(`[data-id="${msgId}"]`);
    if (msgEl) {
        const textSpan = msgEl.querySelector(".msg-text");
        if (textSpan) {
            textSpan.textContent = "message deleted";
        }
        msgEl.style.opacity = "0.6";
    } else {
        console.warn("[CLIENT] message element not found for id:", msgId);
    }
});

   
    this.socket.on("chat:public", msg => {
        this.ui.addMessage(msg);
   
        if (msg.from !== App.instance.nickname) {
            sound.play().catch(() => {});
        }
    });

    this.socket.on("chat:private", msg => {
        this.ui.addMessage(msg, true, msg.to);

        if (msg.from !== App.instance.nickname) {
            sound.play().catch(() => {});
            this.socket.emit("chat:read", { msgId: msg.id });
        }
    });


         
        this.socket.on("chat:history", messages => {
            this.ui.clearMessages(); 
            messages.forEach(msg => this.ui.addMessage(msg)); 
        });

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

        // typing mark notification 
        this.socket.on("typing", ({ nickname, isTyping }) => {
            const indicator = document.getElementById("typingIndicator");

            if (!this.typingUsers) this.typingUsers = new Set();

            if (isTyping) {
                this.typingUsers.add(nickname);
            } else {
                this.typingUsers.delete(nickname);
            }

            if (this.typingUsers.size > 0) {
                const names = Array.from(this.typingUsers).join(", ");
                indicator.textContent = `${names} is typing...`;
            } else {
                indicator.textContent = "";
            }
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
            this.ui.clearMessages(); //issue
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
        // Create message payload to send to the server
        const payload = { text };

        // Handle private message format: "/pm username message"
        if (text.startsWith("/pm ")) {
            const [, user, ...rest] = text.split(" ");
            this.socket.emit("chat:send", { text: rest.join(" "), to: user });
            this.sendTyping(false);
            return;
        }

  
        if (App.instance.replyTarget) {
            payload.replyTo = App.instance.replyTarget.id;
        }

        this.socket.emit("chat:send", payload);

      
        if (App.instance.replyTarget) {
            App.instance.replyTarget = null;
            const rp = document.getElementById("replyPreview");
            if (rp) rp.remove();
        }

        this.sendTyping(false);
    }

    kickUser(user) {
        this.socket.emit("room:kick", { targetNickname: user });
    }

    banUser(user) {
        this.socket.emit("room:ban", { targetNickname: user });
    }
    sendTyping(isTyping) {
        this.socket.emit("typing", { isTyping });
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

    showReplyPreview(msg) {
        let preview = document.getElementById("replyPreview");
        if (!preview) {
            preview = document.createElement("div");
            preview.id = "replyPreview";
            preview.style.background = "rgba(93,163,250,0.15)";
            preview.style.borderLeft = "3px solid #5da3fa";
            preview.style.padding = "4px 8px";
            preview.style.marginBottom = "6px";
            preview.style.fontSize = "0.85rem";
            preview.style.cursor = "pointer";

             // Insert preview box above the message form
            document.querySelector(".msgForm").prepend(preview);

            const msgForm = document.getElementById("msgForm");
            msgForm.parentNode.insertBefore(preview, msgForm);
    
        }

        // Display which message you’re replying to
        preview.textContent = `↩️ replying to ${msg.from}: ${msg.text}`;
        preview.title = "click to cancel";
        preview.onclick = () => {
            this.replyTarget = null;
            preview.remove();
        };
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
     // Creartive protion : recognize typing from someone
        const msgInput = document.getElementById("msgInput");
        let typingTimeout;

        msgInput.addEventListener("input", () => {
            this.client.sendTyping(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => this.client.sendTyping(false), 2200); 
        });
    }
}

window.addEventListener("DOMContentLoaded", () => new App());
