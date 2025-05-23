const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SocialMedia", function () {
  let socialMedia;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy the contract
    const SocialMediaFactory = await ethers.getContractFactory("SocialMedia");
    socialMedia = await SocialMediaFactory.deploy();
  });

  describe("User Management", function () {
    it("Should create a new user", async function () {
      await socialMedia.connect(user1).createUser("user1", "This is my bio", "QmHash1");
      
      const user = await socialMedia.usersByAddress(user1.address);
      expect(user.username).to.equal("user1");
      expect(user.bio).to.equal("This is my bio");
      expect(user.profileImageHash).to.equal("QmHash1");
      expect(user.exists).to.equal(true);
    });

    it("Should not allow duplicate usernames", async function () {
      await socialMedia.connect(user1).createUser("user1", "Bio 1", "QmHash1");
      
      await expect(
        socialMedia.connect(user2).createUser("user1", "Bio 2", "QmHash2")
      ).to.be.revertedWith("Username already taken");
    });

    it("Should not allow creating multiple profiles with same address", async function () {
      await socialMedia.connect(user1).createUser("user1", "Bio 1", "QmHash1");
      
      await expect(
        socialMedia.connect(user1).createUser("anotherUser", "Bio 2", "QmHash2")
      ).to.be.revertedWith("User already exists");
    });

    it("Should search user by username", async function () {
      await socialMedia.connect(user1).createUser("findme", "Search test", "QmHash1");
      
      const user = await socialMedia.searchUserByUsername("findme");
      expect(user.username).to.equal("findme");
      expect(user.userAddress).to.equal(user1.address);
    });

    it("Should revert when searching for non-existent user", async function () {
      await expect(
        socialMedia.searchUserByUsername("nonexistent")
      ).to.be.revertedWith("User not found");
    });
  });

  describe("Post Management", function () {
    beforeEach(async function () {
      // Create users for post tests
      await socialMedia.connect(user1).createUser("poster", "I post stuff", "QmHash1");
      await socialMedia.connect(user2).createUser("commenter", "I comment stuff", "QmHash2");
    });

    it("Should create a new post", async function () {
      await socialMedia.connect(user1).createPost("This is my first post!", "QmMediaHash1");
      
      const postId = 1; // First post should have ID 1
      const post = await socialMedia.posts(postId);
      
      expect(post.author).to.equal(user1.address);
      expect(post.content).to.equal("This is my first post!");
      expect(post.mediaHash).to.equal("QmMediaHash1");
      expect(post.likeCount).to.equal(0);
      expect(post.exists).to.equal(true);
    });

    it("Should not allow non-users to create posts", async function () {
      await expect(
        socialMedia.connect(user3).createPost("Unauthorized post", "QmMediaHash")
      ).to.be.revertedWith("User does not exist");
    });

    it("Should get user post IDs", async function () {
      await socialMedia.connect(user1).createPost("Post 1", "QmMediaHash1");
      await socialMedia.connect(user1).createPost("Post 2", "QmMediaHash2");
      
      const userPosts = await socialMedia.getUserPostIds(user1.address);
      expect(userPosts.length).to.equal(2);
      expect(userPosts[0]).to.equal(1);
      expect(userPosts[1]).to.equal(2);
    });

    it("Should add a comment to a post", async function () {
      await socialMedia.connect(user1).createPost("Post with comments", "QmMediaHash");
      await socialMedia.connect(user2).addComment(1, "Great post!");
      
      const comments = await socialMedia.getPostComments(1);
      expect(comments.length).to.equal(1);
      expect(comments[0].author).to.equal(user2.address);
      expect(comments[0].content).to.equal("Great post!");
      
      const post = await socialMedia.posts(1);
      expect(post.commentCount).to.equal(1);
    });

    it("Should not allow commenting on non-existent posts", async function () {
      await expect(
        socialMedia.connect(user1).addComment(999, "Comment on nothing")
      ).to.be.revertedWith("Post does not exist");
    });
  });

  describe("Social Interactions", function () {
    beforeEach(async function () {
      // Setup users and a post
      await socialMedia.connect(user1).createUser("content_creator", "I create content", "QmHash1");
      await socialMedia.connect(user2).createUser("fan", "I like content", "QmHash2");
      await socialMedia.connect(user1).createPost("Likeable post", "QmMediaHash");
    });

    it("Should like a post", async function () {
      await socialMedia.connect(user2).likePost(1);
      
      const post = await socialMedia.posts(1);
      expect(post.likeCount).to.equal(1);
      
      const hasLiked = await socialMedia.hasLiked(user2.address, 1);
      expect(hasLiked).to.equal(true);
    });

    it("Should not like a post twice", async function () {
      await socialMedia.connect(user2).likePost(1);
      
      await expect(
        socialMedia.connect(user2).likePost(1)
      ).to.be.revertedWith("Post already liked");
    });

    it("Should unlike a post", async function () {
      await socialMedia.connect(user2).likePost(1);
      await socialMedia.connect(user2).unlikePost(1);
      
      const post = await socialMedia.posts(1);
      expect(post.likeCount).to.equal(0);
      
      const hasLiked = await socialMedia.hasLiked(user2.address, 1);
      expect(hasLiked).to.equal(false);
    });

    it("Should share a post", async function () {
      await socialMedia.connect(user2).sharePost(1);
      
      const post = await socialMedia.posts(1);
      expect(post.shareCount).to.equal(1);
      
      const hasShared = await socialMedia.hasShared(user2.address, 1);
      expect(hasShared).to.equal(true);
    });

    it("Should not share a post twice", async function () {
      await socialMedia.connect(user2).sharePost(1);
      
      await expect(
        socialMedia.connect(user2).sharePost(1)
      ).to.be.revertedWith("Post already shared");
    });
  });

  describe("Following System", function () {
    beforeEach(async function () {
      // Setup users
      await socialMedia.connect(user1).createUser("influencer", "Follow me", "QmHash1");
      await socialMedia.connect(user2).createUser("follower", "I follow people", "QmHash2");
    });

    it("Should follow a user", async function () {
      await socialMedia.connect(user2).followUser(user1.address);
      
      const isFollowing = await socialMedia.isFollowing(user2.address, user1.address);
      expect(isFollowing).to.equal(true);
      
      const user1Data = await socialMedia.usersByAddress(user1.address);
      expect(user1Data.followerCount).to.equal(1);
      
      const user2Data = await socialMedia.usersByAddress(user2.address);
      expect(user2Data.followingCount).to.equal(1);
      
      const followers = await socialMedia.getFollowers(user1.address);
      expect(followers[0]).to.equal(user2.address);
      
      const following = await socialMedia.getFollowing(user2.address);
      expect(following[0]).to.equal(user1.address);
    });

    it("Should not follow self", async function () {
      await expect(
        socialMedia.connect(user1).followUser(user1.address)
      ).to.be.revertedWith("Cannot follow yourself");
    });

    it("Should not follow a user twice", async function () {
      await socialMedia.connect(user2).followUser(user1.address);
      
      await expect(
        socialMedia.connect(user2).followUser(user1.address)
      ).to.be.revertedWith("Already following this user");
    });

    it("Should unfollow a user", async function () {
      await socialMedia.connect(user2).followUser(user1.address);
      await socialMedia.connect(user2).unfollowUser(user1.address);
      
      const isFollowing = await socialMedia.isFollowing(user2.address, user1.address);
      expect(isFollowing).to.equal(false);
      
      const user1Data = await socialMedia.usersByAddress(user1.address);
      expect(user1Data.followerCount).to.equal(0);
      
      const user2Data = await socialMedia.usersByAddress(user2.address);
      expect(user2Data.followingCount).to.equal(0);
      
      const followers = await socialMedia.getFollowers(user1.address);
      expect(followers.length).to.equal(0);
    });

    it("Should not unfollow a non-followed user", async function () {
      await expect(
        socialMedia.connect(user2).unfollowUser(user1.address)
      ).to.be.revertedWith("Not following this user");
    });
  });

  describe("Rewards System", function () {
    beforeEach(async function () {
      // Setup users and a post
      await socialMedia.connect(user1).createUser("creator", "I create rewarded content", "QmHash1");
      await socialMedia.connect(user2).createUser("supporter", "I support creators", "QmHash2");
      await socialMedia.connect(user1).createPost("Please support my work", "QmMediaHash");
    });

    it("Should send rewards to post author", async function () {
      const rewardAmount = ethers.parseEther("1.0");
      // Fix: use provider to get balance instead of directly calling getBalance on user1
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      await socialMedia.connect(user2).sendReward(1, { value: rewardAmount });
      
      const post = await socialMedia.posts(1);
      expect(post.rewardAmount).to.equal(rewardAmount);
      
      const user = await socialMedia.usersByAddress(user1.address);
      expect(user.rewardsBalance).to.equal(rewardAmount);
      
      // Fix: use provider to get balance
      const newBalance = await ethers.provider.getBalance(user1.address);
      // Fix: use BigInt subtraction for bigint values
      expect(newBalance - initialBalance).to.equal(rewardAmount);
    });

    it("Should not send zero rewards", async function () {
      await expect(
        socialMedia.connect(user2).sendReward(1, { value: 0 })
      ).to.be.revertedWith("Reward amount must be greater than 0");
    });

    it("Should not reward non-existent posts", async function () {
      const rewardAmount = ethers.parseEther("1.0");
      
      await expect(
        socialMedia.connect(user2).sendReward(999, { value: rewardAmount })
      ).to.be.revertedWith("Post does not exist");
    });
  });

  describe("Contract Statistics", function () {
    it("Should track total users and posts", async function () {
      expect(await socialMedia.getTotalUsers()).to.equal(0);
      expect(await socialMedia.getTotalPosts()).to.equal(0);
      
      await socialMedia.connect(user1).createUser("user1", "Bio 1", "QmHash1");
      await socialMedia.connect(user2).createUser("user2", "Bio 2", "QmHash2");
      
      await socialMedia.connect(user1).createPost("Post 1", "QmMediaHash1");
      await socialMedia.connect(user1).createPost("Post 2", "QmMediaHash2");
      await socialMedia.connect(user2).createPost("Post 3", "QmMediaHash3");
      
      expect(await socialMedia.getTotalUsers()).to.equal(2);
      expect(await socialMedia.getTotalPosts()).to.equal(3);
    });
  });

  // New tests for chat functionality
  describe("Chat Functionality", function () {
    beforeEach(async function () {
      // Setup users for chat tests
      await socialMedia.connect(user1).createUser("chatuser1", "I chat", "QmHash1");
      await socialMedia.connect(user2).createUser("chatuser2", "I also chat", "QmHash2");
      await socialMedia.connect(user3).createUser("chatuser3", "I chat too", "QmHash3");
    });

    describe("Chat Permissions", function () {
      it("Should determine if users can chat based on follow status", async function () {
        // Initially no one follows anyone
        expect(await socialMedia.canChat(user1.address, user2.address)).to.equal(false);
        
        // User1 follows User2
        await socialMedia.connect(user1).followUser(user2.address);
        
        // Now they should be able to chat
        expect(await socialMedia.canChat(user1.address, user2.address)).to.equal(true);
        expect(await socialMedia.canChat(user2.address, user1.address)).to.equal(true);
        
        // User3 has no relationship with others
        expect(await socialMedia.canChat(user1.address, user3.address)).to.equal(false);
        expect(await socialMedia.canChat(user2.address, user3.address)).to.equal(false);
      });
    });

    describe("Sending Messages", function () {
      beforeEach(async function () {
        // User1 follows User2 so they can chat
        await socialMedia.connect(user1).followUser(user2.address);
      });

      it("Should send a message between users who can chat", async function () {
        const tx = await socialMedia.connect(user1).sendMessage(user2.address, "Hello User2!");
        const receipt = await tx.wait();
        
        // Get the MessageSent event
        const event = receipt.logs.find(
          log => log.topics[0] === socialMedia.interface.getEvent("MessageSent").topicHash
        );
        const decodedEvent = socialMedia.interface.decodeEventLog(
          "MessageSent", 
          event.data, 
          event.topics
        );
        
        expect(decodedEvent.sender).to.equal(user1.address);
        expect(decodedEvent.receiver).to.equal(user2.address);
        
        // Check message by ID
        const messageId = decodedEvent.messageId;
        const message = await socialMedia.getMessageById(messageId);
        
        expect(message.sender).to.equal(user1.address);
        expect(message.receiver).to.equal(user2.address);
        expect(message.content).to.equal("Hello User2!");
        expect(message.isRead).to.equal(false);
      });

      it("Should not allow sending messages to users who can't chat", async function () {
        // User1 and User3 don't follow each other
        await expect(
          socialMedia.connect(user1).sendMessage(user3.address, "Should fail")
        ).to.be.revertedWith("Cannot chat with this user. One of you must follow the other.");
      });

      it("Should update chat history for both users", async function () {
        await socialMedia.connect(user1).sendMessage(user2.address, "Message 1");
        await socialMedia.connect(user2).sendMessage(user1.address, "Reply to message 1");
        
        const chatHistory12 = await socialMedia.getChatHistory(user1.address, user2.address);
        const chatHistory21 = await socialMedia.getChatHistory(user2.address, user1.address);
        
        // Both users should see the same messages
        expect(chatHistory12.length).to.equal(2);
        expect(chatHistory21.length).to.equal(2);
        expect(chatHistory12[0]).to.equal(chatHistory21[0]);
        expect(chatHistory12[1]).to.equal(chatHistory21[1]);
      });

      it("Should update recent chats list", async function () {
        // User3 follows User1 so they can chat too
        await socialMedia.connect(user3).followUser(user1.address);
        
        // User1 sends messages to User2 and User3
        await socialMedia.connect(user1).sendMessage(user2.address, "Hello User2");
        await socialMedia.connect(user1).sendMessage(user3.address, "Hello User3");
        
        // Get User1's recent chats
        const recentChats = await socialMedia.getRecentChats(user1.address);
        
        // User3 should be first (most recent), User2 second
        expect(recentChats.length).to.equal(2);
        expect(recentChats[0]).to.equal(user3.address);
        expect(recentChats[1]).to.equal(user2.address);
      });
    });

    describe("Reading Messages", function () {
      beforeEach(async function () {
        // User1 follows User2 so they can chat
        await socialMedia.connect(user1).followUser(user2.address);
        
        // Send some messages
        await socialMedia.connect(user1).sendMessage(user2.address, "Message 1");
        await socialMedia.connect(user1).sendMessage(user2.address, "Message 2");
      });

      it("Should mark individual messages as read", async function () {
        // Get chat history
        const chatHistory = await socialMedia.getChatHistory(user1.address, user2.address);
        const messageId = chatHistory[0];
        
        // Check initial unread count
        expect(await socialMedia.getUnreadMessageCount(user2.address, user1.address)).to.equal(2);
        
        // Mark first message as read
        await socialMedia.connect(user2).markMessageAsRead(messageId);
        
        // Verify message is read
        const message = await socialMedia.getMessageById(messageId);
        expect(message.isRead).to.equal(true);
        
        // Check updated unread count
        expect(await socialMedia.getUnreadMessageCount(user2.address, user1.address)).to.equal(1);
      });

      it("Should not allow non-receivers to mark messages as read", async function () {
        const chatHistory = await socialMedia.getChatHistory(user1.address, user2.address);
        const messageId = chatHistory[0];
        
        await expect(
          socialMedia.connect(user1).markMessageAsRead(messageId)
        ).to.be.revertedWith("Only the receiver can mark messages as read");
      });

      it("Should mark all messages from a sender as read", async function () {
        // Check initial unread count
        expect(await socialMedia.getUnreadMessageCount(user2.address, user1.address)).to.equal(2);
        
        // Mark all messages as read
        await socialMedia.connect(user2).markAllMessagesAsRead(user1.address);
        
        // Check updated unread count
        expect(await socialMedia.getUnreadMessageCount(user2.address, user1.address)).to.equal(0);
        
        // Check individual messages
        const chatHistory = await socialMedia.getChatHistory(user1.address, user2.address);
        for (let i = 0; i < chatHistory.length; i++) {
          const message = await socialMedia.getMessageById(chatHistory[i]);
          expect(message.isRead).to.equal(true);
        }
      });

      it("Should track total unread messages", async function () {
        // User3 follows User2 so they can chat too
        await socialMedia.connect(user3).followUser(user2.address);
        
        // User1 and User3 send messages to User2
        await socialMedia.connect(user1).sendMessage(user2.address, "Message from User1");
        await socialMedia.connect(user3).sendMessage(user2.address, "Message from User3");
        
        // Check User2's total unread messages
        // CHANGE THIS LINE: Should be 4 instead of 3 (2 from beforeEach + 2 from this test)
        expect(await socialMedia.getTotalUnreadMessages(user2.address)).to.equal(4);
        
        // Mark messages from User1 as read
        await socialMedia.connect(user2).markAllMessagesAsRead(user1.address);
        
        // Should only have User3's message unread now
        expect(await socialMedia.getTotalUnreadMessages(user2.address)).to.equal(1);
      });
    });

    describe("Complex Chat Scenarios", function () {
      it("Should handle multiple conversations and recent chat ordering", async function () {
        // Setup connections
        await socialMedia.connect(user1).followUser(user2.address);
        await socialMedia.connect(user1).followUser(user3.address);
        
        // Initial messages
        await socialMedia.connect(user1).sendMessage(user2.address, "Hello User2");
        await socialMedia.connect(user1).sendMessage(user3.address, "Hello User3");
        
        // Check recent chats - User3 should be most recent
        let recentChats = await socialMedia.getRecentChats(user1.address);
        expect(recentChats[0]).to.equal(user3.address);
        expect(recentChats[1]).to.equal(user2.address);
        
        // Send another message to User2
        await socialMedia.connect(user1).sendMessage(user2.address, "Another message to User2");
        
        // Check recent chats - User2 should now be most recent
        recentChats = await socialMedia.getRecentChats(user1.address);
        expect(recentChats[0]).to.equal(user2.address);
        expect(recentChats[1]).to.equal(user3.address);
      });

      it("Should handle mutual following and allow two-way conversations", async function () {
        // Users follow each other
        await socialMedia.connect(user1).followUser(user2.address);
        await socialMedia.connect(user2).followUser(user1.address);
        
        // Two-way conversation
        await socialMedia.connect(user1).sendMessage(user2.address, "Message from User1");
        await socialMedia.connect(user2).sendMessage(user1.address, "Reply from User2");
        await socialMedia.connect(user1).sendMessage(user2.address, "Second message from User1");
        
        // Check chat history
        const chatHistory = await socialMedia.getChatHistory(user1.address, user2.address);
        expect(chatHistory.length).to.equal(3);
        
        // Check message content (in order)
        const firstMessage = await socialMedia.getMessageById(chatHistory[0]);
        const secondMessage = await socialMedia.getMessageById(chatHistory[1]);
        const thirdMessage = await socialMedia.getMessageById(chatHistory[2]);
        
        expect(firstMessage.content).to.equal("Message from User1");
        expect(secondMessage.content).to.equal("Reply from User2");
        expect(thirdMessage.content).to.equal("Second message from User1");
      });

      it("Should handle unfollow scenarios correctly", async function () {
        // User1 follows User2
        await socialMedia.connect(user1).followUser(user2.address);
        
        // Send a message
        await socialMedia.connect(user1).sendMessage(user2.address, "Hello before unfollow");
        
        // User1 unfollows User2
        await socialMedia.connect(user1).unfollowUser(user2.address);
        
        // Now they shouldn't be able to send messages
        await expect(
          socialMedia.connect(user1).sendMessage(user2.address, "Should fail after unfollow")
        ).to.be.revertedWith("Cannot chat with this user. One of you must follow the other.");
        
        // But chat history should still be accessible
        const chatHistory = await socialMedia.getChatHistory(user1.address, user2.address);
        expect(chatHistory.length).to.equal(1);
        
        // User2 follows User1 - now they can chat again
        await socialMedia.connect(user2).followUser(user1.address);
        
        // Send a new message
        await socialMedia.connect(user1).sendMessage(user2.address, "Hello after re-follow");
        
        // Check updated chat history
        const updatedChatHistory = await socialMedia.getChatHistory(user1.address, user2.address);
        expect(updatedChatHistory.length).to.equal(2);
      });
    });
  });
});