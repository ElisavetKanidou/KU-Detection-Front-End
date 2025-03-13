import React, { useState, Dispatch, SetStateAction, useEffect } from 'react';
import axios from 'axios';
import { FileChange, Commit, AnalysisResult } from '@/lib/types';
import { ButtonLoading } from '@/components/ButtonLoading';
import { Button } from '@/components/ui/button';
import { GitCommitVertical, BarChartHorizontal } from 'lucide-react';
import Heatmap from '@/components/Heatmap';
import ChartModal from '@/components/ChartModal';
import Slider from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

interface FormProps {
    commits: Commit[];
    setCommits: (commits: Commit[]) => void;
    progress: number; // Δεν χρησιμοποιείται άμεσα πλέον, αλλά μπορεί να υπάρχει για συμβατότητα
    setProgress: Dispatch<SetStateAction<number>>; // Δεν χρησιμοποιείται άμεσα πλέον
    setTotalFiles: (total: number) => void;
    loading: boolean;  // Γενική κατάσταση φόρτωσης (μπορεί να μην είναι πλέον απαραίτητη)
    setLoading: (loading: boolean) => void; // Γενική κατάσταση φόρτωσης
    setAnalysisResults: (analysisResults: AnalysisResult[]) => void;
    initialRepoUrl?: string;  // Προαιρετικό αρχικό URL
    setResultsOfAnalysis: Dispatch<SetStateAction<boolean>>;
    
    
}

interface AnalysisState {
    progress: number;
    status: string;
    loading: boolean;
    started: boolean;
}

