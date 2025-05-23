import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import contractAddresses from './contractAddresses.json';
import SocialMediaArtifact from './artifacts/contracts/SocialMedia.sol/SocialMedia.json';
import './App.css';

// Components
import Navbar from './components/Navbar';
import Feed from './components/Feed';
import Profile from './components/Profile';
import CreatePost from './components/CreatePost';
import UserSearch from './components/UserSearch';
import ChatPage from './components/ChatPage';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [providerState, setProvider] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('feed');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [profileFile, setProfileFile] = useState(null);
  const [profileFilePreview, setProfileFilePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [profileImageHash, setProfileImageHash] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
          setError('Please install MetaMask to use this app');
          setLoading(false);
          return;
        }

        // Connect to the Ethereum network via MetaMask
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(provider);

        // Get user accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        // Create contract instance
        const contract = new ethers.Contract(
          contractAddresses.SocialMedia,
          SocialMediaArtifact.abi,
          provider.getSigner()
        );
        setContract(contract);

        // Check if user exists
        try {
          const user = await contract.usersByAddress(accounts[0]);
          if (user.exists) {
            setCurrentUser(user);
          }
        } catch (error) {
          console.log("User doesn't exist yet");
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing the app:', error);
        setError('Error connecting to the blockchain. Please check your network connection and MetaMask setup.');
        setLoading(false);
      }
    };

    init();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
        window.location.reload();
      });
    }
  }, []);

  // profile image file handler
  const handleProfileImageChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setProfileFile(selectedFile);

    // Create preview for image files
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setProfileFilePreview('');
      setError('Please select an image file for your profile picture');
    }
  };

  // function to upload to Pinata
  const uploadProfileToPinata = async () => {
    if (!profileFile) return null;
    
    try {
      setUploading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', profileFile);
      
      const pinataApiKey = '4219fd75a293ad4a93a7';
      const pinataSecretApiKey = 'be2db757fc1c38589a5c64b873f817999c95d34e3b67056f50d92e4e4fb9c2ae';
      
      // Upload to Pinata
      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': pinataApiKey,
          'pinata_secret_api_key': pinataSecretApiKey
        }
      });
      
      setUploading(false);
      return res.data.IpfsHash;
    } catch (err) {
      console.error('Error uploading profile image to IPFS via Pinata:', err);
      setError('Failed to upload profile image: ' + (err.response?.data?.error || err.message));
      setUploading(false);
      return null;
    }
  };

  // Add function to remove profile image
  const removeProfileImage = () => {
    setProfileFile(null);
    setProfileFilePreview('');
    setProfileImageHash('');
  };

  const createNewUser = async (username, bio, imageHash) => {
    try {
      setLoading(true);
      
      // If there's a file, upload it to IPFS via Pinata first
      let hash = imageHash;
      if (profileFile) {
        hash = await uploadProfileToPinata();
        if (!hash) {
          setLoading(false);
          return;
        }
      } else if (!imageHash) {
        // Set a default profile image hash if none is provided
        hash = "default-image-hash";
      }
      
      const tx = await contract.createUser(username, bio, hash);
      await tx.wait();
      
      const user = await contract.usersByAddress(account);
      setCurrentUser(user);
      setLoading(false);
      
      // Reset the form fields
      setProfileFile(null);
      setProfileFilePreview('');
      setProfileImageHash('');
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const viewProfile = (address) => {
    setSelectedProfile(address);
    setView('profile');
  };

  if (loading) {
    return <div className="app-container loading">Loading...</div>;
  }

  if (error) {
    return <div className="app-container error">{error}</div>;
  }

  const myStyle = {
    border:"2px solid #1da1f2",
    background:"#1da1f2",
    color:"white",
    padding:"5px",
    display:"inline-block",
    fontSize:"15px",
    fontWeight:"bold",
    borderRadius:"20px",
    paddingTop:"7px",
    paddingBottom:"7px",
    paddingLeft:"15px",
    paddingRight:"15px",
    marginTop:"2px",
  };
  

  return (
    <div className="app-container">
      <Navbar 
        account={account} 
        currentUser={currentUser} 
        setView={setView} 
      />
      
      {!currentUser && (
        <div className="create-user-container">
          <h2>Create Your Profile</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const username = e.target.username.value;
            const bio = e.target.bio.value;
            createNewUser(username, bio, profileImageHash);
          }}>
            <input 
              type="text" 
              name="username" 
              placeholder="Username" 
              required 
            />
            <textarea 
              name="bio" 
              placeholder="Bio" 
              required 
            />
            
            {!profileFile && (
              <div>
                <input 
                  type="text" 
                  placeholder="IPFS Profile Image Hash" 
                  value={profileImageHash}
                  onChange={(e) => setProfileImageHash(e.target.value)}
                />
                <div>
                  <label className="file-upload-btn">
                    <div className="upload_button" style={myStyle}>Upload Profile Picture</div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleProfileImageChange}
                    />
                  </label>
                </div>
              </div>
            )}
            
            {profileFile && profileFilePreview && (
              <div className="media-preview">
                <img 
                  src={profileFilePreview} 
                  alt="Profile Preview" 
                  style={{ maxHeight: '200px', borderRadius: '50%' }} 
                />
                <br/>
                <button 
                  type="button" 
                  className="remove-media-btn"
                  onClick={removeProfileImage}
                >
                  Remove
                </button>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={uploading}
            >
              {uploading ? 'Uploading Profile Image...' : 'Create Profile'}
            </button>
          </form>
        </div>
      )}

      {currentUser && (
        <>
          {view === 'feed' && (
            <>
              <CreatePost contract={contract} account={account} />
              <Feed 
                contract={contract} 
                account={account} 
                viewProfile={viewProfile} 
              />
            </>
          )}
          
          {view === 'profile' && (
            <Profile 
              contract={contract} 
              account={account} 
              profileAddress={selectedProfile || account} 
              currentUser={currentUser}
              viewProfile={viewProfile}
            />
          )}
          
          {view === 'search' && (
            <UserSearch 
              contract={contract} 
              viewProfile={viewProfile} 
            />
          )}
          
          {view === 'chat' && (
            <ChatPage 
              contract={contract}
              account={account}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;