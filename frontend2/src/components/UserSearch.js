import React, { useState } from 'react';

function UserSearch({ contract, viewProfile }) {
  const [username, setUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    try {
      setSearching(true);
      setError('');
      setSearchResult(null);
      
      // Search user by username
      const user = await contract.searchUserByUsername(username);
      
      if (user.exists) {
        setSearchResult({
          id: user.id.toNumber(),
          username: user.username,
          bio: user.bio,
          profileImageHash: user.profileImageHash,
          userAddress: user.userAddress,
          followerCount: user.followerCount.toNumber(),
          followingCount: user.followingCount.toNumber(),
          rewardsBalance: user.rewardsBalance.toString()
        });
      } else {
        setError('User not found');
      }
      
      setSearching(false);
    } catch (error) {
      console.error('Error searching for user:', error);
      setError('User not found');
      setSearching(false);
    }
  };

  return (
    <div className="user-search">
      <h2>Search Users</h2>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <button type="submit" disabled={searching || !username.trim()}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {error && <p className="error-message">{error}</p>}
      
      {searchResult && (
        <div className="search-result">
          <div className="user-card" onClick={() => viewProfile(searchResult.userAddress)}>
            <div className="user-image">
              {searchResult.profileImageHash ? (
                <img 
                  src={`https://ipfs.io/ipfs/${searchResult.profileImageHash}`} 
                  alt={searchResult.username} 
                />
              ) : (
                <div className="default-avatar">{searchResult.username.charAt(0)}</div>
              )}
            </div>
            <div className="user-info">
              <h3>{searchResult.username}</h3>
              <p className="user-bio">{searchResult.bio}</p>
              <div className="user-stats">
                <span>{searchResult.followerCount} followers</span>
                <span>{searchResult.followingCount} following</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSearch;