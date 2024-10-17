import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import RepoList from './components/RepoList';
import CreateRepoPage from '@/components/pages/CreateRepoPage';
import EditRepoPage from '@/components/pages/EditRepoPage';
import CommitsScreen from '@/components/CommitsScreen';
import { Commit, AnalysisResult } from '@/lib/types';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Repo {
  name: string;
  url: string;
  description?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
}

const App: React.FC = () => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedRepoForEdit, setSelectedRepoForEdit] = useState<Repo | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>('');

  const [commits, setCommits] = useState<Commit[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [commitLimit, setCommitLimit] = useState<number>(100);
  const [showScreen, setShowScreen] = useState<boolean>(false);
  const [resultsOfAnalysis, setResultsOfAnalysis] = useState<boolean>(false); // Initial value set to false
  const [chartData, setChartData] = useState<any>(null);
  const [showChart, setShowChart] = useState<boolean>(false); 

  useEffect(() => {
    fetchRepos();
  }, []);

  useEffect(() => {
    if (showScreen && repoUrl) {
      //fetchCommits();
      //extractFiles();
    }
  }, [showScreen, repoUrl]);

  const fetchRepos = async () => {
    try {
      const response = await fetch('http://localhost:5000/repos');
      const data = await response.json();
      setRepos(data);
    } catch (error) {
      console.error('Error fetching repos:', error);
    }
  };

  const addRepo = async (newRepo: Repo) => {
    try {
      const response = await fetch('http://localhost:5000/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRepo),
      });

      if (!response.ok) {
        throw new Error('Failed to add repository');
      }

      fetchRepos();
    } catch (error) {
      console.error('Error adding repo:', error);
    }
  };

  const CloseRepo = async (updatedRepo: Repo) => {
    setShowEditModal(false);
  };

  const fetchCommits = async () => {
    if (!repoUrl) {
      console.error("No repository selected");
      return;
    }
    
    // setLoading(true);
    // try {
      
    console.log("llllll")
    //   const response = await fetch(`http://localhost:5000/api/commits?repo=${encodeURIComponent(repoUrl)}&limit=${commitLimit}`);
  
    //   if (!response.ok) {
    //     throw new Error(`HTTP error! Status: ${response.status}`);
    //   }
  
    //   const data = await response.json();
  
    //   if (!Array.isArray(data)) {
    //     throw new Error('Unexpected response format');
    //   }
  
    //   setCommits(data);
    //   setResultsOfAnalysis(true); // Set resultsOfAnalysis to true when fetching commits
    // } catch (error) {
    //   console.error("Failed to fetch commits:", error);
    //   setResultsOfAnalysis(false); // Handle error by setting resultsOfAnalysis to false
    // } finally {
    //   setLoading(false);
    // }
  };

  const extractFiles = async () => {
    // setLoading(true);
    // try {
    //   const response = await fetch('http://localhost:5000/api/files');
    //   const data = await response.json();
    //   setFiles(data);
    // } catch (error) {
    //   console.error("Failed to extract files:", error);
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleSelectRepo = (repoName: string, repoUrl: string) => {
    setSelectedRepo(repoName);
    setRepoUrl(repoUrl);
    setShowScreen(true);
    setResultsOfAnalysis(false); // Set resultsOfAnalysis to false when selecting a repo
  };

  const handleSelectAddRepo = () => {
    setShowCreateModal(true);
  };

  const handleEditRepo = (repo: Repo) => {
    setSelectedRepoForEdit(repo);
    setShowEditModal(true);
  };
 
  const handleDeleteRepo = async (repoName: string) => {
    try {
      const response = await fetch(`http://localhost:5000/delete_repo/${encodeURIComponent(repoName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete repository');
      }

      setRepos(repos.filter((repo) => repo.name !== repoName));
    } catch (error) {
      console.error('Error deleting repo:', error);
    }
  };

  const handleSave = async () => {
    await fetchRepos();
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const handleCloseScreen = () => {
    setShowScreen(false);
    setResultsOfAnalysis(false); // Reset analysis results when closing the screen
  };

  const handleCloseChart = () => {
    //setShowScreen(false);
    setShowChart(false)
  };

  const handleViewOrganizationSkills = async () => {
    try {
      const response = await fetch('http://localhost:5000/detected_kus');
      
      // Έλεγχος αν η απάντηση είναι επιτυχής
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const analysisData = await response.json(); // Parse the JSON response
  
      const aggregatedData: { [key: string]: number } = {};
  
      // Υπολογισμός αθροισμάτων για κάθε KUs
      analysisData.forEach((item: { [key: string]: number }) => {
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'number') {
            if (aggregatedData[key]) {
              aggregatedData[key] += value;
            } else {
              aggregatedData[key] = value;
            }
          }
        }
      });
  
      // Ταξινόμηση των κλειδιών αριθμητικά
      const sortedKeys = Object.keys(aggregatedData).sort((a, b) => {
        const numA = parseInt(a.slice(1)); // Λαμβάνουμε το αριθμητικό μέρος του κλειδιού
        const numB = parseInt(b.slice(1)); // Λαμβάνουμε το αριθμητικό μέρος του κλειδιού
        return numA - numB; // Ταξινόμηση αριθμητικά
      });
  
      // Δημιουργία των labels και των data με τη σωστή σειρά
      const labels = sortedKeys;
      const data = sortedKeys.map(key => aggregatedData[key]);
  
      setChartData({
        labels: labels,
        datasets: [
          {
            label: 'Number of KUs',
            data: data,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      });
  
      setShowChart(true);
    } catch (error) {
      console.error('Failed to load analysis data:', error);
    }
  };
  
  
  


  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100">
        <div className="flex flex-col w-1/4 p-8 h-full sticky top-0 gap-4 bg-gray-50 border-r border-gray-200"> {/* Adjust width and add border */}
          <RepoList
            repos={repos}
            onSelectRepo={handleSelectRepo}
            onSelectAddRepo={handleSelectAddRepo}
            selectedRepo={selectedRepo}
            onEditRepo={handleEditRepo}
            onDeleteRepo={handleDeleteRepo}
          />
        </div>
   
        <div className="flex flex-col flex-1 p-8 gap-4 ml-4"> {/* Added margin-left to match the distance */}
          <button 
            onClick={handleViewOrganizationSkills} 
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            View Organization Skills
          </button>

          {showChart && chartData && (
            <div className="mt-8">
              <Bar data={chartData} />
              <button 
                onClick={handleCloseChart} 
                className="mt-4 px-4 py-2 bg-[#c72424] text-white rounded"
              >
                Close Chart
              </button>
            </div>
          )}
          {showScreen && (
            <CommitsScreen
              commits={commits}
              progress={progress}
              totalFiles={totalFiles}
              loading={loading}
              analysisResults={analysisResults}
              files={files}
              commitLimit={commitLimit}
              extractFiles={extractFiles}
              fetchCommits={fetchCommits}
              repoUrl={repoUrl}
              setCommits={setCommits}
              setProgress={setProgress}
              setTotalFiles={setTotalFiles}
              setLoading={setLoading}
              setAnalysisResults={setAnalysisResults}
              resultsOfAnalysis={resultsOfAnalysis}
              setResultsOfAnalysis={setResultsOfAnalysis} // Pass the setter function
            />
          )}

          {showCreateModal && (
            <CreateRepoPage
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onAddRepo={addRepo}
              onSave={handleSave}
            />
          )}
          
          {showEditModal && (
            <EditRepoPage
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              onSave={handleSave}
              onCloseRepo={CloseRepo}
              repo={selectedRepoForEdit}
            />
          )}
        </div>
      </div>
    </Router>
  );
};

export default App;
