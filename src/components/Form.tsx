import React, { useState, Dispatch, SetStateAction } from "react";
import axios from "axios";
import { FileChange, Commit, AnalysisResult } from "@/lib/types";
import { ButtonLoading } from "@/components/ButtonLoading";
import { Button } from "@/components/ui/button";
import { GitCommitVertical, BarChartHorizontal } from "lucide-react";

interface FormProps {
  commits: Commit[];
  setCommits: (commits: Commit[]) => void;
  setProgress: Dispatch<SetStateAction<number>>;
  setTotalFiles: (total: number) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setAnalysisResults: Dispatch<SetStateAction<AnalysisResult[]>>;
}

const Form: React.FC<FormProps> = ({
  commits,
  setCommits,
  setProgress,
  setTotalFiles,
  loading,
  setLoading,
  setAnalysisResults,
}) => {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [commitLimit, setCommitLimit] = useState<string>("30");
  const [analysisStarted, setAnalysisStarted] = useState<boolean>(false);

  const handleFetchCommits = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setCommits([]);
    setAnalysisResults([]);
    setProgress(0);

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
    setAnalysisStarted(true);
    setProgress(0);
    setAnalysisResults([]);

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

  return (
    <div className="flex flex-col gap-4 items-start">
      <form onSubmit={handleFetchCommits} className="space-y-4 w-full">
        <div>
          <label htmlFor="repoUrl" className="block text-gray-700 mb-2">
            GitHub Repository URL
          </label>
          <input
            type="text"
            id="repoUrl"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
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
          <Button type="submit">
            <GitCommitVertical className="mr-2 h-4 w-4" />
            Fetch Commits
          </Button>
        )}
      </form>
      <Button
        type="button"
        onClick={handleExtractSkills}
        disabled={!repoUrl || commits.length === 0 || analysisStarted}
      >
        <BarChartHorizontal className="mr-2 h-4 w-4" />
        Extract Skills
      </Button>
    </div>
  );
};

export default Form;




