import React, { useState } from 'react';
import { ethers } from 'ethers';
import Comments from './Comments';

function Post({ post, contract, account, viewProfile, refreshFeed }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleLike = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      
      if (post.hasLiked) {
        const tx = await contract.unlikePost(post.id);
        await tx.wait();
      } else {
        const tx = await contract.likePost(post.id);
        await tx.wait();
      }
      
      refreshFeed();
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error liking/unliking post:', error);
      setError('Transaction failed');
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      if (post.hasShared) return;
      
      setIsSubmitting(true);
      setError('');
      
      const tx = await contract.sharePost(post.id);
      await tx.wait();
      
      refreshFeed();
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error sharing post:', error);
      setError('Transaction failed');
      setIsSubmitting(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const tx = await contract.addComment(post.id, commentText);
      await tx.wait();
      
      setCommentText('');
      setIsSubmitting(false);
      refreshFeed();
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Comment failed');
      setIsSubmitting(false);
    }
  };

  const handleReward = async (e) => {
    e.preventDefault();
    if (!rewardAmount || parseFloat(rewardAmount) <= 0) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const valueInWei = ethers.utils.parseEther(rewardAmount);
      const tx = await contract.sendReward(post.id, { value: valueInWei });
      await tx.wait();
      
      setRewardAmount('');
      setIsSubmitting(false);
      refreshFeed();
    } catch (error) {
      console.error('Error sending reward:', error);
      setError('Failed to send reward');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="post">
      <div className="post-header">
        <div className="post-author" onClick={() => viewProfile(post.author)}>
          <div className="author-image">
            {post.authorImage ? (
              <img src={`https://ipfs.io/ipfs/${post.authorImage}`} alt={post.authorName} />
            ) : (
              <div className="default-avatar">{post.authorName.charAt(0)}</div>
            )}
          </div>
          <div className="author-name">{post.authorName}</div>
        </div>
        <div className="post-time">{formatDate(post.timestamp)}</div>
      </div>
      
      <div className="post-content">{post.content}</div>
      
      {post.mediaHash && (
        <div className="post-media">
          <img src={`https://ipfs.io/ipfs/${post.mediaHash}`} alt="Post media" />
        </div>
      )}
      
      <div className="post-stats">
        <span>{post.likeCount} likes</span>
        <span>{post.commentCount} comments</span>
        <span>{post.shareCount} shares</span>
        {post.rewardAmount !== '0' && (
          <span>{ethers.utils.formatEther(post.rewardAmount)} ETH rewards</span>
        )}
      </div>
      
      <div className="post-actions">
        <button 
          onClick={handleLike} 
          disabled={isSubmitting}
          className={post.hasLiked ? 'active' : ''}
        >
          {post.hasLiked ? 'Unlike' : 'Like'}
        </button>
        <button onClick={() => setShowComments(!showComments)}>
          {showComments ? 'Hide Comments' : 'Comments'}
        </button>
        <button 
          onClick={handleShare} 
          disabled={isSubmitting || post.hasShared}
          className={post.hasShared ? 'active' : ''}
        >
          {post.hasShared ? 'Shared' : 'Share'}
        </button>
      </div>
      
      {error && <p className="error-message">{error}</p>}
      
      <div className="reward-form">
        <form onSubmit={handleReward}>
          <input
            type="number"
            step="0.01"
            placeholder="ETH amount"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting}>Reward</button>
        </form>
      </div>
      
      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting}>Comment</button>
          </form>
          
          <Comments postId={post.id} contract={contract} />
        </div>
      )}
    </div>
  );
}

export default Post;