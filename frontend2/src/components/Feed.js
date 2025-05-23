import React, { useState, useEffect, useCallback } from 'react';
import Post from './Post';

function Feed({ contract, account, viewProfile }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get total number of posts
      const totalPosts = await contract.getTotalPosts();
      
      // Get all posts (in a real app, you'd paginate this)
      const postPromises = [];
      for (let i = 1; i <= totalPosts.toNumber(); i++) {
        postPromises.push(contract.posts(i));
      }
      
      const postsData = await Promise.all(postPromises);
      
      // Transform posts data into a more usable format
      const formattedPosts = await Promise.all(postsData.map(async (post) => {
        // Get user data for each post author
        const userData = await contract.usersByAddress(post.author);
        
        // Check if the current user has liked/shared this post
        const hasLiked = await contract.hasLiked(account, post.id);
        const hasShared = await contract.hasShared(account, post.id);
        
        return {
          id: post.id.toNumber(),
          author: post.author,
          authorName: userData.username,
          authorImage: userData.profileImageHash,
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
      setLoading(false);
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts');
      setLoading(false);
    }
  }, [contract, account]); // Include all dependencies used in this function

  // Load posts on component mount
  useEffect(() => {
    loadPosts();
    
    // Set up event listener for new posts
    if (contract) {
      contract.on('PostCreated', (id, author, content, timestamp) => {
        loadPosts();
      });
      
      return () => {
        contract.removeAllListeners('PostCreated');
      };
    }
  }, [contract, loadPosts]); // Add loadPosts to dependency array

  if (loading) {
    return <div className="feed loading">Loading posts...</div>;
  }

  if (error) {
    return <div className="feed error">{error}</div>;
  }

  return (
    <div className="feed">
      <h2>Latest Posts</h2>
      {posts.length === 0 ? (
        <p>No posts yet. Be the first to post!</p>
      ) : (
        posts.map((post) => (
          <Post 
            key={post.id}
            post={post}
            contract={contract}
            account={account}
            viewProfile={viewProfile}
            refreshFeed={loadPosts}
          />
        ))
      )}
    </div>
  );
}

export default Feed;