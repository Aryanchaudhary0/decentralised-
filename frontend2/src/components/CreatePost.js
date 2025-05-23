import React, { useState } from 'react';
import axios from 'axios';

function CreatePost({ contract, account }) {
  const [content, setContent] = useState('');
  const [mediaHash, setMediaHash] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Create preview for image files
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
      setFilePreview('video-preview');
    } else {
      setFilePreview('');
    }
  };

  const uploadToPinata = async () => {
    if (!file) return null;
    
    try {
      setUploading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
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
      console.error('Error uploading file to IPFS via Pinata:', err);
      setError('Failed to upload file: ' + (err.response?.data?.error || err.message));
      setUploading(false);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      setPosting(true);
      setError('');
      
      // If there's a file, upload it to IPFS via Pinata first
      let hash = mediaHash;
      if (file) {
        hash = await uploadToPinata();
        if (!hash) {
          setPosting(false);
          return;
        }
      }
      
      const tx = await contract.createPost(content, hash);
      await tx.wait();
      
      setContent('');
      setMediaHash('');
      setFile(null);
      setFilePreview('');
      setPosting(false);
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post: ' + error.message);
      setPosting(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview('');
  };

  const mystyle = {
    border:"2px solid #0d8ecf",
    background:"#0d8ecf",
    color:"white",
    padding:"5px",
    display:"inline-block",
    fontSize:"15px",
    fontWeight:"bold",
    borderRadius:"20px",
    paddingTop:"7px",
    paddingBottom:"7px",
    paddingLeft:"10px",
    paddingRight:"10px",
    marginTop:"7px"
  };

  return (
    <div className="create-post">
      <h2>Create Post</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="What's happening?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          maxLength={280}
        />
        
        {!file && (
          <div>
            <input
              type="text"
              placeholder="IPFS Media Hash"
              value={mediaHash}
              onChange={(e) => setMediaHash(e.target.value)}
            />
            <div>
              <label className="file-upload-btn">
                <div className="upload_button" style={mystyle}>Upload Media</div>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        )}
        
        {file && filePreview && (
          <div className="media-preview">
            {filePreview === 'video-preview' ? (
              <div className="video-preview">
                Video selected: {file.name}
              </div>
            ) : (
              <img 
                src={filePreview} 
                alt="Preview" 
                style={{ maxHeight: '200px' }} 
              />
            )}
            <br/>
            <button 
              type="button" 
              className="remove-media-btn"
              onClick={removeFile}
            >
              Remove
            </button>
          </div>
        )}
        
        <div className="form-footer">
          <span className="char-count">{content.length}/280</span>
          <button 
            type="submit" 
            disabled={posting || uploading || !content.trim()}
          >
            {uploading ? 'Uploading media...' : posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default CreatePost;