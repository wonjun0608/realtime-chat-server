
Partner:
EunHo Lee, Github id: AdvancedUno

Link : http://ec2-18-222-197-42.us-east-2.compute.amazonaws.com:3456/

<br><br>
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

         

#
