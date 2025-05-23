// components/ChatPage.js
import React, { useState } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import './ChatPage.css';

function ChatPage({ contract, account }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const handleSelectConversation = (conversationId, participant) => {
    setSelectedConversation(conversationId);
    setSelectedParticipant(participant);
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSelectedParticipant(null);
  };

  return (
    <div className="chat-page">
      {selectedConversation ? (
        <ChatWindow 
          contract={contract}
          account={account}
          conversationId={selectedConversation}
          participant={selectedParticipant}
          onBack={handleBack}
        />
      ) : (
        <ChatList 
          contract={contract}
          account={account}
          onSelectConversation={handleSelectConversation}
        />
      )}
    </div>
  );
}

export default ChatPage;