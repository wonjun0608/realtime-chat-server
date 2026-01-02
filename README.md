
## Credits
This project was developed collaboratively with **EunHo Lee**
(GitHub: [AdvancedUno]

Link : http://ec2-18-222-197-42.us-east-2.compute.amazonaws.com:3456/

## Overview
This project is a real-time, multi-room chat application built with Node.js and
Socket.IO. Users can join a lobby, create or join chat rooms, and communicate
instantly through a single-page interface. All messages and events are delivered
in real time without page refreshes, providing a smooth and responsive chatting
experience similar to modern messaging platforms.

## Key Features
- Real-time messaging using WebSockets (Socket.IO)
- Lobby system with dynamic room creation and joining
- Live user list updates per room
- Single-page chat interface with instant updates

## Extended Features

### Reply to a Specific Message
Users can reply to any specific message, including their own or someone else’s.
Each message includes a reply icon (↩️). When replying, the original message is
shown faintly above the input box to provide context. Clicking this quoted text
smoothly scrolls the chat to the original message and highlights it, making
conversation threads easy to follow.

### Typing Indicator
When a user starts typing, the client detects the input and sends a “typing”
event to the server via Socket.IO. The server then broadcasts this event to other
users in the same room. A message such as “[Nickname] is typing…” appears above
the input box and automatically disappears after about 2.2 seconds of inactivity,
reappearing if the user resumes typing.

### Sound Notification
When a new message is sent by another user in the same room, a short notification
sound is played using audio from the Google Actions Sound Library. To avoid
unnecessary distractions, sounds are only played for rooms the user has already
joined.

### Message Deletion
Users can delete only their own messages. When a message is deleted, it is removed
for all users in the room and replaced with a subtle “message deleted” indicator,
clearly showing that a message existed without revealing its content.

## Technical Highlights
- Event-driven architecture using Socket.IO for real-time communication
- Server-managed room and user state to ensure consistency across clients
- Fine-grained event handling for typing indicators, replies, and deletions
- Client-side UI updates synchronized with server broadcasts
- Clear separation between server logic and client-side interaction handling

## Tech Stack
- Node.js
- Socket.IO
- JavaScript (Client & Server)
- HTML / CSS

