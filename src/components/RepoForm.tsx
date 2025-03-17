import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Modal.css'; // Σιγουρευτείτε ότι έχετε το Modal.css αρχείο

interface RepoFormProps {
  repoName?: string;
  url?: string;
  description?: string;
  comments?: string;
  onClose: () => void;
  onSave: () => void;
}

const RepoForm: React.FC<RepoFormProps> = ({
  repoName,
  url,
  description,
  comments,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    repo_name: repoName || '',
    url: url || '',
    description: description || '',
    comments: comments || '',
  });

  // Νέα συνάρτηση για τον χειρισμό της αλλαγής στο URL
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlValue = e.target.value;
    let newRepoName = '';

    // Εξαγωγή του ονόματος από το URL (αν υπάρχει)
    if (urlValue) {
      const parts = urlValue.split('/');
      newRepoName = parts[parts.length - 1]; // Παίρνουμε το τελευταίο τμήμα
    }

    setFormData({
      ...formData,
      url: urlValue,
      repo_name: newRepoName, // Ενημερώνουμε αυτόματα το repo_name
    });
  };

    //Χρησιμοποιούμε useEffect για να αλλάξουμε το formData.repo_name στην επεξεργασία.
    useEffect(() => {
        if (url) {
            const parts = url.split('/');
            const newRepoName = parts[parts.length - 1];
             setFormData(prevFormData => ({
                ...prevFormData,
                repo_name: newRepoName
            }));
        }
    }, [url]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
     //Αποτρέπει την επεξεργασία του repo_name
     if (name !== 'repo_name') {
        setFormData({ ...formData, [name]: value });
     }
  };

  const handleCreate = async () => {
    try {
      const response = await axios.post(import.meta.env.VITE_API_URL+`/repos`, formData);
      console.log('Success:', response.data);
      onSave(); // Trigger the onSave callback
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while creating the repository.');
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await axios.put(import.meta.env.VITE_API_URL+`/repos/${formData.repo_name}`, {
        url: formData.url,
        description: formData.description,
        comments: formData.comments
      });
      console.log('Success:', response.data);
      onSave(); // Trigger the onSave callback
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while updating the repository.');
    }
  };

  const handleSave = () => {
    if (repoName) {
      handleUpdate();
    } else {
      handleCreate();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h1>{repoName ? 'Edit Repository' : 'Create Repository'}</h1>
          <button className="modal-close" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">
          {/* URL input field *πρώτο* */}
          <input
            type="text"
            name="url"
            value={formData.url}
            onChange={handleUrlChange}  // Χρησιμοποιούμε τον νέο handler
            placeholder="URL"
            required
          />
          {/* Repository Name input field *δεύτερο* και disabled */}
          <input
            type="text"
            name="repo_name"
            value={formData.repo_name}
            //onChange={handleInputChange} //Δεν χρειαζόμαστε πια onChange εδώ.
            placeholder="Repository Name"
            disabled // Το κάνουμε disabled
            required
          />

          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Description"
          />
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            placeholder="Comments"
          />
        </div>
        <div className="modal-footer">
          <button onClick={handleSave}>
            {repoName ? 'Update Repo' : 'Create Repo'}
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepoForm;