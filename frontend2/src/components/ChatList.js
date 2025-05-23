// components/ChatList.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './ChatList.css';

function ChatList({ contract, account, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    
    // Set up event listener for new messages
    if (contract) {
      contract.on("MessageSent", (conversationId, sender, receiver, messageId, timestamp) => {
        if (sender.toLowerCase() === account.toLowerCase() || 
            receiver.toLowerCase() === account.toLowerCase()) {
          loadConversations();
        }
      });
      
      // Clean up listeners
      return () => {
        contract.removeAllListeners("MessageSent");
      };
    }
  }, [contract, account]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const conversationIds = await contract.getUserConversations();
      
      const conversationPromises = conversationIds.map(async (id) => {
        const conversation = await contract.getConversationDetails(id);
        const otherParticipant = await contract.getConversationParticipant(id);
        const otherUser = await contract.usersByAddress(otherParticipant);
        const unreadCount = await contract.getUnreadMessageCount(id);
        
        return {
          id: id.toString(),
          lastMessageTime: new Date(conversation.lastMessageTimestamp.toNumber() * 1000),
          participant: {
            address: otherParticipant,
            username: otherUser.username,
            profileImageHash: otherUser.profileImageHash
          },
          unreadCount: unreadCount.toNumber()
        };
      });
      
      const conversationData = await Promise.all(conversationPromises);
      
      // Sort by last message time (most recent first)
      conversationData.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      
      setConversations(conversationData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading conversations:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="chat-list loading">Loading conversations...</div>;
  }

  return (
    <div className="chat-list">
      <h2>Conversations</h2>
      {conversations.length === 0 ? (
        <p>No conversations yet. Start following users to chat with them!</p>
      ) : (
        <ul>
          {conversations.map((conversation) => (
            <li 
              key={conversation.id} 
              onClick={() => onSelectConversation(conversation.id, conversation.participant)}
              className="conversation-item"
            >
              <div className="profile-image">
                {conversation.participant.profileImageHash ? (
                  <img 
                    src={`https://ipfs.io/ipfs/${conversation.participant.profileImageHash}`} 
                    alt={conversation.participant.username} 
                  />
                ) : (
                  <div className="default-avatar">{conversation.participant.username.charAt(0)}</div>
                )}
              </div>
              <div className="conversation-info">
                <span className="username">{conversation.participant.username}</span>
                <span className="time">
                  {conversation.lastMessageTime.toLocaleDateString()} {conversation.lastMessageTime.toLocaleTimeString()}
                </span>
              </div>
              {conversation.unreadCount > 0 && (
                <div className="unread-badge">{conversation.unreadCount}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ChatList;