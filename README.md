[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/hu2d5PMB)
# CSE3300
EunHo Lee 605739 AdvancedUno

Wonjun Kim - 605200 - wonjun0608


Creative Portion:

1. Reply to a Specific Message

You can reply to any specific message either your own or someone else's.
Next to each message, there is a curved reply arrow (↩️). When you click it, the message you are replying to will appear faintly above your typing box, and your reply will be sent to the chat. 
Also, if you click on that faint quoted text in your reply, the chat will smoothly scroll up and highlight the original message. So you can easily see which message you were replying to.

2. Typing Indicator

When someone starts typing, the app detects the input using an event listener and sends a "typing" signal to the server through Socket.IO.
The server then broadcasts this signal to everyone in the same room. So, in the chatting room, a small message such as “[Nickname] is typing...” appears above the writing message box, letting others know that the person is typing. The indicator stays visible for about 2.2 seconds, automatically disappears when the user stops typing,
and reappears again if they start typing once more.

3. Sound Notification
   
When another user in the same room sends a new message, you will hear a short sound effect downloaded from the Google Actions Sound Library.
But, if you haven’t joined that room before, you won’t hear any sound — this keeps notifications limited to the rooms you are currently active in.

4. Message Deletion

Users can delete only their own messages(not others meesage). When a message is deleted, it disappears for everyone in the same room
and is replaced by the text “message deleted” in a lighter color.




<br><br><br><br><br><br><br><br><br>
Rubric

| Possible | Requirement                                                                     | 
|----------|---------------------------------------------------------------------------------|
| 5        | Users can create chat rooms with an arbitrary room name                         |             
| 5        | Users can join an arbitrary room                                                |             
| 5        | Chatroom displays a list of users in the room                                   |             
| 5        | Private, password protected rooms can be created                                |             
| 3        | Creators of room can temporarily kick users from the room                       |             
| 2        | Creators of room can permanently ban users from the room                        |             
| 1        | A user's message shows their username and is sent to everyone in the room       |             
| 4        | Users can send private messages to other users in the room                      |             
| 2        | Code is well-formated and easy to read                                          |             
| 2        | Site passes the [HTML5 validator](https://validator.w3.org/)                    |             
| 0.5      | `package.json` is included, with all dependencies needed to run the application |             
| 0.5      | `node_modules` is ignored by git using a `.gitignore` file                      |             
| 4        | Communicating with others and joining rooms is easy and intuitive               |             
| 1        | Site is visually appealing                                                      |             

## Creative Portion (10 possible)
