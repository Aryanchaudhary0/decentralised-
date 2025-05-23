import React from 'react';

function Navbar({ account, currentUser, setView }) {
  return (
    <nav className="navbar">
      <div className="logo">
        <h1>DecentralSocial</h1>
      </div>
      
      {currentUser && (
        <div className="nav-links">
          <button onClick={() => setView('feed')}>Feed</button>
          <button onClick={() => setView('profile')}>My Profile</button>
          <button onClick={() => setView('search')}>Search Users</button>
        </div>
      )}
      
      <div className="wallet-info">
        {account ? (
          <div className="connected-account">
            <span className="dot green"></span>
            <span className="account-text">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
          </div>
        ) : (
          <div className="disconnected-account">
            <span className="dot red"></span>
            <span>Not Connected</span>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;