import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Modal.css';

interface RepoFormProps {
  repoName?: string;
  url?: string;
  organization?: string; // --- ΠΡΟΣΘΗΚΗ ---
  description?: string;
  comments?: string;
  onClose: () => void;
  onSave: () => void;
}

const RepoForm: React.FC<RepoFormProps> = ({
  repoName,
  url,
  organization, // --- ΠΡΟΣΘΗΚΗ ---
  description,
  comments,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    repo_name: repoName || '',
    url: url || '',
    organization: organization || '', // --- ΠΡΟΣΘΗΚΗ ---
    description: description || '',
    comments: comments || '',
  });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlValue = e.target.value;
    let newRepoName = formData.repo_name;

    if (urlValue && !repoName) { // Ενημέρωσε το όνομα μόνο κατά τη δημιουργία
      const parts = urlValue.split('/');
      const lastPart = parts[parts.length - 1];
      newRepoName = lastPart.endsWith('.git') ? lastPart.slice(0, -4) : lastPart;
    }

    setFormData({
      ...formData,
      url: urlValue,
      repo_name: newRepoName,
    });
  };

  useEffect(() => {
    if (repoName) { // Μόνο για επεξεργασία
        setFormData({
            repo_name: repoName,
            url: url || '',
            organization: organization || '', // --- ΠΡΟΣΘΗΚΗ ---
            description: description || '',
            comments: comments || ''
        });
    }
  }, [repoName, url, organization, description, comments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
     if (name !== 'repo_name') {
        setFormData({ ...formData, [name]: value });
     }
  };

  const handleCreate = async () => {
    try {
      // Στέλνουμε ολόκληρο το formData που περιλαμβάνει και το organization
      const response = await axios.post(import.meta.env.VITE_API_URL + `/repos`, formData);
      console.log('Success:', response.data);
      onSave();
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while creating the repository.');
    }
  };

  const handleUpdate = async () => {
    try {
      // --- ΔΙΟΡΘΩΣΗ: Στέλνουμε και το organization ---
      const response = await axios.put(import.meta.env.VITE_API_URL + `/repos/${formData.repo_name}`, {
        url: formData.url,
        organization: formData.organization,
        description: formData.description,
        comments: formData.comments
      });
      console.log('Success:', response.data);
      onSave();
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
          <input
            type="text"
            name="url"
            value={formData.url}
            onChange={handleUrlChange}
            placeholder="URL"
            required
          />
          <input
            type="text"
            name="repo_name"
            value={formData.repo_name}
            placeholder="Repository Name"
            disabled
            required
          />
          {/* --- ΠΡΟΣΘΗΚΗ ΠΕΔΙΟΥ ORGANIZATION --- */}
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={handleInputChange}
            placeholder="Organization"
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