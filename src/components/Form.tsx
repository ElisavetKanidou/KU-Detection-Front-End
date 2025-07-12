import React, { useState, Dispatch, SetStateAction, useEffect, useRef } from 'react';
import axios from 'axios';
import { FileChange, Commit, AnalysisResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { GitCommitVertical, BarChartHorizontal } from 'lucide-react';
import Heatmap from '@/components/Heatmap';
import ChartModal from '@/components/ChartModal';
import Slider from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

// Interfaces για τα Props και το State
interface FormProps {
    commits: Commit[];
    setCommits: (commits: Commit[]) => void;
    setTotalFiles: (total: number) => void;
    setAnalysisResults: (analysisResults: AnalysisResult[]) => void;
    initialRepoUrl?: string;
    setResultsOfAnalysis: Dispatch<SetStateAction<boolean>>;
}

// Νέο, απλοποιημένο interface για την κατάσταση της ανάλυσης
interface AnalysisState {
    status: 'idle' | 'starting' | 'polling' | 'completed' | 'error';
    progress: number;
    message: string;
}

const Form: React.FC<FormProps> = ({
    setCommits,
    setTotalFiles,
    setAnalysisResults,
    initialRepoUrl = "",
    setResultsOfAnalysis,
}) => {
    // --- STATE MANAGEMENT ---
    const [repoUrl, setRepoUrl] = useState<string>(initialRepoUrl);
    const [commitLimit, setCommitLimit] = useState<string>("30");

    // State για την ανάλυση (πρόοδος, κατάσταση, μήνυμα)
    const [analysisState, setAnalysisState] = useState<AnalysisState>({
        status: 'idle',
        progress: 0,
        message: '',
    });

    // State για το Heatmap και τα δεδομένα του
    const [heatmapData, setHeatmapData] = useState<AnalysisResult[]>([]);
    const [loadingHeatmap, setLoadingHeatmap] = useState<boolean>(false);
    const [heatmapMessage, setHeatmapMessage] = useState<string>("No data available");
    const [initialHeatmapHandler, setInitialHeatmapHandler] = useState<boolean>(false);

    // State για το Chart Modal
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [timestamps, setTimestamps] = useState<string[]>([]);
    const [analyzedTimestamps, setAnalyzedTimestamps] = useState<string[]>([]);

    // State για το Slider του Heatmap
    const [filteredAnalysisResults, setFilteredAnalysisResults] = useState<AnalysisResult[]>([]);
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [minDate, setMinDate] = useState<Date | null>(null);
    const [maxDate, setMaxDate] = useState<Date | null>(null);
    const [totalMonths, setTotalMonths] = useState(0);

    // Ref για να κρατάμε το ID του interval του polling
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- HELPER FUNCTIONS ---
    const getRepoNameFromUrl = (url: string): string => {
        if (!url) return '';
        const cleanedUrl = url.endsWith('.git') ? url.slice(0, -4) : url;
        const parts = cleanedUrl.split('/');
        return parts[parts.length - 1];
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // --- DATA FETCHING & CORE LOGIC ---

    /**
     * Καλεί το backend περιοδικά για να πάρει την κατάσταση της ανάλυσης.
     */
    const pollStatus = (currentRepoUrl: string) => {
        const repoName = getRepoNameFromUrl(currentRepoUrl);
        if (!repoName) return;

        stopPolling(); // Σταματάμε τυχόν προηγούμενο polling

        pollingIntervalRef.current = setInterval(async () => {
            try {
                const response = await axios.get(import.meta.env.VITE_API_URL + `/analysis_status?repo_name=${repoName}`);
                const statusData = response.data;

                const newStatus = statusData.status === 'in-progress' ? 'polling' : statusData.status;
                
                setAnalysisState({
                    progress: statusData.progress || 0,
                    status: newStatus,
                    message: statusData.error_message || `Status: ${statusData.status}`
                });

                // Αν η ανάλυση ολοκληρώθηκε ή απέτυχε, σταματάμε το polling
                if (statusData.status === 'completed' || statusData.status === 'error') {
                    stopPolling();
                    if (statusData.status === 'completed') {
                        // Φέρνουμε τα τελικά δεδομένα για το heatmap
                        fetchHeatmapData(currentRepoUrl);
                    }
                }
            } catch (error) {
                console.error("Error during status polling:", error);
                setAnalysisState({
                    progress: 0,
                    status: 'error',
                    message: 'Failed to get analysis status. Connection error.'
                });
                stopPolling();
            }
        }, 3000); // Ρωτάμε κάθε 3 δευτερόλεπτα
    };

    /**
     * Ξεκινά την ανάλυση στο backend και μετά ξεκινά το polling.
     */
    const handleAnalysis = async (currentRepoUrl: string) => {
        setAnalysisState({ status: 'starting', progress: 0, message: 'Fetching commits...' });
        
        // Βήμα 1: Φέρνουμε τα commits (προαπαιτούμενο)
        const commitsFetched = await handleFetchCommits(currentRepoUrl);
        if (!commitsFetched) {
             setAnalysisState({ status: 'error', progress: 0, message: 'Failed to fetch commits. Cannot start analysis.' });
             return;
        }

        setAnalysisState({ status: 'starting', progress: 0, message: 'Requesting analysis start...' });
        setResultsOfAnalysis(true);
        setInitialHeatmapHandler(true);

        try {
            // Βήμα 2: Στέλνουμε το αίτημα για έναρξη της ανάλυσης
            const response = await axios.get(import.meta.env.VITE_API_URL + `/analyze?repo_url=${encodeURIComponent(currentRepoUrl)}`);

            // Βήμα 3: Αν το backend απαντήσει θετικά, ξεκινάμε το polling
            if (response.status === 202 || response.status === 409) {
                setAnalysisState(prevState => ({
                    ...prevState,
                    status: 'polling',
                    message: response.data.message || 'Analysis is in progress. Fetching status...'
                }));
                pollStatus(currentRepoUrl);
            } else {
                throw new Error(response.data.error || 'Unknown error from server');
            }
        } catch (error: any) {
            console.error("Error starting analysis:", error);
            const errorMessage = error.response?.data?.error || error.message || "Failed to start analysis.";
            setAnalysisState({ status: 'error', progress: 0, message: errorMessage });
        }
    };

    const handleFetchCommits = async (repoUrl: string): Promise<boolean> => {
        setCommits([]);
        try {
            const limit = commitLimit ? parseInt(commitLimit) : null;
            const response = await axios.post(import.meta.env.VITE_API_URL + "/commits", { repo_url: repoUrl, limit });
            const fileChanges: FileChange[] = response.data;
            const commitsMap = fileChanges.reduce((acc, fileChange) => {
                if (!acc[fileChange.sha]) {
                    acc[fileChange.sha] = { sha: fileChange.sha, author: fileChange.author, timestamp: fileChange.timestamp, file_changes: [] };
                }
                acc[fileChange.sha].file_changes.push(fileChange);
                return acc;
            }, {} as { [key: string]: Commit });
            setCommits(Object.values(commitsMap));
            setTotalFiles(fileChanges.length);
            return true;
        } catch (error) {
            console.error("Error fetching commits:", error);
            return false;
        }
    };

    const fetchHeatmapData = async (repoURL: string) => {
        setLoadingHeatmap(true);
        setInitialHeatmapHandler(true);
        try {
            const repoName = getRepoNameFromUrl(repoURL);
            const response = await axios.get(import.meta.env.VITE_API_URL + `/analyzedb?repo_name=${repoName}`);
            const results = response.data || [];
            setHeatmapData(results);
            setAnalysisResults(results);
            setHeatmapMessage(results.length > 0 ? "" : "No analysis data found for this repository.");
        } catch (error) {
            console.error("Error fetching analysis data:", error);
            setHeatmapMessage("Failed to fetch analysis data.");
        } finally {
            setLoadingHeatmap(false);
        }
    };

    // --- USEEFFECT HOOKS ---

    // Effect για να χειριστεί την αρχική φόρτωση ή την αλλαγή του repo από props
    useEffect(() => {
        setRepoUrl(initialRepoUrl);
        stopPolling(); // Σταματάμε πάντα το polling όταν αλλάζει το repo
        setAnalysisState({ status: 'idle', progress: 0, message: '' }); // Reset state

        if (initialRepoUrl) {
            fetchHeatmapData(initialRepoUrl);
            // Ελέγχουμε αν μια ανάλυση ήδη τρέχει για αυτό το repo
            const repoName = getRepoNameFromUrl(initialRepoUrl);
            axios.get(import.meta.env.VITE_API_URL + `/analysis_status?repo_name=${repoName}`)
                .then(response => {
                    if (response.data.status === 'in-progress') {
                        // Αν τρέχει, "συνδεόμαστε" ξανά ξεκινώντας το polling
                        setAnalysisState({ status: 'polling', progress: response.data.progress, message: 'Re-attached to running analysis.' });
                        pollStatus(initialRepoUrl);
                    }
                }).catch(err => console.error("Could not check initial status", err));
        } else {
            setHeatmapData([]);
            setFilteredAnalysisResults([]);
        }
    }, [initialRepoUrl]);

    // Effect για τον καθαρισμό του interval όταν το component φεύγει από την οθόνη
    useEffect(() => {
        return () => stopPolling();
    }, []);

    // Effect για τον υπολογισμό του slider του heatmap
    useEffect(() => {
        if (heatmapData.length > 0) {
            const timestamps = heatmapData.map(result => new Date(result.timestamp));
            const min = new Date(Math.min(...timestamps.map(d => d.getTime())));
            const max = new Date(Math.max(...timestamps.map(d => d.getTime())));
            setMinDate(min);
            setMaxDate(max);
            const monthsDiff = (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth());
            const total = Math.max(1, monthsDiff + 1);
            setTotalMonths(total);
            setSelectedMonths(total);
        }
    }, [heatmapData]);

    // Effect για το φιλτράρισμα των αποτελεσμάτων του heatmap
    useEffect(() => {
        if (heatmapData.length > 0 && maxDate) {
            const endDate = new Date(maxDate);
            const startDate = new Date(endDate);
            startDate.setMonth(endDate.getMonth() - (selectedMonths - 1));
            const filtered = heatmapData.filter(result => {
                const resultDate = new Date(result.timestamp);
                return resultDate >= startDate && resultDate <= endDate;
            });
            setFilteredAnalysisResults(filtered);
        } else {
            setFilteredAnalysisResults([]);
        }
    }, [heatmapData, selectedMonths, maxDate]);

    // --- RENDER ---
    const isAnalysisRunning = analysisState.status === 'starting' || analysisState.status === 'polling';

    return (
        <div className="flex flex-col gap-4 items-start">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4 w-full">
                <div>
                    <label htmlFor="repoUrl" className="block text-gray-700 mb-2">GitHub Repository URL</label>
                    <input
                        type="text"
                        id="repoUrl"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="https://github.com/user/repo"
                    />
                </div>
                <div>
                    <label htmlFor="commitLimit" className="block text-gray-700 mb-2">Commit Limit</label>
                    <input
                        type="number"
                        id="commitLimit"
                        value={commitLimit}
                        onChange={(e) => setCommitLimit(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="e.g., 50 (leave empty for all)"
                        min="1"
                    />
                </div>
                <div className="flex space-x-4">
                    <Button
                        type="button"
                        onClick={() => handleAnalysis(repoUrl)}
                        disabled={!repoUrl || isAnalysisRunning}
                    >
                        <GitCommitVertical className="mr-2 h-4 w-4" />
                        {isAnalysisRunning ? 'Analyzing...' : 'Start Analysis'}
                    </Button>
                    {/* ... (το άλλο κουμπί παραμένει ίδιο) ... */}
                </div>
            </form>

            {/* Μπάρα Προόδου */}
            {analysisState.status !== 'idle' && (
                <div className="w-full mt-4 p-4 border rounded-md">
                    <p className="font-semibold">Analyzing: {getRepoNameFromUrl(repoUrl)}</p>
                    <Progress value={analysisState.progress} className="h-4 my-2" />
                    <p className="text-sm text-gray-600">{analysisState.message}</p>
                </div>
            )}

            {/* Heatmap Section */}
            {initialHeatmapHandler && (
                <div className="mt-8 w-full">
                    {loadingHeatmap && <p>Loading analysis data...</p>}
                    {!loadingHeatmap && filteredAnalysisResults.length > 0 && (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Newest Date</span>
                                <span className="font-medium">{selectedMonths} Month(s)</span>
                                <span className="font-medium">Oldest Date</span>
                            </div>
                            <Slider
                                min={1}
                                max={totalMonths}
                                step={1}
                                value={[selectedMonths]}
                                onValueChange={(value) => setSelectedMonths(value[0])}
                                minDate={minDate?.toISOString()}
                                maxDate={maxDate?.toISOString()}
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