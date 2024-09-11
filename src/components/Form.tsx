import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import axios from "axios";
import { FileChange, Commit, AnalysisResult } from "@/lib/types";
import { ButtonLoading } from "@/components/ButtonLoading";
import { Button } from "@/components/ui/button";
import { GitCommitVertical, BarChartHorizontal } from "lucide-react";
import Heatmap from "@/components/Heatmap"; // Assuming you have a Heatmap component

interface FormProps {
  commits: Commit[];
  setCommits: (commits: Commit[]) => void;
  setProgress: Dispatch<SetStateAction<number>>;
  setTotalFiles: (total: number) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setAnalysisResults: Dispatch<SetStateAction<AnalysisResult[]>>;
  initialRepoUrl?: string; // Optional prop for initial repo URL
  setResultsOfAnalysis: Dispatch<SetStateAction<boolean>>;
}

const Form: React.FC<FormProps> = ({
  commits,
  setCommits,
  setProgress,
  setTotalFiles,
  loading,
  setLoading,
  setAnalysisResults,
  initialRepoUrl = "", // Default to empty string if not provided
  setResultsOfAnalysis,
}) => {
  const [repoUrl, setRepoUrl] = useState<string>(initialRepoUrl);
  const [commitLimit, setCommitLimit] = useState<string>("30");
  const [analysisStarted, setAnalysisStarted] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<AnalysisResult[]>([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState<boolean>(false);
  const [heatmapMessage, setHeatmapMessage] = useState<string>("No data available");
  const [initialHeatmapHandler, setInitialHeatmapHandler] = useState<boolean>(false);

  // Update repoUrl if initialRepoUrl prop changes
  useEffect(() => {
    setRepoUrl(initialRepoUrl);
  }, [initialRepoUrl]);

  // Fetch heatmap data when repoUrl changes
  useEffect(() => {
    if (repoUrl) {
      fetchHeatmapData(repoUrl);
    }
  }, [repoUrl]);

  const fetchHeatmapData = async (repoURL: string) => {
    setLoadingHeatmap(true);
    setInitialHeatmapHandler(true);
    try {
      const response = await axios.get(`http://localhost:5000/analyzedb?repo_name=${getRepoNameFromUrl(repoURL)}`);
      var analysisResults = response.data || [];
      setLoadingHeatmap(false);

      if (analysisResults.length > 0) {
        setHeatmapData(analysisResults);
      } else {
        setHeatmapMessage("No analysis data found for this repository.");
        setHeatmapData([])
      }
    } catch (error) {
      console.error("Error fetching analysis data:", error);
      setLoadingHeatmap(false);
      setHeatmapMessage("Failed to fetch analysis data.");
    }
  };

  function getRepoNameFromUrl(url: string) {
    // Αφαιρούμε το ".git" αν υπάρχει στο τέλος του URL
    const cleanedUrl = url.endsWith('.git') ? url.slice(0, -4) : url;

    // Χρησιμοποιούμε την μέθοδο split για να πάρουμε το τελευταίο κομμάτι του URL
    const parts = cleanedUrl.split('/');

    // Επιστρέφουμε το τελευταίο στοιχείο, που είναι το όνομα του repository
    return parts[parts.length - 1];
  }

  const handleFetchCommits = async () => {
    setLoading(true);
    setCommits([]);
    setAnalysisResults([]);
    setProgress(0);
    setResultsOfAnalysis(true);

    try {
      const limit = commitLimit ? parseInt(commitLimit) : null;
      const response = await axios.post("http://localhost:5000/commits", {
        repo_url: repoUrl,
        limit: limit,
      });

      const fileChanges: FileChange[] = response.data;

      // Group file changes by commit SHA
      const commits: Commit[] = [];
      const grouped = fileChanges.reduce((acc, fileChange) => {
        if (!acc[fileChange.sha]) {
          acc[fileChange.sha] = {
            sha: fileChange.sha,
            author: fileChange.author,
            timestamp: fileChange.timestamp,
            file_changes: [],
          };
        }
        acc[fileChange.sha].file_changes.push(fileChange);
        return acc;
      }, {} as { [key: string]: Commit });

      for (const sha in grouped) {
        commits.push(grouped[sha]);
      }

      setCommits(commits);

      // Calculate the total number of files
      const totalFiles = fileChanges.length;
      setTotalFiles(totalFiles);
    } catch (error) {
      console.error("Error fetching commits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractSkills = () => {
    setInitialHeatmapHandler(false);
    setAnalysisStarted(true);
    setProgress(0);
    setAnalysisResults(heatmapData);
    setResultsOfAnalysis(true);

    const eventSource = new EventSource(
      `http://localhost:5000/analyze?repo_url=${encodeURIComponent(repoUrl)}`
    );

    eventSource.onmessage = (event: MessageEvent) => {
      if (event.data === "end") {
        eventSource.close();
        setLoading(false);
        setAnalysisStarted(false);
      } else {
        const fileData: AnalysisResult = JSON.parse(event.data);
        setAnalysisResults((prevResults) => [...prevResults, fileData]);
        setProgress((prevProgress) => prevProgress + 1);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Error streaming data:", error);
      eventSource.close();
      setLoading(false);
      setAnalysisStarted(false);
    };

    eventSource.onopen = () => {
      setProgress(0);
    };
  };

  const handleAnalysis = async () => {
    await handleFetchCommits();
    handleExtractSkills();
  };

  return (
    <div className="flex flex-col gap-4 items-start">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 w-full">
        <div>
          <label htmlFor="repoUrl" className="block text-gray-700 mb-2">
            GitHub Repository URL
          </label>
          <div
            id="repoUrl"
            className="w-full p-2 border border-gray-300 rounded bg-gray-100"
          >
            {repoUrl}
          </div>
        </div>
        <div>
          <label htmlFor="commitLimit" className="block text-gray-700 mb-2">
            Commit Limit (leave empty to scan all commits)
          </label>
          <input
            type="number"
            id="commitLimit"
            value={commitLimit}
            onChange={(e) => setCommitLimit(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            min="1"
          />
        </div>
        {loading ? (
          <ButtonLoading />
        ) : (
          <Button
            type="button"
            onClick={handleAnalysis}
            disabled={!repoUrl || analysisStarted}
          >
            <GitCommitVertical className="mr-2 h-4 w-4" />
            Start Analysis
          </Button>
        )}
      </form>

      {/* Heatmap section */}
      {
        initialHeatmapHandler && 
      <div className="mt-8 w-full">
        {loadingHeatmap ? (
          <p>Loading analysis data...</p>
        ) : heatmapData.length > 0 ? (
          <Heatmap analysisResults={heatmapData} />
        ) : (
          <p>{heatmapMessage}</p>
        )}
      </div>
      }
    </div>
  );
};

export default Form;
