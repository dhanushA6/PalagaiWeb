import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Line, Circle, Rect, Image } from "react-konva";
import { useNavigate } from "react-router-dom";
import { getInterpolatedPoint, pointToLineDistance } from "../utils/drawingUtils";
import { calculateAccuracy, generateHeatmapData } from "../utils/evaluationUtils"; 
import TamilAudioPlayer from "./TamilAudioPlayer"; 
import "../styles/Palagai.css";  
import PerformanceOverlay from "./PerformanceOverlay";
import { convertPerformanceDataToTamil, convertPerformanceDataToEnglish, tamilToEnglish } from '../utils/tamilMapping';
import chokeSound from '../audio/chokeEffect.mp3';
import { generateTransliteration } from '../utils/tamilTransliterationGenerator';
import helpIcon from '../images/help.png';
import HelpOverlay from './HelpOverlay';
import TaskTimer from './TaskTimer';
import { TASK_TIMER_DURATION } from '../utils/constants';


const TEMPLATE_LINE_WIDTH = 5

const Palagai = ({ 
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

  const [savedShapes, setSavedShapes] = useState([]); 
  const [showPerformanceOverlay, setShowPerformanceOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLines, setUserLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScored, setIsScored] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [realtimeFeedback, setRealtimeFeedback] = useState(false);
  const [cursorMode, setCursorMode] = useState("default");
  const [showScoreOverlay, setShowScoreOverlay] = useState(false);
  const [lineAccuracy, setLineAccuracy] = useState({});
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1000, height: 300 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [templateBounds, setTemplateBounds] = useState({ minX: 0, minY: 0, maxX: 1000, maxY: 500 });
  const [charErrors, setCharErrors] = useState({});
  const [charSuccess, setCharSuccess] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [points, setPoints] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showGameComplete, setShowGameComplete] = useState(false);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TASK_TIMER_DURATION);
  
  const audioPlayerRef = useRef(null);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const audioRef = useRef(null);
  const audioTimeoutRef = useRef(null);

  // Load shape data based on task
  useEffect(() => {
    const loadShapeData = async () => {
      if (!task || !task.task) return;
      
      setLoading(true);
      try {
        // Get English mapping for the Tamil letter
        const englishMapping = tamilToEnglish(task.task);
        if (!englishMapping) {
          console.error(`No mapping found for Tamil letter: ${task.task}`);
          return;
        }

        // Load the shape data using the English mapping
        const shapeData = await import(`../data/${englishMapping}.json`);
        if (shapeData && shapeData.default) {
          const validShape = filterValidPaths(shapeData.default);
          setSavedShapes([validShape]);
          updateTemplateBounds(validShape);
        }
      } catch (error) {
        console.error("Error loading shape data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadShapeData();
  }, [task]);

  // Load performance data from localStorage on mount and when it changes 
  useEffect(() => {
    const loadPerformanceData = () => {
      const storedData = localStorage.getItem('tamilLetterPerformance');
      if (storedData) {
        const data = JSON.parse(storedData);
        setPerformanceData(data);
        const errors = {};
        const success = {};
        
        Object.entries(data).forEach(([char, stats]) => {
          const successRate = (stats.correct / stats.attempts) * 100;
          if (successRate >= 50) {
            success[char] = true;
          } else {
            errors[char] = true;
          }
        });
        
        setCharErrors(errors);
        setCharSuccess(success);
      }
    };

    loadPerformanceData();
    window.addEventListener('storage', loadPerformanceData);
    
    return () => {
      window.removeEventListener('storage', loadPerformanceData);
    };
  }, []);

  // Reset states when task changes
  useEffect(() => {
    resetStates();
  }, [task]);

  // Play audio when task changes
  useEffect(() => {
    if (audioPlayerRef.current && task) {
      audioPlayerRef.current.playAudio();
    }
  }, [task]);

  // Get current shape
  const getCurrentShape = () => {
    return savedShapes[0];
  };

  // Update canvas dimensions on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = Math.min(containerWidth*0.8, 1200);
        const newHeight = newWidth * 0.5;
        
        setCanvasDimensions({ width: newWidth, height: newHeight });
        
        const newScaleFactor = calculateScaleFactor(newWidth, newHeight);
        setScaleFactor(newScaleFactor);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [templateBounds]);

  // Calculate template bounds when a shape is selected
  const updateTemplateBounds = (shape) => { 
    if (shape && shape.shapes && shape.shapes.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      shape.shapes.forEach(shape => {
        for (let i = 0; i < shape.points.length; i += 2) {
          const x = shape.points[i];
          const y = shape.points[i + 1];
          
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      });
      
      const padding = 50;
      setTemplateBounds({
        minX: minX - padding,
        minY: minY - padding,
        maxX: maxX + padding,
        maxY: maxY + padding
      });
    }
  };

  // Function to calculate scale factor based on canvas size and template bounds
  const calculateScaleFactor = (width, height) => {
    const bounds = templateBounds;
    const templateWidth = bounds.maxX - bounds.minX;
    const templateHeight = bounds.maxY - bounds.minY;
    
    const widthScale = width / templateWidth;
    const heightScale = height / templateHeight;
    
    return Math.min(widthScale, heightScale, 2);
  };

  // Scale a single coordinate
  const scaleCoordinate = (coord, isX) => {
    const bounds = templateBounds;
    const center = isX 
      ? (bounds.minX + bounds.maxX) / 2
      : (bounds.minY + bounds.maxY) / 2;
    const canvasCenter = isX
      ? canvasDimensions.width / 2
      : canvasDimensions.height / 2;
    
    return canvasCenter + (coord - center) * scaleFactor;
  };

  // Scale an array of points
  const scalePoints = (points) => {
    if (!points) return [];
    
    const scaledPoints = [];
    for (let i = 0; i < points.length; i += 2) {
      scaledPoints.push(scaleCoordinate(points[i], true));
      scaledPoints.push(scaleCoordinate(points[i + 1], false));

    }
    return scaledPoints;
  };

  // Reset states when shape changes
  const resetStates = () => {
      setProgress(0);
      setCurrentPathIndex(0);
      setUserLines([]);
      setIsScored(false);
      setScoreData(null);
      setShowHeatmap(false);
      setLineAccuracy({});
      setCursorMode("default");
      setShowScoreOverlay(false);
  };

  // Add this function to filter out invalid paths and points
  const filterValidPaths = (shape) => {
    if (!shape || !shape.shapes) return shape;
    
    // Filter out paths with less than 4 points and process points
    const validShapes = shape.shapes.map(path => {
      if (!path.points || path.points.length < 4) return null;

      // Filter and process points
      const MIN_DISTANCE = 10; // Minimum distance between points
      const filteredPoints = [];
      
      // Always include first point
      filteredPoints.push(path.points[0], path.points[1]);
      
      // Process remaining points
      for (let i = 2; i < path.points.length; i += 2) {
        const prevX = filteredPoints[filteredPoints.length - 2];
        const prevY = filteredPoints[filteredPoints.length - 1];
        const currentX = path.points[i];
        const currentY = path.points[i + 1];
        
        // Skip if current point is NaN
        if (isNaN(currentX) || isNaN(currentY)) continue;
        
        // Calculate distance from previous point
        const distance = Math.sqrt(
          Math.pow(currentX - prevX, 2) + Math.pow(currentY - prevY, 2)
        );
        
        // Only add point if it's far enough from previous point
        if (distance >= MIN_DISTANCE) {
          filteredPoints.push(currentX, currentY);
        }
      }
      
      // Only return path if it has enough valid points
      return filteredPoints.length >= 4 ? {
        ...path,
        points: filteredPoints
      } : null;
    }).filter(Boolean); // Remove null paths
    
    return {
      ...shape,
      shapes: validShapes
    };
  };

  // Add function to calculate stroke length
  const calculateStrokeLength = (points) => {
    let length = 0;
    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i];
      const y1 = points[i + 1];
      const x2 = points[i + 2];
      const y2 = points[i + 3];
      length += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    return length;
  };

  // Modify animateGuide to use already filtered paths
  const animateGuide = (currentShape) => {
    if (!currentShape) return;
    
    // No need to filter again as paths are already filtered
    if (currentShape.shapes.length === 0) {
      console.warn("No valid paths found for this shape");
      return;
    }
    
    setIsAnimating(true);
    setCurrentPathIndex(0);
    setProgress(0);
    setCursorMode("guiding");
    animatePath(0, currentShape);
  };

  // Modify animatePath to use dynamic duration
  const animatePath = (pathIndex, currentShape) => {
    if (!currentShape || pathIndex >= currentShape.shapes.length) {
      setIsAnimating(false);
      setCursorMode("default");
      return;
    }

    const currentPath = currentShape.shapes[pathIndex];
    setCurrentPathIndex(pathIndex);
    let startTime = performance.now();

    // Calculate stroke length
    const points = scalePoints(currentPath.points);
    const strokeLength = calculateStrokeLength(points);
    
    // Base duration per unit length (adjust these values to control speed)
    const BASE_DURATION_PER_UNIT = 1; // milliseconds per unit length
    const MIN_DURATION = 500; // minimum duration in milliseconds
    const MAX_DURATION = 2000; // maximum duration in milliseconds
    
    // Calculate duration based on stroke length
    const duration = Math.min(
      Math.max(strokeLength * BASE_DURATION_PER_UNIT, MIN_DURATION),
      MAX_DURATION
    ) / animationSpeed;

    const animate = (time) => {
      if (!currentShape) {
        cancelAnimationFrame(animate);
        setIsAnimating(false);
        setCursorMode("default");
        return;
      }

      let elapsed = (time - startTime) / duration;
      
      if (elapsed > 1) {
        setProgress(1);
        setTimeout(() => {
          if (pathIndex + 1 < currentShape.shapes.length) {
            animatePath(pathIndex + 1, currentShape);
          } else {
            setIsAnimating(false);
            setCursorMode("default");
          }
        }, 300 / animationSpeed);
        return;
      }

      setProgress(elapsed);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  // Update getInterpolatedPoint to work with filtered points
  const getInterpolatedPoint = (points, progress) => {
    if (!points || points.length < 4) {

      return { x: 0, y: 0 };
    }

    // Ensure progress is a valid number between 0 and 1
    progress = Math.max(0, Math.min(1, progress));

    const totalPoints = points.length / 2;
    const targetIndex = Math.min(
      Math.floor(progress * (totalPoints - 1)),
      totalPoints - 2
    );

    // Ensure we have valid indices
    if (targetIndex < 0 || targetIndex >= totalPoints - 1) {
     
      return { x: 0, y: 0};
    }

    const x1 = points[targetIndex * 2];
    const y1 = points[targetIndex * 2 + 1];
    const x2 = points[(targetIndex + 1) * 2];
    const y2 = points[(targetIndex + 1) * 2 + 1];

    // Validate that all coordinates are valid numbers
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
   
      return { x: 0, y: 0 };
    }

    const segmentProgress = (progress * (totalPoints - 1)) % 1;

    return {
      x: x1 + (x2 - x1) * segmentProgress,
      y: y1 + (y2 - y1) * segmentProgress
    };
  };

  // Modified check drawing accuracy to work with scaled points
  const checkDrawingAccuracy = (x, y, currentShape) => {
    if (!currentShape || !realtimeFeedback) return "neutral";
    
    let minDistance = Infinity;
    let bestAccuracy = "neutral";
    
    currentShape.shapes.forEach((templateShape) => {
      if (!templateShape || !templateShape.points) return;
      
      const THRESHOLD_EXCELLENT = 5 * scaleFactor;
      const THRESHOLD_GOOD = 15 * scaleFactor;
      
      const scaledPoints = scalePoints(templateShape.points);
      
      for (let i = 0; i < scaledPoints.length - 2; i += 2) {
        const x1 = scaledPoints[i];
        const y1 = scaledPoints[i + 1];
        const x2 = scaledPoints[i + 2];
        const y2 = scaledPoints[i + 3];

        const distance = pointToLineDistance(x, y, x1, y1, x2, y2);
        
        if (distance < minDistance) {
          minDistance = distance;
          
          if (distance <= THRESHOLD_EXCELLENT) {
            bestAccuracy = "excellent";
          } else if (distance <= THRESHOLD_GOOD) {
            bestAccuracy = "good";
          }
        }
      }
    });
    
    return bestAccuracy;
  };

  const getCurrentTemplateStrokeWidth = (currentShape) => {
    if (!currentShape || currentPathIndex >= currentShape.shapes.length) {
      return TEMPLATE_LINE_WIDTH * scaleFactor;
    }
    return TEMPLATE_LINE_WIDTH * scaleFactor;
  };

  // Initialize audio on component mount
  useEffect(() => {
    audioRef.current = new Audio(chokeSound);
    audioRef.current.volume = 1.0;
    audioRef.current.loop = true;
 
  }, []);

  // Add function to start continuous audio
  const startContinuousAudio = () => {
    if (!isAudioEnabled || !audioRef.current) return;
    // Only play if not already playing
    if (audioRef.current.paused) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          // Optionally log error
        });
      } catch (error) {
        // Optionally log error
      }
    }
  };

  // Add function to stop continuous audio
  const stopContinuousAudio = () => {
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Add handleMouseDown function
  const handleMouseDown = (e, currentShape) => {
    setIsDrawing(true);
    setCursorMode("drawing");
    const pos = e.target.getStage().getPointerPosition();
    const templateStrokeWidth = getCurrentTemplateStrokeWidth(currentShape);
    const lineId = Date.now().toString();
    setUserLines((prev) => [...prev, { 
      id: lineId, 
      points: [pos.x, pos.y],
      strokeWidth: templateStrokeWidth
    }]);
    const accuracy = checkDrawingAccuracy(pos.x, pos.y, currentShape);
    setLineAccuracy(prev => ({
      ...prev,
      [lineId]: accuracy
    }));
    stopContinuousAudio();
  };

  // Add handleMouseUp function
  const handleMouseUp = () => {
    setIsDrawing(false);
    setCursorMode(isAnimating ? "guiding" : "default");
    stopContinuousAudio();
  };

  // Add handleMouseMove function
  const handleMouseMove = (e, currentShape) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    const lastLine = userLines[userLines.length - 1];
    if (!lastLine || lastLine.points.length < 2) return;

    const lastPointX = lastLine.points[lastLine.points.length - 2];
    const lastPointY = lastLine.points[lastLine.points.length - 1];

    const distance = Math.sqrt(Math.pow(point.x - lastPointX, 2) + Math.pow(point.y - lastPointY, 2));

    if (distance < 1) { // Threshold to detect actual movement
      return;
    }

    startContinuousAudio();

    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    audioTimeoutRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }, 150); // Stop audio after 150ms of no movement

    setUserLines((prev) => {
      const lastLine = prev[prev.length - 1];
      if (!lastLine) return prev;
      const newLastLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y]
      };
      return [...prev.slice(0, -1), newLastLine];
    });

    if (realtimeFeedback && userLines.length > 0) {
      const accuracy = checkDrawingAccuracy(point.x, point.y, currentShape);
      const currentLineId = userLines[userLines.length - 1].id;
      
      setLineAccuracy(prev => {
        let newAccuracy = prev[currentLineId] || "neutral";
        
        if (prev[currentLineId] === "excellent" && accuracy !== "excellent") {
          newAccuracy = accuracy;
        } else if (prev[currentLineId] === "good" && accuracy === "neutral") {
          newAccuracy = accuracy;
        } else if (!prev[currentLineId]) {
          newAccuracy = accuracy;
        }
        
        return {
          ...prev,
          [currentLineId]: newAccuracy
        };
      });
    }
  };

  // Add toggleAudio function
  const toggleAudio = () => {
   
    setIsAudioEnabled(!isAudioEnabled);
    if (!isAudioEnabled) {
      stopContinuousAudio();
    }
  };

  // Add cleanup for audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Modify calculateScore to include points calculation
  const calculateScore = (currentShape) => {
    if (!currentShape || userLines.length === 0) {
      alert("Please draw your shape first!");
      return;
    }

    const scaledTemplateShapes = currentShape.shapes.map(shape => ({
      ...shape,
      points: scalePoints(shape.points)
    }));

    const result = calculateAccuracy(scaledTemplateShapes, userLines);
    setScoreData(result);
    setIsScored(true);
    setShowScoreOverlay(true);
    
    // Calculate points based on accuracy
    const accuracyPoints = Math.round(result.score);
    setPoints(accuracyPoints);
    
    // Update performance data based on score
    const isCorrect = result.score >= 70;
    updatePerformanceData(task?.task, isCorrect); 
    
    if (isCorrect) {       
      if (!currentLevelCorrect[task?.task]) {
        setCurrentLevelCorrect(prev => ({
          ...prev,
          [task?.task]: (prev[task?.task] || 0) + 1
        })); 
      }
    } else {
      if (!currentLevelMistakes[task?.task]) {
        setCurrentLevelMistakes(prev => ({
          ...prev,
          [task?.task]: (prev[task?.task] || 0) + 1
        })); 
      }
    }
   
    if (stageRef.current) {
      const { width, height } = stageRef.current.getSize();
      if (width > 0 && height > 0) {
        try {
          const heatmap = generateHeatmapData(
            scaledTemplateShapes, 
            userLines, 
            Math.floor(width), 
            Math.floor(height)
          );
          setHeatmapData(heatmap);
        } catch (error) {
          console.error('Error generating heatmap:', error);
          setHeatmapData(null);
        }
      }
    }
  };

  const resetDrawing = () => {
    setUserLines([]);
    setIsScored(false);
    setScoreData(null);
    setShowHeatmap(false);
    setShowScoreOverlay(false);
    setLineAccuracy({});
    setCursorMode("default");
  };

  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setAnimationSpeed(newSpeed);
  };

  const getSpeedLabel = () => {
    if (animationSpeed === 0.5) return "Slow";
    if (animationSpeed === 1) return "Normal";
    if (animationSpeed === 2) return "Fast";
    if (animationSpeed === 3) return "Very Fast";
    return `${animationSpeed}x`;
  };

  // Render functions for UI elements
  const renderPenCursor = (type) => {
    const drawingPen = (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 28L4 24L18 10L22 14L8 28Z" fill="#4CAF50" stroke="#2E7D32" strokeWidth="2"/>
        <path d="M22 14L26 10C27.1046 8.89543 27.1046 7.10457 26 6L24 4C22.8954 2.89543 21.1046 2.89543 20 4L18 6L22 10L22 14Z" fill="#81C784" stroke="#2E7D32" strokeWidth="2"/>
        <circle cx="7" cy="25" r="2" fill="#E0E0E0"/>
      </svg>
    );
    
    const guidingPen = (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 28L4 24L18 10L22 14L8 28Z" fill="#FF5252" stroke="#D32F2F" strokeWidth="2"/>
        <path d="M22 14L26 10C27.1046 8.89543 27.1046 7.10457 26 6L24 4C22.8954 2.89543 21.1046 2.89543 20 4L18 6L22 10L22 14Z" fill="#FF8A80" stroke="#D32F2F" strokeWidth="2"/>
        <circle cx="7" cy="25" r="2" fill="#E0E0E0"/>
      </svg>
    );
    
    return type === "drawing" ? drawingPen : guidingPen;
  };

  // Get the English transliteration for the Tamil letter
  const getTransliteration = () => {
    if (!task || !task.task) return '';
    return tamilToEnglish(task.task);
  };

  // Update SHAPES array based on the task
  useEffect(() => {
    if (task && task.task) {
      const transliteration = getTransliteration();
      if (transliteration) {
        setSavedShapes([transliteration]);
      }
    }
  }, [task]);

  // Modify renderScoreOverlay to show different buttons based on accuracy
  const renderScoreOverlay = () => {
    if (!showScoreOverlay || !scoreData) return null;
    
    const isSuccess = charSuccess[task?.task];
    const isError = charErrors[task?.task];
    const showNextButton = scoreData.score >= 70;
    
    return (
      <div className="result-overlay">
        <div className="result-content">
          <div className="result-header">
            <h2>வரைதல் மதிப்பு</h2>
          </div>
          
          <div className={`result-circle ${showNextButton ? '' : 'error'}`}>
            <span className="result-number">{scoreData.score}%</span>
          </div>
          
            <p className="result-message">
          {scoreData.score >= 90 ? "அருமை!" :
          scoreData.score >= 85 ? "சிறப்பு!" :
          scoreData.score >= 70 ? "நன்று!" :
          scoreData.score >= 50 ? "முயற்சி தேவை!" :
          "பயிற்சி தொடருங்கள்!"}
          </p>
          
          <div className="score-metrics">
            <div className="score-metric">
              <span className="score-metric-label">வரைபாதை</span>
              <div className="score-metric-progress">
                <div 
                  className="score-metric-fill" 
                  style={{ width: `${scoreData.overlap}%` }}
                />
              </div>
              <span className="score-metric-value">{scoreData.overlap}%</span>
            </div>
            <div className="score-metric">
              <span className="score-metric-label">வரைவரிசை</span>
              <div className="score-metric-progress">
                <div 
                  className="score-metric-fill" 
                  style={{ width: `${scoreData.strokeOrder}%` }}
                />
              </div>
              <span className="score-metric-value">{scoreData.strokeOrder}%</span>
            </div>
            <div className="score-metric">
              <span className="score-metric-label">வரைவளவு</span>
              <div className="score-metric-progress">
                <div 
                  className="score-metric-fill" 
                  style={{ width: `${scoreData.proportion}%` }}
                />
              </div>
              <span className="score-metric-value">{scoreData.proportion}%</span>
            </div>
          </div>
          
          <div className="result-actions">
            {!showNextButton && (
              <button onClick={resetDrawing} className="action-btn try-again-btn">
                மீண்டும் முயல்க
              </button>
            )}
            {showNextButton && (
              <button 
                onClick={() => {
                  if (onComplete) {
                    mode === 'activity' ? onComplete(points, TASK_TIMER_DURATION) : onComplete(points);
                  }
                }}
                className="action-btn next-btn"
              >
                அடுத்து
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Create a heatmap canvas image
  const createHeatmapImage = (data, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, width, height);
    
    return canvas;
  };

  // Render heatmap overlay
  const renderHeatmap = () => {
    if (!showHeatmap || !heatmapData || !stageRef.current) return null;
    
    const { width, height } = stageRef.current.getSize();
    
    return (
      <Rect
        width={width}
        height={height}
        fillPatternImage={createHeatmapImage(heatmapData, width, height)}
        opacity={0.5}
      />
    );
  };

  const renderGameComplete = () => {
    if (!showGameComplete) return null;

    // Calculate average score across all letters
    const calculateAverageScore = () => {
      let totalScore = 0;
      let letterCount = 0;

      Object.entries(performanceData).forEach(([char, stats]) => {
        if (stats.attempts > 0) {
          const successRate = (stats.correct / stats.attempts) * 100;
          totalScore += successRate;
          letterCount++;
        }
      });

      return letterCount > 0 ? Math.round(totalScore / letterCount) : 0;
    };

    const averageScore = calculateAverageScore();
    const getScoreMessage = (score) => {
      if (score >= 90) return "Outstanding! You're a Tamil writing master!";
      if (score >= 75) return "Excellent! Your Tamil writing skills are very good!";
      if (score >= 60) return "Good job! Keep practicing to improve further.";
      if (score >= 50) return "Nice work! With more practice, you'll get even better.";
      return "Keep practicing! You'll improve with time.";
    };

    return (
      <div className="game-complete-overlay">
        <div className="game-complete-content">
          <h2>Game Complete!</h2>
          <div className="final-score">
            <div className="score-circle">
              <span className="score-number">{averageScore}%</span>
            </div>
            <p className="score-message">{getScoreMessage(averageScore)}</p>
          </div>
          <button 
            onClick={() => {
              setCurrentShapeIndex(0);
              setIsGameComplete(false);
              setShowGameComplete(false);
              resetStates();
              resetCurrentLevelPerformanceData();
            }}
            className="play-again-btn"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  };

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

  // Add the onShowPerformance function
  const onShowPerformance = () => {
    // Convert letterData to Tamil for display
    const convertedData = convertPerformanceDataToTamil(letterData);
    setPerformanceData(convertedData);
    setShowPerformanceOverlay(true);
  };

  // Memoize the filterValidPaths function
  const memoizedFilterValidPaths = React.useCallback((shape) => {
    if (!shape || !shape.shapes) return shape;
    
    // Filter out paths with less than 4 points and process points
    const validShapes = shape.shapes.map(path => {
      if (!path.points || path.points.length < 4) return null;

      // Filter and process points
      const MIN_DISTANCE = 10; // Minimum distance between points
      const filteredPoints = [];
      
      // Always include first point
      filteredPoints.push(path.points[0], path.points[1]);
      
      // Process remaining points
      for (let i = 2; i < path.points.length; i += 2) {
        const prevX = filteredPoints[filteredPoints.length - 2];
        const prevY = filteredPoints[filteredPoints.length - 1];
        const currentX = path.points[i];
        const currentY = path.points[i + 1];
        
        // Skip if current point is NaN
        if (isNaN(currentX) || isNaN(currentY)) continue;
        
        // Calculate distance from previous point
        const distance = Math.sqrt(
          Math.pow(currentX - prevX, 2) + Math.pow(currentY - prevY, 2)
        );
        
        // Only add point if it's far enough from previous point
        if (distance >= MIN_DISTANCE) {
          filteredPoints.push(currentX, currentY);
        }
      }
      
      // Only return path if it has enough valid points
      return filteredPoints.length >= 4 ? {
        ...path,
        points: filteredPoints
      } : null;
    }).filter(Boolean); // Remove null paths
    
    return {
      ...shape,
      shapes: validShapes
    };
  }, []);

  // Add effect to handle initial shape load and bounds
  useEffect(() => {
    if (savedShapes.length > 0) {
      const currentShape = getCurrentShape();
      if (currentShape) {
        // Process the shape
        const validShape = memoizedFilterValidPaths(currentShape);
        setSavedShapes(prevShapes => {
          const existingShape = prevShapes.find(shape => shape.id === validShape.id);
          if (existingShape && JSON.stringify(existingShape) === JSON.stringify(validShape)) {
            return prevShapes;
          }
          return prevShapes.map(shape => 
            shape.id === validShape.id ? validShape : shape
          );
        });

        // Update template bounds for the initial shape
        updateTemplateBounds(validShape);
      }
    }
  }, [savedShapes.length, memoizedFilterValidPaths]);

  // Add effect to update canvas dimensions when template bounds change
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newWidth = Math.min(containerWidth * 0.8, 1200);
      const newHeight = newWidth * 0.5;
      
      setCanvasDimensions({ width: newWidth, height: newHeight });
      
      const newScaleFactor = calculateScaleFactor(newWidth, newHeight);
      setScaleFactor(newScaleFactor);
    }
  }, [templateBounds]);

  // Add useEffect to load background image
  useEffect(() => {
    const img = new window.Image();
    img.src = require('../images/PalagaiBoard.jpg');
    img.onload = () => {
      setBackgroundImage(img);
    };
  }, []);

  // Add toggleHint function
  const toggleHint = () => {
    setShowHint(!showHint);
  };

  return (
    <div className="shapes-list">
      {!isGameComplete && (
        <>
          <div className="drawing-navbar">
            {mode === 'activity' && (
              <TaskTimer 
                duration={TASK_TIMER_DURATION} 
                onTimeUp={() => onComplete(0, TASK_TIMER_DURATION)} 
                keyProp={task?.taskid}
              />
            )}
            <div className="tool-selector">
              <button
                className="tool-btn"
                onClick={() => animateGuide(getCurrentShape())}
                disabled={isAnimating}
                title="Guide Me"
              >
                <img src={require('../images/guideMe.png')} alt="Guide" className="tool-icon" />
              </button>
              <button 
                className="reset-btn tool-btn"
                onClick={resetDrawing}
                disabled={userLines.length === 0}
                title="Reset"
              >
                <img src={require('../images/reset.png')} alt="Reset" className="tool-icon" />
              </button>
              <button
                className={`tool-btn ${isAudioEnabled ? 'active' : ''}`}
                onClick={toggleAudio}
                title={isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {!isAudioEnabled ? 
                  <img src={require('../images/mute.png')} alt="Mute" className="tool-icon" /> : 
                  <img src={require('../images/unmute.png')} alt="Unmute" className="tool-icon" />
                }
              </button>
              <button 
                className="tool-btn active"
                onClick={onShowPerformance}
                title="View Letter Performance"
              >
                <img className="tool-icon" src={require('../images/performance.png')} alt="Performance" />
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

          <div className="transliteration-box">
            <div className="transliteration-content">
              <div className="transliteration-left">
                <span className="transliteration-label">உச்சரிப்பு</span>
                <div className="transliteration-text">{generateTransliteration(task.task)}</div>
              </div>
              <div className="transliteration-right">
                <TamilAudioPlayer 
                  ref={audioPlayerRef}
                  selectedShapeId={getCurrentShape()?.id} 
                  task  = {task}
                />
              </div>
            </div>
          </div>

          <div className="practice-area">
            
            <div className="canvas-container" ref={containerRef}>
              <Stage
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                ref={stageRef}
                onMouseDown={(e) => handleMouseDown(e, getCurrentShape())}
                onMouseMove={(e) => handleMouseMove(e, getCurrentShape())}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={(e) => handleMouseDown(e, getCurrentShape())}
                onTouchMove={(e) => handleMouseMove(e, getCurrentShape())}
                onTouchEnd={handleMouseUp}
                className="practice-canvas"
                style={{ cursor: `url(${require('../images/chokeCursor.png')}) 0 0, auto` }}
              >
                <Layer>
                  {backgroundImage && (
                    <Image
                      image={backgroundImage}
                      width={canvasDimensions.width}
                      height={canvasDimensions.height}
                      x={0}
                      y={0}
                    />
                  )}
                  
                  {getCurrentShape()?.shapes?.map((shape, i) => (
                    <Line
                      key={`template-${i}`}
                      points={scalePoints(shape.points)}
                      stroke="rgba(250, 250, 250, 0.5)"
                      strokeWidth={TEMPLATE_LINE_WIDTH * scaleFactor}
                      lineJoin="round"
                      dash={[10 * scaleFactor, 10 * scaleFactor]}
                      tension={0.5}
                      bezier={true}
                    />
                  ))}
                  
                  {userLines.map((line, i) => (
                    <Line
                      key={`user-${i}`}
                      points={line.points}
                      stroke="rgba(217, 239, 48, 0.7)"
                      strokeWidth={line.strokeWidth || (TEMPLATE_LINE_WIDTH * scaleFactor)}
                      lineCap="round"
                      lineJoin="round"
                      tension={0.5}
                      bezier={true}
                    />
                  ))}
                  
                  {getCurrentShape() && isAnimating && getCurrentShape().shapes?.[currentPathIndex] && (
                    (() => {
                      const shape = getCurrentShape().shapes[currentPathIndex];
                      const points = scalePoints(shape.points);
                      const { x, y } = getInterpolatedPoint(points, progress);
                      return (
                        <>
                          <Circle 
                            x={x} 
                            y={y} 
                            radius={10 * Math.sqrt(scaleFactor)}
                            fill="rgba(123, 241, 59, 0.69)" 
                          />
                          <Circle 
                            x={x} 
                            y={y} 
                            radius={5 * Math.sqrt(scaleFactor)}
                            fill="rgba(123, 241, 59, 0.69)" 
                          />
                        </>
                      );
                    })()
                  )} 
                  
                  {showHeatmap && renderHeatmap()} 
                </Layer>
              </Stage> 
              <button
                className="calculate-score-btn"
                onClick={() => calculateScore(getCurrentShape())}
                disabled={userLines.length === 0 || isScored}
                title="Calculate Score"
              >
                <img src={require('../images/checked.png')} alt="Calculate" className="tool-icon" />
              </button>
              {renderScoreOverlay()}
            </div>
          </div>

          {/* Add temporary display */}
          <div className="temp-info-display">
            <div>Mode: {mode}</div>
            <div>UserID: {userID}</div>
            <div>Level: {level}</div>
          </div>
        </>
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
              setPerformanceData(JSON.parse(storedData));
            }
          }}
        />
      )}
      {showHelpOverlay && (
        <HelpOverlay onClose={() => setShowHelpOverlay(false)} />
      )}
    </div>
  );
};

export default Palagai;