const Form: React.FC<FormProps> = ({
    commits,
    setCommits,
    setProgress,
    setTotalFiles,
    loading,
    setLoading,
    setAnalysisResults,
    initialRepoUrl = "",
    setResultsOfAnalysis,
}) => {
    const [repoUrl, setRepoUrl] = useState<string>(initialRepoUrl); // Τρέχον URL
    const [commitLimit, setCommitLimit] = useState<string>("30");
    const [heatmapData, setHeatmapData] = useState<AnalysisResult[]>([]);
    const [loadingHeatmap, setLoadingHeatmap] = useState<boolean>(false);
    const [heatmapMessage, setHeatmapMessage] = useState<string>("No data available");
    const [initialHeatmapHandler, setInitialHeatmapHandler] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [analyzedTimestamps, setAnalyzedTimestamps] = useState<string[]>([]);
    const [timestamps, setTimestamps] = useState<string[]>([]);

    const [filteredAnalysisResults, setFilteredAnalysisResults] = useState<AnalysisResult[]>([]);
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [minDate, setMinDate] = useState<Date | null>(null);
    const [maxDate, setMaxDate] = useState<Date | null>(null);
    const [totalMonths, setTotalMonths] = useState(0);


    // ΚΡΑΤΆΜΕ ΤΗΝ ΚΑΤΆΣΤΑΣΗ ΑΝΆΛΥΣΗΣ ΓΙΑ ΚΆΘΕ REPOSITORY
    // Define the type for analysisStates
    const [analysisStates, setAnalysisStates] = useState<Record<string, AnalysisState>>({});

  
    useEffect(() => {
      if (heatmapData.length > 0) {
          const timestamps = heatmapData.map(result => new Date(result.timestamp));
          const minDate = new Date(Math.min(...timestamps.map(d => d.getTime()))); 
          const maxDate = new Date(Math.max(...timestamps.map(d => d.getTime())));
  
          setMinDate(minDate);
          setMaxDate(maxDate);
  
          const monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth());
          setTotalMonths(Math.max(1, monthsDiff +1 ) ); // Ensure at least 1 month
          setSelectedMonths(Math.max(1, monthsDiff + 1)); // Initialize to total months
      }
  }, [heatmapData]);
  
  
    const handleSliderChange = (value: [number]) => {
      setSelectedMonths(value[0]);
    };
  
    useEffect(() => {
        if (heatmapData.length > 0 && maxDate) {
            const endDate = new Date(maxDate);
            const startDate = new Date(endDate);
            startDate.setMonth(endDate.getMonth() - (selectedMonths - 1));

            const filteredResults = heatmapData.filter(result => {
                const resultDate = new Date(result.timestamp);
                return resultDate >= startDate && resultDate <= endDate;
            });

            setFilteredAnalysisResults(filteredResults);
        }
    }, [heatmapData, selectedMonths, maxDate]);

    useEffect(() => {
        setRepoUrl(initialRepoUrl);
    }, [initialRepoUrl]);
    
    useEffect(() => {
        if (repoUrl) {
            // Clear heatmap data when repoUrl changes
            setHeatmapData([]);
            setFilteredAnalysisResults([]);
            setHeatmapMessage("No data available");
            fetchHeatmapData(repoUrl);
        }
    }, [repoUrl]);
    
    


    const fetchHeatmapData = async (repoURL: string) => {
        setLoadingHeatmap(true);
        setInitialHeatmapHandler(true);
        try {
            // Χρησιμοποιούμε repoURL και τη συνάρτηση getRepoNameFromUrl
            const response = await axios.get(`http://localhost:5000/analyzedb?repo_name=${getRepoNameFromUrl(repoURL)}`);
            const analysisResults = response.data || [];
            setLoadingHeatmap(false);
            if (analysisResults.length > 0) {
                setHeatmapData(analysisResults);
                setAnalysisResults(analysisResults);
            } else {
                setHeatmapMessage("No analysis data found for this repository.");
                setHeatmapData([]);
                setAnalysisResults([]);
            }
        } catch (error) {
            console.error("Error fetching analysis data:", error);
            setLoadingHeatmap(false);
            setHeatmapMessage("Failed to fetch analysis data.");
        }
    };
    // Βοηθητική συνάρτηση για εξαγωγή repo_name από repo_url
    function getRepoNameFromUrl(url: string) {
        const cleanedUrl = url.endsWith('.git') ? url.slice(0, -4) : url;
        const parts = cleanedUrl.split('/');
        return parts[parts.length - 1];
    }
 


    const handleFetchCommits = async (repoUrl: string) => {
        setLoading(true);
        setCommits([]);
        setProgress(0);
        setResultsOfAnalysis(true);

        try {
            const limit = commitLimit ? parseInt(commitLimit) : null;
            const response = await axios.post("http://localhost:5000/commits", {
                repo_url: repoUrl,
                limit: limit,
            });

            const fileChanges: FileChange[] = response.data;
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
            setTotalFiles(fileChanges.length);
            await fetchCommitTimestamps(repoUrl);
        } catch (error) {
            console.error("Error fetching commits:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCommitTimestamps = async (repoURL: string) => {
        setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5000/historytime`, {
                params: { repo_url: repoURL },
            });

            if (response.data && response.data.commit_dates) {
                setTimestamps(response.data.commit_dates);
            } else {
                console.error("No commit dates found in response");
            }
        } catch (error) {
            console.error("Error fetching commit timestamps:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalyzedCommitTimestamps = async (repoURL: string) => {
        try {
            const response = await axios.get(`http://localhost:5000/timestamps?repo_name=${getRepoNameFromUrl(repoURL)}`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching analyzed commit timestamps:', error);
            return [];
        }
    };

    const handleAnalysis = async (repoUrl: string) => {
    await handleFetchCommits(repoUrl);

    // 1. ΑΡΧΙΚΟΠΟΙΗΣΗ ΚΑΤΑΣΤΑΣΗΣ ΓΙΑ ΤΟ ΣΥΓΚΕΚΡΙΜΕΝΟ REPOSITORY
    setAnalysisStates(prevStates => ({
        ...prevStates,  // Διατήρηση προηγούμενων καταστάσεων
        [repoUrl]: {   // Χρήση του repoUrl ως κλειδί!
            progress: 0,
            status: "Starting analysis...",
            loading: true,
            started: true,
        }
    }));

    setResultsOfAnalysis(true);
    setInitialHeatmapHandler(true);

    try {
        // 2. ΔΗΜΙΟΥΡΓΙΑ EVENTSOUCE ΓΙΑ ΤΟ ΣΥΓΚΕΚΡΙΜΕΝΟ repoUrl
        const eventSource = new EventSource(`http://localhost:5000/analyze?repo_url=${encodeURIComponent(repoUrl)}`);

        // 3. EVENT HANDLERS
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // 4. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ ΣΩΣΤΟ REPOSITORY
            if (data.repoUrl && data.repoUrl === repoUrl) {  // ΣΗΜΑΝΤΙΚΟ: data.repoUrl === repoUrl
                if (data.error) {
                    // 5. ΕΝΗΜΕΡΩΣΗ ΚΑΤΑΣΤΑΣΗΣ ΣΕ ΠΕΡΙΠΤΩΣΗ ΣΦΑΛΜΑΤΟΣ (ΜΟΝΟ ΓΙΑ ΤΟ ΣΩΣΤΟ REPO)
                    setAnalysisStates(prevStates => ({
                        ...prevStates,
                        [repoUrl]: {
                            ...prevStates[repoUrl],  // Διατηρούμε τα υπόλοιπα
                            status: `Analysis failed: ${data.error}`,
                            loading: false,
                            started: false,
                        }
                    }));
                    eventSource.close();
                } else if (data.progress !== undefined) {
                    // 6. ΕΝΗΜΕΡΩΣΗ ΠΡΟΟΔΟΥ (ΜΟΝΟ ΓΙΑ ΤΟ ΣΩΣΤΟ REPO)
                    setAnalysisStates(prevStates => ({
                        ...prevStates,
                        [repoUrl]: {
                            ...prevStates[repoUrl],
                            progress: data.progress,
                            status: `Analysis in progress... ${data.progress}%`,
                        }
                    }));

                    if (data.progress === 100) {
                        // Analysis completed - Ξεκινάμε το timeout εδώ, ΧΩΡΙΣ επιπλέον έλεγχο status
                        setTimeout(() => {
                            setAnalysisStates(prevState => {
                                const newState = { ...prevState };
                                delete newState[repoUrl]; // Διαγραφή μετά την καθυστέρηση
                                return newState;
                            });
                            fetchHeatmapData(repoUrl); //refresh heatmap with new data
                        }, 500);
                    }


                    if (data.file_data) {
                        // Προσθήκη νέου αρχείου στο heatmapData
                         setHeatmapData(prevData => {
                            const isAlreadyPresent = prevData.some(item => item.sha === data.file_data.sha && item.filename === data.file_data.filename);
                             if (!isAlreadyPresent && data.file_data.repoUrl===repoUrl) { //add only files belong to this repo and not duplicates
                                  return [...prevData, data.file_data];
                              }
                              return prevData;
                         });
                    }
                }
            } //(αλλιώς αγνοούμε το event, δεν είναι για το repository που μας ενδιαφέρει)

        };
        eventSource.onerror = (error) => {
            console.error("EventSource failed:", error);
            // 8. ΕΝΗΜΕΡΩΣΗ ΣΕ ΠΕΡΙΠΤΩΣΗ ΣΦΑΛΜΑΤΟΣ ΣΥΝΔΕΣΗΣ (ΜΟΝΟ ΓΙΑ ΤΟ ΣΩΣΤΟ REPO)
            setAnalysisStates(prevStates => ({
                ...prevStates,
                [repoUrl]: {
                    ...prevStates[repoUrl],
                    status: "Failed to connect to analysis stream.",
                    loading: false,
                    started: false,
                }
            }));
            eventSource.close();
        };
    }   catch (error) {
        console.error("Error starting analysis:", error);
        // 9. ΕΝΗΜΕΡΩΣΗ ΣΕ ΠΕΡΙΠΤΩΣΗ ΑΠΟΤΥΧΙΑΣ ΕΝΑΡΞΗΣ (ΜΟΝΟ ΓΙΑ ΤΟ ΣΩΣΤΟ REPO)
        setAnalysisStates(prevStates => ({
            ...prevStates,
            [repoUrl]: {
                ...prevStates[repoUrl],
                status: "Failed to start analysis.",
                loading: false,
                started: false,
            }
        }));
    }
};

    const chartData = {
        labels: timestamps.map(timestamp => new Date(timestamp).toLocaleString()),
        datasets: [
            {
                label: 'Commits over time',
                data: timestamps.map((_, index) => ({ x: new Date(timestamps[index]), y: 1 })),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: false,
                tension: 0.1,
            },
        ],
    };

    const handleOpenModal = async () => {
        if (!isModalOpen) {
            await fetchCommitTimestamps(repoUrl);
            const analyzedTimestamps = await fetchAnalyzedCommitTimestamps(repoUrl);
            setAnalyzedTimestamps(analyzedTimestamps);
            setIsModalOpen(true);
        }
    };


    return (
        <div className="flex flex-col gap-4 items-start">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4 w-full">
                {/* ... (Υπόλοιπα πεδία φόρμας - URL, commit limit) */}
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

                <div className="flex space-x-4">
                    {/* ΚΟΥΜΠΙ ΕΝΑΡΞΗΣ ΑΝΑΛΥΣΗΣ - ΤΡΟΠΟΠΟΙΗΜΕΝΟ */}
                    <Button
                        type="button"
                        onClick={() => handleAnalysis(repoUrl)} // ΚΑΛΟΥΜΕ handleAnalysis ΜΕ ΤΟ ΤΡΕΧΟΝ repoUrl
                        disabled={!repoUrl || (analysisStates[repoUrl] && analysisStates[repoUrl].started) || (analysisStates[repoUrl] && analysisStates[repoUrl].loading)}
                    >
                        <GitCommitVertical className="mr-2 h-4 w-4" />
                        Start Analysis
                    </Button>
                    <Button
                        type="button"
                        onClick={handleOpenModal}
                        disabled={!repoUrl || loading}
                    >
                        <BarChartHorizontal className="mr-2 h-4 w-4" />
                        Show History
                    </Button>
                </div>
            </form>

            {/* ΕΜΦΑΝΙΣΗ ΜΠΑΡΩΝ ΠΡΟΟΔΟΥ ΓΙΑ ΟΛΑ ΤΑ REPOSITORIES */}
            {Object.entries(analysisStates).map(([currentRepoUrl, state]) => (
                state.started && currentRepoUrl === repoUrl && ( // <-- ΠΡΟΣΘΗΚΗ ΕΛΕΓΧΟΥ
                    <div key={currentRepoUrl} className="w-full mt-4">
                        <p>Analyzing: {currentRepoUrl}</p>
                        <Progress value={state.progress} className="h-4" />
                        <p className="text-sm text-gray-500 mt-2">{state.status}</p>
                    </div>
                )
            ))}


           {/* Heatmap section */}
            {initialHeatmapHandler && (
                <div className="mt-8 w-full">
                    {loadingHeatmap && <p>Loading analysis data...</p>}
                    {!loadingHeatmap && filteredAnalysisResults.length > 0 && (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Newest Date:</span>
                                <span className="font-medium">{selectedMonths} Month(s)</span>
                                <span className="font-medium">Oldest Date:</span>


                            </div>


                            <Slider
                                min={1}
                                max={totalMonths}
                                step={1}
                                value={[selectedMonths]}
                                onValueChange={handleSliderChange}
                                // ... other props
                                minDate={minDate ? minDate.toISOString() : undefined}
                                maxDate={maxDate ? maxDate.toISOString() : undefined}
                            />
                            <Heatmap key={heatmapData.length} analysisResults={filteredAnalysisResults} />
                        </>
                    )}
                    {!loadingHeatmap && filteredAnalysisResults.length === 0 && <p>{heatmapMessage}</p>}
                </div>
            )}

            {/* Modal for displaying chart */}
            <ChartModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                timestamps={timestamps}
                analyzedTimestamps={analyzedTimestamps}
            />

        </div>
    );
};

export default Form;