// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SocialMedia is Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _postIds;
    Counters.Counter private _userIds;
    Counters.Counter private _messageIds;
    
    struct User {
        uint256 id;
        string username;
        string bio;
        string profileImageHash; // IPFS hash
        address userAddress;
        uint256 followerCount;
        uint256 followingCount;
        uint256 rewardsBalance;
        bool exists;
    }
    
    struct Post {
        uint256 id;
        address author;
        string content;
        string mediaHash; // IPFS hash for images/videos
        uint256 likeCount;
        uint256 commentCount;
        uint256 shareCount;
        uint256 rewardAmount;
        uint256 timestamp;
        bool exists;
    }
    
    struct Comment {
        uint256 id;
        uint256 postId;
        address author;
        string content;
        uint256 timestamp;
    }
    
    struct Message {
        uint256 id;
        address sender;
        address receiver;
        string content;
        uint256 timestamp;
        bool isRead;
    }
    
    mapping(address => User) public usersByAddress;
    mapping(string => address) public addressesByUsername;
    mapping(uint256 => User) public usersById;
    
    mapping(uint256 => Post) public posts;
    mapping(address => uint256[]) public userPosts;
    
    mapping(uint256 => Comment[]) public postComments;
    mapping(address => mapping(uint256 => bool)) public postLikes;
    mapping(address => mapping(uint256 => bool)) public postShares;
    
    mapping(address => mapping(address => bool)) public following;
    mapping(address => address[]) public followers;
    mapping(address => address[]) public followings;
    
    // Chat-related mappings
    mapping(uint256 => Message) public messages;
    mapping(address => mapping(address => uint256[])) public chatHistory;
    mapping(address => address[]) public recentChats;
    mapping(address => mapping(address => uint256)) public unreadMessageCounts;
    
    event UserCreated(uint256 id, string username, address userAddress);
    event PostCreated(uint256 id, address author, string content, uint256 timestamp);
    event CommentAdded(uint256 postId, address author, string content, uint256 timestamp);
    event PostLiked(uint256 postId, address user);
    event PostShared(uint256 postId, address user);
    event Followed(address follower, address followed);
    event Unfollowed(address follower, address followed);
    event RewardSent(address from, address to, uint256 postId, uint256 amount);
    
    // Chat-related events
    event MessageSent(uint256 messageId, address sender, address receiver, uint256 timestamp);
    event MessageRead(uint256 messageId, address reader);
    
    function createUser(string memory _username, string memory _bio, string memory _profileImageHash) public {
        require(!usersByAddress[msg.sender].exists, "User already exists");
        require(addressesByUsername[_username] == address(0), "Username already taken");
        
        _userIds.increment();
        uint256 newUserId = _userIds.current();
        
        User memory newUser = User({
            id: newUserId,
            username: _username,
            bio: _bio,
            profileImageHash: _profileImageHash,
            userAddress: msg.sender,
            followerCount: 0,
            followingCount: 0,
            rewardsBalance: 0,
            exists: true
        });
        
        usersByAddress[msg.sender] = newUser;
        addressesByUsername[_username] = msg.sender;
        usersById[newUserId] = newUser;
        
        emit UserCreated(newUserId, _username, msg.sender);
    }
    
    function createPost(string memory _content, string memory _mediaHash) public {
        require(usersByAddress[msg.sender].exists, "User does not exist");
        
        _postIds.increment();
        uint256 newPostId = _postIds.current();
        
        Post memory newPost = Post({
            id: newPostId,
            author: msg.sender,
            content: _content,
            mediaHash: _mediaHash,
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            rewardAmount: 0,
            timestamp: block.timestamp,
            exists: true
        });
        
        posts[newPostId] = newPost;
        userPosts[msg.sender].push(newPostId);
        
        emit PostCreated(newPostId, msg.sender, _content, block.timestamp);
    }
    
    function addComment(uint256 _postId, string memory _content) public {
        require(posts[_postId].exists, "Post does not exist");
        require(usersByAddress[msg.sender].exists, "User does not exist");
        
        Comment memory newComment = Comment({
            id: postComments[_postId].length,
            postId: _postId,
            author: msg.sender,
            content: _content,
            timestamp: block.timestamp
        });
        
        postComments[_postId].push(newComment);
        posts[_postId].commentCount++;
        
        emit CommentAdded(_postId, msg.sender, _content, block.timestamp);
    }
    
    function likePost(uint256 _postId) public {
        require(posts[_postId].exists, "Post does not exist");
        require(usersByAddress[msg.sender].exists, "User does not exist");
        require(!postLikes[msg.sender][_postId], "Post already liked");
        
        postLikes[msg.sender][_postId] = true;
        posts[_postId].likeCount++;
        
        emit PostLiked(_postId, msg.sender);
    }
    
    function unlikePost(uint256 _postId) public {
        require(posts[_postId].exists, "Post does not exist");
        require(postLikes[msg.sender][_postId], "Post not liked yet");
        
        postLikes[msg.sender][_postId] = false;
        posts[_postId].likeCount--;
    }
    
    function sharePost(uint256 _postId) public {
        require(posts[_postId].exists, "Post does not exist");
        require(usersByAddress[msg.sender].exists, "User does not exist");
        require(!postShares[msg.sender][_postId], "Post already shared");
        
        postShares[msg.sender][_postId] = true;
        posts[_postId].shareCount++;
        
        emit PostShared(_postId, msg.sender);
    }
    
    function followUser(address _userToFollow) public {
        require(usersByAddress[_userToFollow].exists, "User to follow does not exist");
        require(usersByAddress[msg.sender].exists, "You need to create a profile first");
        require(msg.sender != _userToFollow, "Cannot follow yourself");
        require(!following[msg.sender][_userToFollow], "Already following this user");
        
        following[msg.sender][_userToFollow] = true;
        followers[_userToFollow].push(msg.sender);
        followings[msg.sender].push(_userToFollow);
        
        usersByAddress[_userToFollow].followerCount++;
        usersByAddress[msg.sender].followingCount++;
        
        emit Followed(msg.sender, _userToFollow);
    }
    
    function unfollowUser(address _userToUnfollow) public {
        require(following[msg.sender][_userToUnfollow], "Not following this user");
        
        following[msg.sender][_userToUnfollow] = false;
        
        for (uint i = 0; i < followers[_userToUnfollow].length; i++) {
            if (followers[_userToUnfollow][i] == msg.sender) {
                followers[_userToUnfollow][i] = followers[_userToUnfollow][followers[_userToUnfollow].length - 1];
                followers[_userToUnfollow].pop();
                break;
            }
        }
        
        for (uint i = 0; i < followings[msg.sender].length; i++) {
            if (followings[msg.sender][i] == _userToUnfollow) {
                followings[msg.sender][i] = followings[msg.sender][followings[msg.sender].length - 1];
                followings[msg.sender].pop();
                break;
            }
        }
        
        usersByAddress[_userToUnfollow].followerCount--;
        usersByAddress[msg.sender].followingCount--;
        
        emit Unfollowed(msg.sender, _userToUnfollow);
    }
    
    function sendReward(uint256 _postId) public payable {
        require(posts[_postId].exists, "Post does not exist");
        require(msg.value > 0, "Reward amount must be greater than 0");
        
        address postAuthor = posts[_postId].author;
        
        posts[_postId].rewardAmount += msg.value;
        usersByAddress[postAuthor].rewardsBalance += msg.value;
        
        // Transfer ETH to post author
        (bool sent, ) = payable(postAuthor).call{value: msg.value}("");
        require(sent, "Failed to send ETH");
        
        emit RewardSent(msg.sender, postAuthor, _postId, msg.value);
    }
    
    // Chat-related functions
    
    function canChat(address _user1, address _user2) public view returns (bool) {
        // Either user follows the other
        return following[_user1][_user2] || following[_user2][_user1];
    }
    
    function sendMessage(address _receiver, string memory _content) public {
        require(usersByAddress[msg.sender].exists, "Sender does not exist");
        require(usersByAddress[_receiver].exists, "Receiver does not exist");
        require(canChat(msg.sender, _receiver), "Cannot chat with this user. One of you must follow the other.");
        
        _messageIds.increment();
        uint256 newMessageId = _messageIds.current();
        
        Message memory newMessage = Message({
            id: newMessageId,
            sender: msg.sender,
            receiver: _receiver,
            content: _content,
            timestamp: block.timestamp,
            isRead: false
        });
        
        messages[newMessageId] = newMessage;
        chatHistory[msg.sender][_receiver].push(newMessageId);
        chatHistory[_receiver][msg.sender].push(newMessageId);
        
        // Update unread message count for receiver
        unreadMessageCounts[_receiver][msg.sender]++;
        
        // Update recent chats list for sender
        _updateRecentChats(msg.sender, _receiver);
        
        // Update recent chats list for receiver
        _updateRecentChats(_receiver, msg.sender);
        
        emit MessageSent(newMessageId, msg.sender, _receiver, block.timestamp);
    }
    
    function _updateRecentChats(address _user, address _contact) private {
        // Check if contact is already in the recent chats
        bool exists = false;
        for (uint i = 0; i < recentChats[_user].length; i++) {
            if (recentChats[_user][i] == _contact) {
                exists = true;
                
                // Move the contact to the front of the array (most recent)
                if (i > 0) {
                    for (uint j = i; j > 0; j--) {
                        recentChats[_user][j] = recentChats[_user][j-1];
                    }
                    recentChats[_user][0] = _contact;
                }
                break;
            }
        }
        
        // If contact is not in the recent chats, add them
        if (!exists) {
            if (recentChats[_user].length == 0) {
                recentChats[_user].push(_contact);
            } else {
                // Make space by shifting elements
                uint256 currentLength = recentChats[_user].length;
                
                // Limit to 50 recent chats to prevent excessive gas costs
                uint256 maxRecentChats = 50;
                if (currentLength < maxRecentChats) {
                    recentChats[_user].push(address(0)); // Expand array
                    currentLength++;
                }
                
                // Shift elements to make room for the new contact at position 0
                for (uint i = currentLength - 1; i > 0; i--) {
                    recentChats[_user][i] = recentChats[_user][i-1];
                }
                recentChats[_user][0] = _contact;
            }
        }
    }
    
    function markMessageAsRead(uint256 _messageId) public {
        require(messages[_messageId].receiver == msg.sender, "Only the receiver can mark messages as read");
        require(!messages[_messageId].isRead, "Message is already marked as read");
        
        messages[_messageId].isRead = true;
        unreadMessageCounts[msg.sender][messages[_messageId].sender]--;
        
        emit MessageRead(_messageId, msg.sender);
    }
    
    function markAllMessagesAsRead(address _sender) public {
        require(usersByAddress[msg.sender].exists, "User does not exist");
        require(usersByAddress[_sender].exists, "Sender does not exist");
        
        uint256[] memory messageIds = chatHistory[msg.sender][_sender];
        
        for (uint i = 0; i < messageIds.length; i++) {
            uint256 messageId = messageIds[i];
            Message storage message = messages[messageId];
            
            if (message.receiver == msg.sender && !message.isRead) {
                message.isRead = true;
                emit MessageRead(messageId, msg.sender);
            }
        }
        
        unreadMessageCounts[msg.sender][_sender] = 0;
    }
    
    function getMessageById(uint256 _messageId) public view returns (Message memory) {
        require(messages[_messageId].id == _messageId, "Message does not exist");
        return messages[_messageId];
    }
    
    function getChatHistory(address _user1, address _user2) public view returns (uint256[] memory) {
        return chatHistory[_user1][_user2];
    }
    
    function getRecentChats(address _user) public view returns (address[] memory) {
        return recentChats[_user];
    }
    
    function getUnreadMessageCount(address _user, address _sender) public view returns (uint256) {
        return unreadMessageCounts[_user][_sender];
    }
    
    function getTotalUnreadMessages(address _user) public view returns (uint256) {
        uint256 totalUnread = 0;
        address[] memory userRecentChats = recentChats[_user];
        
        for (uint i = 0; i < userRecentChats.length; i++) {
            totalUnread += unreadMessageCounts[_user][userRecentChats[i]];
        }
        
        return totalUnread;
    }
    
    // Existing getter functions
    function getUserPostIds(address _user) public view returns (uint256[] memory) {
        return userPosts[_user];
    }
    
    function getPostComments(uint256 _postId) public view returns (Comment[] memory) {
        return postComments[_postId];
    }
    
    function getFollowers(address _user) public view returns (address[] memory) {
        return followers[_user];
    }
    
    function getFollowing(address _user) public view returns (address[] memory) {
        return followings[_user];
    }
    
    function isFollowing(address _follower, address _followed) public view returns (bool) {
        return following[_follower][_followed];
    }
    
    function hasLiked(address _user, uint256 _postId) public view returns (bool) {
        return postLikes[_user][_postId];
    }
    
    function hasShared(address _user, uint256 _postId) public view returns (bool) {
        return postShares[_user][_postId];
    }
    
    function getTotalPosts() public view returns (uint256) {
        return _postIds.current();
    }
    
    function getTotalUsers() public view returns (uint256) {
        return _userIds.current();
    }
    
    function searchUserByUsername(string memory _username) public view returns (User memory) {
        address userAddress = addressesByUsername[_username];
        require(userAddress != address(0), "User not found");
        return usersByAddress[userAddress];
    }
}