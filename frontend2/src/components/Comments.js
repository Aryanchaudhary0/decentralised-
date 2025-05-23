import React, { useState, useEffect, useCallback } from 'react';

function Comments({ postId, contract }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const commentsData = await contract.getPostComments(postId);
      
      const formattedComments = await Promise.all(commentsData.map(async (comment) => {
        // Get user data for the comment author
        const userData = await contract.usersByAddress(comment.author);
        
        return {
          id: comment.id.toNumber(),
          author: comment.author,
          authorName: userData.username,
          content: comment.content,
          timestamp: new Date(comment.timestamp.toNumber() * 1000)
        };
      }));
      
      // Sort comments by oldest first
      formattedComments.sort((a, b) => a.timestamp - b.timestamp);
      
      setComments(formattedComments);
      setLoading(false);
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('Failed to load comments');
      setLoading(false);
    }
  }, [contract, postId]);

  useEffect(() => {
    loadComments();
    
    // Set up event listener for new comments
    if (contract) {
      contract.on('CommentAdded', (commentPostId, author, content, timestamp) => {
        if (commentPostId.toNumber() === postId) {
          loadComments();
        }
      });
      
      return () => {
        contract.removeAllListeners('CommentAdded');
      };
    }
  }, [contract, postId, loadComments]); // loadComments to dependency array

  const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="comments loading">Loading comments...</div>;
  }

  if (error) {
    return <div className="comments error">{error}</div>;
  }

  return (
    <div className="comments">
      {comments.length === 0 ? (
        <p className="no-comments">No comments yet. Be the first to comment!</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <span className="comment-author">{comment.authorName}</span>
              <span className="comment-time">{formatDate(comment.timestamp)}</span>
            </div>
            <div className="comment-content">{comment.content}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default Comments;