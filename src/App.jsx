import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Routes, Route, HashRouter as Router, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HelpPage from './pages/HelpPage';
import PalagaiAdv from './components/PalagaiAdv';
import Palagai from './components/Palagai';
import ScoreDisplay from './components/ScoreDisplay';
import { isTamilLetter } from './utils/tamilUtils';
import './App.css';
import ReactDOM from "react-dom/client";
import { preloadImages } from './utils/imageManifest';

// Create a context for user/game info
const GameInfoContext = createContext();

// Task Router Component
const TaskRouter = () => {
  const navigate = useNavigate();
  const { userID, levelValue, mode } = useContext(GameInfoContext);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [currentLevelMistakes, setCurrentLevelMistakes] = useState({});
  const [currentLevelCorrect, setCurrentLevelCorrect] = useState({});
  const [letterData, setLetterData] = useState({});
  const [taskMetrics, setTaskMetrics] = useState([]);
  const initialized = useRef(false);  

  useEffect(() => {
    if (userID && levelValue && mode) {
      fetchGameData(levelValue, userID, mode);
    }
  }, [userID, levelValue, mode]); 

  const fetchGameData = async (level, uid, mode) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ level, userid: uid, mode }).toString();
      const response = await fetch(`https://thambaa.karky.in:6128/thamba/game/palagai/play?${params}`);
      const data = await response.json();

      if (data.letters) {
        try {
          // Parse the letters data and set it to letterData state
          const parsedLetters = typeof data.letters === 'string' ? JSON.parse(data.letters) : data.letters;
          setLetterData(parsedLetters);
          console.log('Letters data loaded:', parsedLetters);
        } catch (parseErr) {
          console.error('Error parsing letters data:', parseErr);
          setLetterData({});
        }
      } else {
        setLetterData({});
      }

      setGameData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (points = 100, timeTaken = 0) => {
    setTotalScore(prev => prev + points);
    
    // Add current task metrics
    const currentTask = gameData.contents[currentIndex];
    const newTaskMetric = {
      task: currentTask.task,
      type: currentTask.type,
      taskid: currentTask.taskid,
      accuracy: points.toString(),
      wpm: "0",
      cpm: "0",
      timeTaken: timeTaken.toString(),
      found: "true"
    };
    
    setTaskMetrics(prev => [...prev, newTaskMetric]);
    
    // Check if this is the last task
    const isLastTask = currentIndex === gameData.contents.length - 1;
    
    if (!isLastTask) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All tasks completed, send data to API
      try {
        // Create URLSearchParams object for form-urlencoded data
        const formData = new URLSearchParams();
        formData.append('mode', mode);
        formData.append('userid', userID);
        formData.append('level', levelValue.toString());
        formData.append('contents', JSON.stringify([...taskMetrics, newTaskMetric])); // Include the last task metric
        formData.append('letters', JSON.stringify(letterData));

        // Print the form data before sending
        console.log('POST Request Body:');
        console.log('Form Data:', formData.toString());
        console.log('Mode:', mode);
        console.log('UserID:', userID);
        console.log('Level:', levelValue.toString());
        console.log('Contents:', JSON.stringify([...taskMetrics, newTaskMetric], null, 2));
        console.log('Letters:', JSON.stringify(letterData, null, 2));

        const response = await fetch('https://thambaa.karky.in:6128/thamba/game/palagai/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        });

        if (!response.ok) {
          throw new Error('Failed to update game data');
        }

        if (mode === "freeplay") {
          // In freeplay mode, fetch new data and reset states
          await fetchGameData(levelValue, userID, mode);
          setTotalScore(0);
          setTaskMetrics([]);
          setCurrentIndex(0); // Reset to first task
        } else {
          // For other modes, navigate to completion screen
          navigate('/game/complete', { 
            state: { 
              totalScore: totalScore + points,
              currentLevelMistakes,
              currentLevelCorrect,
              letterData,
              totalTasks: gameData?.contents?.length || 0,
              taskMetrics: [...taskMetrics, newTaskMetric] // Include the last task metric
            }
          }); 

          // Send completion message to parent if not in freeplay mode
          const allTaskMetrics = [...taskMetrics, newTaskMetric];
          const avgAccuracy = allTaskMetrics.length > 0 
            ? Math.round(allTaskMetrics.reduce((sum, task) => sum + Number(task.accuracy), 0) / allTaskMetrics.length)
            : 0;

          const timeTaken = allTaskMetrics.reduce((sum, task) => sum + Number(task.timeTaken), 0);

          const gameResult = {
            type: "levelComplete",
            data: {
              level: levelValue,
              timeTaken: timeTaken,
              points: avgAccuracy, // Using average accuracy as points
            },
          };
          
          window.parent.postMessage(gameResult, "*");
        }

      } catch (error) {
        console.error('Error updating game data:', error);
        // Still navigate to completion screen even if API call fails
        navigate('/game/complete', { 
          state: { 
            totalScore: totalScore + points,
            currentLevelMistakes,
            currentLevelCorrect,
            letterData,
            totalTasks: gameData?.contents?.length || 0,
            taskMetrics: [...taskMetrics, newTaskMetric] // Include the last task metric
          }
        }); 

       
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!gameData || !gameData.contents) return <div>No game data available</div>;

  const currentTask = gameData.contents[currentIndex];
  const shouldUsePalagai = (currentTask.type === "Teach" && isTamilLetter(currentTask.task));

  return shouldUsePalagai ? (
    <Palagai 
      task={currentTask}
      onComplete={handleTaskComplete}
      currentLevelMistakes={currentLevelMistakes}
      currentLevelCorrect={currentLevelCorrect}
      setCurrentLevelMistakes={setCurrentLevelMistakes}
      setCurrentLevelCorrect={setCurrentLevelCorrect}
      letterData={letterData}
      setLetterData={setLetterData}
      mode={mode}
      userID={userID}
      level={levelValue}
    />
  ) : (
    <PalagaiAdv 
      task={currentTask}
      onComplete={handleTaskComplete}
      currentLevelMistakes={currentLevelMistakes}
      currentLevelCorrect={currentLevelCorrect}
      setCurrentLevelMistakes={setCurrentLevelMistakes}
      setCurrentLevelCorrect={setCurrentLevelCorrect}
      letterData={letterData}
      setLetterData={setLetterData}
      mode={mode}
      userID={userID}
      level={levelValue}
    />
  );
};

// Completion Component
const CompletionScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const totalScore = location.state?.totalScore || 0;
  const currentLevelMistakes = location.state?.currentLevelMistakes || {};
  const currentLevelCorrect = location.state?.currentLevelCorrect || {};
  const letterData = location.state?.letterData || {};
  const totalTasks = location.state?.totalTasks || 0;
  const taskMetrics = location.state?.taskMetrics || [];

  return (
    <div className="completion-screen">
      <ScoreDisplay 
        score={totalScore} 
        totalTasks={totalTasks}
        currentLevelMistakes={currentLevelMistakes}
        currentLevelCorrect={currentLevelCorrect}
        letterData={letterData}
        taskMetrics={taskMetrics}
      />
    </div>
  );
};

// Main App Component
function App() {
  const [userID, setUserID] = useState(1);
  const [levelValue, setLevelValue] = useState(9);
  const [mode, setMode] = useState('activity');

  useEffect(() => {
    preloadImages();
    const handlePostMessage = (event) => {
      if (event.data && event.data.userID && event.data.levelValue && event.data.mode) {
        const { userID, levelValue, mode } = event.data;
        setUserID(userID);
        setLevelValue(levelValue);
        setMode(mode);
        console.log("Received userID:", userID, "levelValue:", levelValue, "mode:", mode);
      } else {
        console.warn("Invalid message received:", event.data);
      }
    };

    window.addEventListener("message", handlePostMessage);

    return () => {
      window.removeEventListener("message", handlePostMessage);
    };
  }, []);

  return (
    <GameInfoContext.Provider value={{ userID, levelValue, mode }}>
      <Router basename={process.env.PUBLIC_URL}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/game" element={<TaskRouter />} />
          <Route path="/game/complete" element={<CompletionScreen />} />
        </Routes>
      </Router>
    </GameInfoContext.Provider>
  );
}

const rootElement = document.getElementById("app");
if (!rootElement) throw new Error("Failed to find the root element");

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

export default App;