import React, { useState } from "react";
import Form from "@/components/Form";
import Commits from "@/components/Commits";
import { Commit, AnalysisResult } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import Heatmap from "@/components/Heatmap";

const App: React.FC = () => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  return (
    <div className="flex min-h-screen bg-gray-100 flex relative">
      <div className="flex flex-col w-1/2 p-8 h-full sticky top-0 gap-4">
        <h1 className="text-2xl font-bold">Git Commit Skill Extractor</h1>
        <Form
          commits={commits}
          setCommits={setCommits}
          setProgress={setProgress}
          setTotalFiles={setTotalFiles}
          loading={loading}
          setLoading={setLoading}
          setAnalysisResults={setAnalysisResults}
        />
        {totalFiles > 0 && (
          <div className="flex gap-2 items-center">
            <Progress
              value={(progress / totalFiles) * 100}
              className="bg-white"
            />
            <span className="whitespace-nowrap">
              {progress}/{totalFiles}
            </span>
          </div>
        )}
      </div>
      <div className="w-1/2 p-4">
        {analysisResults.length > 0 && (
          <Heatmap analysisResults={analysisResults} />
        )}
        <Commits commits={commits} loading={loading} />
      </div>
    </div>
  );
};

export default App;
