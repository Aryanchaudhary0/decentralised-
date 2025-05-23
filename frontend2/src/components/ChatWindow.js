// components/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import './ChatWindow.css';

function ChatWindow({ contract, account, conversationId, participant, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      
      // Set up event listener for new messages
      contract.on("MessageSent", (convId, sender, receiver, messageId, timestamp) => {
        if (convId.toString() === conversationId) {
          loadMessages();
        }
      });
      
      // Clean up listeners
      return () => {
        contract.removeAllListeners("MessageSent");
      };
    }
  }, [contract, conversationId, account]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const messageData = await contract.getConversationMessages(conversationId);
      
      const formattedMessages = messageData.map(message => ({
        id: message.id.toString(),
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        timestamp: new Date(message.timestamp.toNumber() * 1000),
        isRead: message.isRead,
        isMine: message.sender.toLowerCase() === account.toLowerCase()
      }));
      
      setMessages(formattedMessages);
      setLoading(false);
      
      // Mark unread messages as read
      markMessagesAsRead(formattedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (msgs) => {
    try {
      const unreadMessages = msgs.filter(
        msg => !msg.isRead && msg.receiver.toLowerCase() === account.toLowerCase()
      );
      
      for (const msg of unreadMessages) {
        await contract.markMessageAsRead(conversationId, msg.id);
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      const tx = await contract.sendMessage(participant.address, newMessage);
      await tx.wait();
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Make sure you are following each other.");
    }
  };

  if (loading) {
    return <div className="chat-window loading">Loading messages...</div>;
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button onClick={onBack} className="back-button">←</button>
        <div className="participant-info">
          {participant.profileImageHash ? (
            <img 
              src={`https://ipfs.io/ipfs/${participant.profileImageHash}`} 
              alt={participant.username} 
              className="participant-avatar"
            />
          ) : (
            <div className="default-avatar">{participant.username.charAt(0)}</div>
          )}
          <span className="participant-username">{participant.username}</span>
        </div>
      </div>
      
      <div className="message-list">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.isMine ? 'sent' : 'received'}`}
            >
              <div className="message-content">{message.content}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()} {message.timestamp.toLocaleDateString()}
                {message.isMine && (
                  <span className="read-status">
                    {message.isRead ? ' ✓✓' : ' ✓'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
}

export default ChatWindow;