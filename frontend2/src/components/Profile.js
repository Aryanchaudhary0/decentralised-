import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import Post from './Post';

function Profile({ contract, account, profileAddress, currentUser, viewProfile }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get user profile data
      const profileData = await contract.usersByAddress(profileAddress);
      setProfile({
        id: profileData.id.toNumber(),
        username: profileData.username,
        bio: profileData.bio,
        profileImageHash: profileData.profileImageHash,
        followerCount: profileData.followerCount.toNumber(),
        followingCount: profileData.followingCount.toNumber(),
        rewardsBalance: ethers.utils.formatEther(profileData.rewardsBalance)
      });
      
      // Check if current user is following this profile
      if (account !== profileAddress) {
        const followStatus = await contract.isFollowing(account, profileAddress);
        setIsFollowing(followStatus);
      }
      
      // Get posts by this user
      const userPostIds = await contract.getUserPostIds(profileAddress);
      
      const postPromises = userPostIds.map(id => contract.posts(id));
      const postsData = await Promise.all(postPromises);
      
      // Format posts
      const formattedPosts = await Promise.all(postsData.map(async (post) => {
        const hasLiked = await contract.hasLiked(account, post.id);
        const hasShared = await contract.hasShared(account, post.id);
        
        return {
          id: post.id.toNumber(),
          author: post.author,
          authorName: profileData.username,
          authorImage: profileData.profileImageHash,
          content: post.content,
          mediaHash: post.mediaHash,
          likeCount: post.likeCount.toNumber(),
          commentCount: post.commentCount.toNumber(),
          shareCount: post.shareCount.toNumber(),
          rewardAmount: post.rewardAmount.toString(),
          timestamp: new Date(post.timestamp.toNumber() * 1000),
          hasLiked,
          hasShared
        };
      }));
      
      // Sort posts by newest first
      formattedPosts.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(formattedPosts);
      
      // Get followers
      const followerAddresses = await contract.getFollowers(profileAddress);
      setFollowers(followerAddresses);
      
      // Get following
      const followingAddresses = await contract.getFollowing(profileAddress);
      setFollowing(followingAddresses);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile data');
      setLoading(false);
    }
  }, [contract, profileAddress, account]); // Include all dependencies used in this function

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]); // Now loadProfileData is memoized with useCallback and included in dependencies

  const handleFollow = async () => {
    try {
      setLoading(true);
      
      if (isFollowing) {
        const tx = await contract.unfollowUser(profileAddress);
        await tx.wait();
      } else {
        const tx = await contract.followUser(profileAddress);
        await tx.wait();
      }
      
      loadProfileData();
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      setError('Transaction failed');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="profile loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="profile error">{error}</div>;
  }

  if (!profile) {
    return <div className="profile error">Profile not found</div>;
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-image">
          {profile.profileImageHash ? (
            <img src={`https://ipfs.io/ipfs/${profile.profileImageHash}`} alt={profile.username} />
          ) : (
            <div className="default-avatar">{profile.username.charAt(0)}</div>
          )}
        </div>
        
        <div className="profile-info">
          <h2>{profile.username}</h2>
          <p className="bio">{profile.bio}</p>
          
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{posts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.followerCount}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.followingCount}</span>
              <span className="stat-label">Following</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.rewardsBalance}</span>
              <span className="stat-label">ETH Rewards</span>
            </div>
          </div>
          
          {account !== profileAddress && (
            <button 
              className={`follow-button ${isFollowing ? 'following' : ''}`}
              onClick={handleFollow}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </div>
      
      <div className="profile-content">
        <h3>Posts</h3>
        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          posts.map((post) => (
            <Post 
              key={post.id} 
              post={post} 
              contract={contract} 
              account={account}
              viewProfile={viewProfile}
              refreshFeed={loadProfileData}
            />
          ))
        )}
      </div>
      
      <div className="profile-connections">
        <div className="followers-section">
          <h3>Followers</h3>
          {followers.length === 0 ? (
            <p>No followers yet.</p>
          ) : (
            <div className="connections-grid">
              {followers.map((follower, index) => (
                <div 
                  key={index} 
                  className="connection-item"
                  onClick={() => viewProfile(follower)}
                >
                  {follower.substring(0, 6)}...{follower.substring(follower.length - 4)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="following-section">
          <h3>Following</h3>
          {following.length === 0 ? (
            <p>Not following anyone yet.</p>
          ) : (
            <div className="connections-grid">
              {following.map((followedUser, index) => (
                <div 
                  key={index} 
                  className="connection-item"
                  onClick={() => viewProfile(followedUser)}
                >
                  {followedUser.substring(0, 6)}...{followedUser.substring(followedUser.length - 4)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;