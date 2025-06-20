import React, { useRef, useState, useEffect } from 'react';
import "../styles/PalagaiAdv.css"; 
import "../styles/ResultOverlay.css";
import penIcon from '../images/pen.png';
import eraserIcon from '../images/eraser.png';
import clearIcon from '../images/reset.png';
import checkedIcon from '../images/checked.png';
import submitIcon from '../images/submit.png';
import PerformanceOverlay from './PerformanceOverlay';
import TaskTimer from './TaskTimer';
import { TASK_TIMER_DURATION } from '../utils/constants';

import { isTamilLetter } from '../utils/tamilUtils';
import TamilAudioPlayer from './TamilAudioPlayer';
import TamilTextToSpeech from './TamilTextToSpeech';
import { generateTransliteration } from '../utils/tamilTransliterationGenerator';
import hintIcon from '../images/hint.png'
import helpIcon from '../images/help.png';
import HelpOverlay from './HelpOverlay';
import { convertPerformanceDataToTamil, convertPerformanceDataToEnglish, tamilToEnglish } from '../utils/tamilMapping';


const PalagaiAdv = ({ 
  task, 
  onComplete, 
  currentLevelMistakes, 
  currentLevelCorrect,
  setCurrentLevelMistakes,
  setCurrentLevelCorrect,
  letterData,
  setLetterData,
  mode,
  userID,
  level
}) => {
  const [canvasData, setCanvasData] = useState({ dataURL: null, prediction: null });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showPredictionOverlay, setShowPredictionOverlay] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [score, setScore] = useState(0);
  const [showNoDrawingMessage, setShowNoDrawingMessage] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isHintSeen , setISHintSeen] = useState(false);
  const [showPerformanceOverlay, setShowPerformanceOverlay] = useState(false);
  const [performanceData, setPerformanceData] = useState({});
  const [hasAttempted, setHasAttempted] = useState(false);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TASK_TIMER_DURATION);

  // Dummy questions for now
  const questions = [
    {
      task: task?.task || "ட்",
      type: task?.type || "Teach",
      taskid: task?.taskid || "TIDP0001",
      transliteration: task?.transliteration ||"t",
      isword: false
    }
  ];

  const canvasRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    // Reset component state when the task changes
    setShowHint(false);
    setISHintSeen(false);
    clearCanvas();
    setFeedback(null);
    setHasAttempted(false);
    setShowPredictionOverlay(false);
  }, [task]);

  // Update canvas setup in useEffect
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
      
      // Get the container's dimensions
      const container = canvasElement.parentElement;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Set canvas size to match container
      canvasElement.width = containerWidth;
      canvasElement.height = containerHeight;
      
      // Set canvas styling
      ctx.lineWidth = currentTool === 'pen' ? 3 : 40;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Make canvas transparent
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      // Restore drawing if dataURL exists
      if (canvasData.dataURL) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
        };
        img.src = canvasData.dataURL;
      }
    }
  }, [canvasData, currentTool]);

  const getCanvasCoordinates = (e, canvasElement) => {
    const rect = canvasElement.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate the position relative to the canvas element
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Ensure coordinates are within canvas bounds
    const boundedX = Math.max(0, Math.min(x, canvasElement.width));
    const boundedY = Math.max(0, Math.min(y, canvasElement.height));
    
    return {
      x: boundedX,
      y: boundedY
    };
  };

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvasElement = canvasRef.current;
      if (canvasElement) {
        const container = canvasElement.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Update canvas size
        canvasElement.width = containerWidth;
        canvasElement.height = containerHeight;
        
        // Redraw canvas content if it exists
        if (canvasData.dataURL) {
          const ctx = canvasElement.getContext('2d');
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
          };
          img.src = canvasData.dataURL;
        }
      }
    };

    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasData]);

  // Drawing functions
  const startDrawing = (e) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    ctx.lineWidth = currentTool === 'pen' ? 3 : 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
    }
    
    const coords = getCanvasCoordinates(e, canvasElement);
    setIsDrawing(true);
    setLastPosition(coords);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    const coords = getCanvasCoordinates(e, canvasElement);
    
    if (currentTool === 'eraser') {
      // For eraser, use destination-out composite operation
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      // For pen, use normal composite operation
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
    }
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    // Update last position
    setLastPosition(coords);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvasElement = canvasRef.current;
      if (canvasElement) {
        const ctx = canvasElement.getContext('2d');
        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
        
        // Save the canvas data
        const dataURL = canvasElement.toDataURL('image/png');
        setCanvasData(prev => ({ ...prev, dataURL }));
      }
      setIsDrawing(false);
    }
  };

  // Touch event handlers
  const handleTouchStart = (e) => {
    e.preventDefault();
    startDrawing(e);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    draw(e);
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      const ctx = canvasElement.getContext('2d');
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      setCanvasData({ dataURL: null, prediction: null });
    }
  };

  // Predict drawing
  const predictDrawing = async () => {
    const canvasElement = canvasRef.current;
    if (!canvasElement || !canvasData.dataURL) {
      setShowNoDrawingMessage(true);
      setTimeout(() => {
        setShowNoDrawingMessage(false);
      }, 2000);
      return;
    }

    setIsLoading(true);
    
    try {
      // Create a temporary canvas to prepare the image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasElement.width;
      tempCanvas.height = canvasElement.height;
      const tempCtx = tempCanvas.getContext('2d');

      // Fill with black background
      tempCtx.fillStyle = '#000000';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw the original canvas to temp canvas
      tempCtx.drawImage(canvasElement, 0, 0);

      // Get the image data
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const pixelData = imageData.data;

      // Convert white drawing to black for prediction
      for (let i = 0; i < pixelData.length; i += 4) {
        // If the pixel is white (or close to white), make it black
        if (pixelData[i] > 200 && pixelData[i + 1] > 200 && pixelData[i + 2] > 200) {
          pixelData[i] = 0;     // red
          pixelData[i + 1] = 0; // green
          pixelData[i + 2] = 0; // blue
        } else {
          // Make everything else white
          pixelData[i] = 255;     // red
          pixelData[i + 1] = 255; // green
          pixelData[i + 2] = 255; // blue
        }
      }

      // Put the processed image data back
      tempCtx.putImageData(imageData, 0, 0);

      // Get the processed image data URL
      const processedDataURL = tempCanvas.toDataURL('image/png');
      console.log(processedDataURL)
      const response = await fetch('http://139.162.15.203:10000/recognize_words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images: [processedDataURL] })
      });
      
      const responseData = await response.json();
      
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      if (!responseData.predictions || !responseData.predictions[0]) {
        throw new Error('No prediction received from server');
      }
      
      const prediction = {
        word: responseData.predictions[0].word,
        confidence: responseData.predictions[0].confidence
      };
      
      setCanvasData(prev => ({
        ...prev,
        prediction
      }));
      
      // Show prediction overlay
      setShowPredictionOverlay(true);
      
      // Check if prediction is correct
      const currentTask = questions[currentQuestionIndex];
      const isCorrect = prediction.word.trim() === currentTask.task;
      
      // Only update performance on first attempt
      if (!hasAttempted) {
        if (isTamilLetter(currentTask.task)) {
          updatePerformanceData(currentTask.task, isCorrect);
          
          // Update current level tracking
          if (isCorrect) {
            if (!currentLevelCorrect[currentTask.task]) {
              setCurrentLevelCorrect(prev => ({
                ...prev,
                [currentTask.task]: (prev[currentTask.task] || 0) + 1
              }));
            }
          } else {
            if (!currentLevelMistakes[currentTask.task]) {
              setCurrentLevelMistakes(prev => ({
                ...prev,
                [currentTask.task]: (prev[currentTask.task] || 0) + 1
              }));
            }
          }
        } else {
          // For word tasks, update each letter's performance
          handleWordPerformance(currentTask.task, isCorrect);
          
          // Update current level tracking for each letter in the word
          const letters = parseTamilText(currentTask.task);
          letters.forEach(letter => {
            if (letter !== " ") {
              if (isCorrect) {
                if (!currentLevelCorrect[letter]) {
                  setCurrentLevelCorrect(prev => ({
                    ...prev,
                    [letter]: (prev[letter] || 0) + 1
                  }));
                }
              } else {
                if (!currentLevelMistakes[letter]) {
                  setCurrentLevelMistakes(prev => ({
                    ...prev,
                    [letter]: (prev[letter] || 0) + 1
                  }));
                }
              }
            }
          });
        }
        setHasAttempted(true);
      }
      
    } catch (error) {
      console.error('Error during prediction:', error);
      setFeedback({
        error: true,
        message: error.message || 'Error predicting drawing'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add parseTamilText function
  const parseTamilText = (text) => {
    if (!text) return [];

    const result = [];
    let i = 0;

    // Include both "க்ஷ" and "க்ஷ்" to catch both cases
    const specialClusters = ["க்ஷௌ", "க்ஷோ", "க்ஷொ", "க்ஷை", "க்ஷே", "க்ஷெ", "க்ஷூ", "க்ஷு", "க்ஷீ", "க்ஷி", "க்ஷா", "ஸ்ரீ", "க்ஷ்", "க்ஷ"]

    while (i < text.length) {
      try {
        let matched = false;

        for (const cluster of specialClusters) {
          if (text.slice(i, i + cluster.length) === cluster) {
            result.push(cluster);
            i += cluster.length;
            matched = true;
            break;
          }
        }

        if (matched) continue;

        if (text[i] === " ") {
          result.push(" ");
          i += 1;
        } else if (
          i + 1 < text.length &&
          /[\u0bbe-\u0bcd\u0bd7]/.test(text[i + 1])
        ) {
          result.push(text[i] + text[i + 1]);
          i += 2;
        } else {
          result.push(text[i]);
          i += 1;
        }
      } catch (error) {
        console.error("Error parsing Tamil text:", error);
        i += 1;
      }
    }
    return result;
  };

  // Update handleWordPerformance to use parseTamilText
  const handleWordPerformance = (word, isCorrect) => {
    // Parse word into individual Tamil characters
    const letters = parseTamilText(word);
    letters.forEach(letter => {
      if (letter !== " ") { // Skip spaces
        updatePerformanceData(letter, isCorrect);
      }
    });
  };

  // Update handlePredictionResponse
  const handlePredictionResponse = (isCorrect) => {
    if (isCorrect) {
      setScore(prev => prev + 100);
    }
  };

  // Add moveToNext function
  const moveToNext = () => {
    if (onComplete) {
      // If the answer is correct and hint was shown, give 75 points, else 100
      
      const points = checkPrediction() ? (isHintSeen ? 75 : 100) : 0;
      mode === 'activity' ? onComplete(points, TASK_TIMER_DURATION - timeLeft) : onComplete(points);
    }
    setShowPredictionOverlay(false);
    clearCanvas();
    setFeedback(null);
    setHasAttempted(false);
  };

  // Add mapping for equivalent Tamil letters
  const equivalentTamilLetters = {
    'ஔ': ['ஒள'],
    'ஒள': ['ஔ']
  };

  // Add special symbols for ஃ validation
  const aythamSymbols = ['ர', 'டு', 'ெ', 'ே', 'ப'];

  // Helper function to check if prediction contains any aytham symbols
  const containsAythamSymbol = (prediction) => {
    return aythamSymbols.some(symbol => prediction.includes(symbol));
  };

  // Update checkPrediction to handle null cases, equivalent letters, and special ஃ validation
  const checkPrediction = () => {
    if (!canvasData.prediction || !canvasData.prediction.word) return false;
    
    const predictedWord = canvasData.prediction.word.trim();
    const correctAnswer = questions[currentQuestionIndex].task;
    
    // Special validation for ஃ
    if (correctAnswer === 'ஃ') {
      // Check if any of the special symbols are present in the prediction
      return containsAythamSymbol(predictedWord);
    }
    
    // If it's a letter task, check for exact match or equivalent letters
    if (isTamilLetter(correctAnswer)) {
      if (predictedWord === correctAnswer) return true;
      // Check if the predicted word is an equivalent of the correct answer
      return equivalentTamilLetters[correctAnswer]?.includes(predictedWord) || false;
    }
    
    // For word tasks, parse both predicted and correct answer
    const predictedLetters = parseTamilText(predictedWord);
    const correctLetters = parseTamilText(correctAnswer);
    
    // Compare arrays of letters
    if (predictedLetters.length !== correctLetters.length) return false;
    
    return predictedLetters.every((letter, index) => {
      const correctLetter = correctLetters[index];
      if (letter === correctLetter) return true;
      // Check if the predicted letter is an equivalent of the correct letter
      return equivalentTamilLetters[correctLetter]?.includes(letter) || false;
    });
  };

  // Update performance tracking functions
  const updatePerformanceData = (char, isCorrect) => {
    const newLetterData = { ...letterData };
    
    if (!newLetterData[char]) {
      newLetterData[char] = { attempts: 0, correct: 0 };
    }
    
    newLetterData[char].attempts += 1;
    if (isCorrect) {
      newLetterData[char].correct += 1;
    }
    
    setLetterData(newLetterData);
    
    // Convert to Tamil for display
    const convertedData = convertPerformanceDataToTamil(newLetterData);
    setPerformanceData(convertedData);
  };

  // Add onShowPerformance function
  const onShowPerformance = () => {
    // Convert letterData to Tamil for display
    const convertedData = convertPerformanceDataToTamil(letterData);
    setPerformanceData(convertedData);
    setShowPerformanceOverlay(true);
  };

  // Get question text based on task type
  const getQuestionText = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const transliteration = generateTransliteration(currentQuestion.task);
    console.log(transliteration, currentQuestion.task)
    
    if (!isTamilLetter(currentQuestion.task)) {
      if (currentQuestion.type === "Teach") {
        return `Draw the Tamil word: ${currentQuestion.task}`;
      } else {
        return `Draw the Tamil word with transliteration: ${transliteration}`;
      }
    } else {
      return `Draw the Tamil letter with transliteration: ${transliteration}`;
    }
  };

  // Toggle hint visibility
  const toggleHint = () => {
    setShowHint(!showHint);
    setISHintSeen(true);
  };

 const handleHelp = () => {
    navigate("/help"); // Redirect to the help page
  };

  // Get hint content length class
  const getHintLengthClass = (text) => {
    if (text.length > 20) return "very-long";
    if (text.length > 10) return "long";
    return "";
  };

  return (
    <div className="tamil-app-container">
      <div className="game-content">
        {/* Buttons at top */}
        <div className="drawing-navbar">
          {mode === 'activity' && (
            <TaskTimer 
              duration={TASK_TIMER_DURATION} 
              onTimeUp={() => onComplete(0, TASK_TIMER_DURATION)} 
              keyProp={task?.taskid}
              onTick={setTimeLeft}
            />
          )}
          <div className="tool-selector">
            <button 
              onClick={() => setCurrentTool('pen')} 
              className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
              title="Pen Tool"
            >
              <img src={penIcon} alt="Pen" className="tool-icon" />
            </button>
            <button 
              onClick={() => setCurrentTool('eraser')} 
              className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              title="Eraser Tool"
            >
              <img src={eraserIcon} alt="Eraser" className="tool-icon" />
            </button>
            <button 
              onClick={clearCanvas} 
              className="tool-btn active"
              title="Clear Canvas"
            >
              <img src={clearIcon} alt="Clear" className="tool-icon" />
            </button>
            <div className="palagai-hint-wrapper">
              <button 
                onClick={toggleHint}
                className="tool-btn active"
                title="Show Hint"
              >
                <img src={hintIcon} alt="Show" />
              </button>
              {showHint && (
                <div 
                  className={`palagai-hint-popup visible`}
                  data-length={getHintLengthClass(questions[currentQuestionIndex].task)}
                >
                  {questions[currentQuestionIndex].task}
                </div>
              )}
            </div>
            <button 
              className="performance-button"
              onClick={onShowPerformance}
              title="View Letter Performance"
            >
              <img src={require('../images/performance.png')} alt="Performance" className='tool-icon' />
            </button>
            <button 
              className="tool-btn active"
              onClick={() => setShowHelpOverlay(true)}
              title="Help"
            >
              <img src={helpIcon} alt="Help" className="tool-icon" />
            </button>
          </div>
        </div>

        {/* Question section */}
        <div className="prompt-card">
          <div className="prompt-text">
            {getQuestionText()}
            {isTamilLetter(questions[currentQuestionIndex].task) ? (
              <TamilAudioPlayer 
                ref={audioPlayerRef}
                selectedShapeId={tamilToEnglish(questions[currentQuestionIndex].task)}
              />
            ) : (
              <TamilTextToSpeech 
                text={questions[currentQuestionIndex].task}
              />
            )}
          </div>
        </div>

        {/* Drawing area with board background */}
        <div className="drawing-area">
          <canvas
            ref={canvasRef}
            className="canvas-container"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDrawing}
          />
          <button 
            onClick={predictDrawing} 
            className="submit-btn"
            disabled={isLoading}
            title="Predict Drawing"
          >
            <img src={checkedIcon} alt="Submit" className="btn-icon" />
          </button>
        </div>

        {/* Prediction Overlay */}
        {showPredictionOverlay && canvasData.prediction && (
          <div className="result-overlay">
            <div className="result-content">
              <div className="result-header">
                <h2>Prediction Result</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowPredictionOverlay(false)}
                >
                  ×
                </button>
              </div>
              
              <div className={`result-circle ${checkPrediction() ? '' : 'error'}`}>
              <span className="result-number">
  {checkPrediction() ? (isHintSeen ? '75' : '100') : '0'}
</span>

              </div>
              
              <div className="result-details">
                <div className="result-item">
                  <span>Predicted Word</span>
                  <span className="result-value">
                    {questions[currentQuestionIndex].task === 'ஃ' && containsAythamSymbol(canvasData.prediction.word) 
                      ? 'ஃ' 
                      : canvasData.prediction.word}
                  </span>
                </div>
                <div className="result-item">
                  <span>Confidence</span>
                  <span className="result-value">{canvasData.prediction.confidence}%</span>
                </div>
              </div>

              <p className="result-message">
                {checkPrediction() ? (
                  "Correct! Your drawing matches the letter perfectly!"
                ) : (
                  "Please ensure your drawing has no overlaps and matches the letter shape"
                )}
              </p>

              <div className="result-actions">
                {checkPrediction() ? (
                  <button 
                    className="action-btn next-btn"
                    onClick={moveToNext}
                  >
                    Next Task
                  </button>
                ) : (
                  <button 
                    className="action-btn try-again-btn"
                    onClick={() => setShowPredictionOverlay(false)}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Drawing Message */}
        {showNoDrawingMessage && (
          <div className="no-drawing-message">
            No drawing to predict
          </div>
        )}

        {/* Feedback Message */}
        {feedback && (
          <div className={`feedback-message ${feedback.correct ? 'correct' : 'incorrect'}`}>
            {feedback.message}
          </div>
        )}

        {showPerformanceOverlay && (
          <PerformanceOverlay 
            onClose={() => setShowPerformanceOverlay(false)}
            performanceData={performanceData}
            currentLevelMistakes={currentLevelMistakes}
            currentLevelCorrect={currentLevelCorrect}
            onUpdate={() => {
              const storedData = localStorage.getItem('tamilLetterPerformance');
              if (storedData) {
                setLetterData(JSON.parse(storedData));
              }
            }}
          />
        )}

        {showHelpOverlay && (
          <HelpOverlay onClose={() => setShowHelpOverlay(false)} />
        )}

        {/* Add temporary display */}
        <div className="temp-info-display">
          <div>Mode: {mode}</div>
          <div>UserID: {userID}</div>
          <div>Level: {level}</div>
        </div>
      </div>
    </div>
  );
};

export default PalagaiAdv;