import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Line, Circle, Rect } from "react-konva";
import { useNavigate } from "react-router-dom";
import { getInterpolatedPoint, pointToLineDistance } from "../utils/drawingUtils";
import { calculateAccuracy, generateHeatmapData } from "../utils/evaluationUtils"; 
import TamilAudioPlayer from "./TamilAudioPlayer"; 
import "../styles/ShapesList.css";  
import PerformanceOverlay from "./PerformanceOverlay";
import { convertPerformanceDataToTamil, convertPerformanceDataToEnglish } from '../utils/tamilMapping';
import { data } from "autoprefixer";
import chokeSound from '../audio/chokeEffect.mp3';
// Define the shapes list
// const SHAPES = ['a', 'aa', 'e', 'ee',  'ka', 'ra', 'pa', 'maa', 'ow', 'oa', 'ba', 'da', 'la', 'kaa', 'may', 'ke', 'so'];
const SHAPES = ['a', 'aa', 'i', 'u', 'e', 'ae', 'ai', 'o','oa', 'ow'];

const TEMPLATE_LINE_WIDTH = 5;

const ShapesList = () => {
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
  
  const [templateBounds, setTemplateBounds] = useState({ minX: 0, minY: 0, maxX: 1000, maxY: 500 });
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [showGameComplete, setShowGameComplete] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [charErrors, setCharErrors] = useState({});
  const [charSuccess, setCharSuccess] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [currentLevelMistakes, setCurrentLevelMistakes] = useState({});
  const [currentLevelCorrect, setCurrentLevelCorrect] = useState({});
  
  const audioPlayerRef = useRef(null);
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const audioRef = useRef(new Audio(chokeSound));
  const audioIntervalRef = useRef(null);

  // Load all shapes on component mount
  useEffect(() => {
    const loadAllShapes = async () => {
      setLoading(true);
      try {
        const loadedShapes = await Promise.all(
          SHAPES.map(async (shapeId) => {
            const data = await loadShapeData(shapeId);
            return data;
          })
        );
        
        const flattenedShapes = loadedShapes
          .filter(shape => shape !== null)
          .flatMap(shape => Array.isArray(shape) ? shape : [shape]);
          
        setSavedShapes(flattenedShapes);
      } catch (error) {
        console.error("Error loading shapes:", error);
        setSavedShapes([]);
      } finally {
        setLoading(false);
      }
    };
  
    loadAllShapes();
  }, []);

  // Load performance data from localStorage on mount and when it changes 
  const loadShapeData = async (shapeId) => {
    try {
      const shapeData = await import(`../data/${shapeId}.json`);
      return shapeData.default || shapeData;
    } catch (error) {
      console.error(`Error loading shape data for ${shapeId}:`, error);
      return null;
    }
  }; 
  // load the data 
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
    // Add event listener for storage changes
    window.addEventListener('storage', loadPerformanceData);
    
    return () => {
      window.removeEventListener('storage', loadPerformanceData);
    };
  }, []);

  // Update current shape data when shape index changes
  useEffect(() => {
    const updateBounds = async () => {
      if (currentShapeIndex < SHAPES.length) { 
        const currentShape = getCurrentShape();
        if (currentShape && currentShape.shapes) {
          console.log("Updating bounds for shape:", currentShape.id);
          updateTemplateBounds(currentShape);
        }
      }
    };
    
    updateBounds();
  }, [currentShapeIndex, savedShapes]);


  // Reset states when shape changes
  useEffect(() => {
    resetStates();
  }, [currentShapeIndex]); 


    // Play audio when shape changes
    useEffect(() => {
      if (audioPlayerRef.current && getCurrentShape()) {
        audioPlayerRef.current.playAudio();
      }
    }, [currentShapeIndex, isGameStarted]); 

    const getCurrentShape = () => {
      if (currentShapeIndex >= SHAPES.length) return null;
      return savedShapes.find(shape => shape.id === SHAPES[currentShapeIndex]);
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

  // Animate guide dot
  const animateGuide = (currentShape) => {
    if (!currentShape) return;
    
    setIsAnimating(true);
    setCurrentPathIndex(0);
    setProgress(0);
    setCursorMode("guiding");
    animatePath(0, currentShape);
  };

  // Animate a single path
  const animatePath = (pathIndex, currentShape) => {
    if (!currentShape || pathIndex >= currentShape.shapes.length) {
      setIsAnimating(false);
      setCursorMode("default");
      return;
    }

    setCurrentPathIndex(pathIndex);
    let startTime = performance.now();
    const baseDuration = 2000;
    const duration = baseDuration / animationSpeed;

    // Get the points for the current stroke
    const points = scalePoints(currentShape.shapes[pathIndex].points);
    // Filter out points that are too close to each other
    const filteredPoints = [];
    const MIN_DISTANCE = 5 * scaleFactor; // Minimum distance between points
    
    for (let i = 0; i < points.length; i += 2) {
      if (i === 0) {
        // Always include the first point
        filteredPoints.push(points[i], points[i + 1]);
      } else {
        const prevX = filteredPoints[filteredPoints.length - 2];
        const prevY = filteredPoints[filteredPoints.length - 1];
        const currentX = points[i];
        const currentY = points[i + 1];
        
        // Calculate distance between current and previous point
        const distance = Math.sqrt(
          Math.pow(currentX - prevX, 2) + Math.pow(currentY - prevY, 2)
        );
        
        // Only add point if it's far enough from the previous point
        if (distance >= MIN_DISTANCE) {
          filteredPoints.push(currentX, currentY);
        }
      }
    }

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
        }, 50 / animationSpeed);
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

  // Add function to start continuous audio with overlapping
  const startContinuousAudio = () => {
    if (isAudioEnabled) {
      // Create a new audio instance for overlapping
      const newAudio = new Audio(chokeSound);
      newAudio.play().catch(err => console.log('Audio play failed:', err));
      
      // Store the new audio instance
      audioRef.current = newAudio;
      
      // Set up interval to play new audio before the current one ends
      audioIntervalRef.current = setInterval(() => {
        if (isDrawing) {
          const nextAudio = new Audio(chokeSound);
          nextAudio.play().catch(err => console.log('Audio play failed:', err));
          audioRef.current = nextAudio;
        }
      }, 100); // Play new audio every 500ms for continuous effect
    }
  };

  // Add function to stop continuous audio
  const stopContinuousAudio = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

   useEffect(()=>{
    if(isDrawing){
      startContinuousAudio();
    }else{
      stopContinuousAudio();
    }
   },[])
  // Modify handleMouseDown
  const handleMouseDown = (e, currentShape) => {
    setIsDrawing(true);
    setCursorMode("drawing");
    const pos = e.target.getStage().getPointerPosition();
    
    startContinuousAudio();
    
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
  };

  // Modify handleMouseUp
  const handleMouseUp = () => {
    setIsDrawing(false);
    setCursorMode(isAnimating ? "guiding" : "default");
    stopContinuousAudio();
  };

  // Modify handleMouseMove to remove audio play
  const handleMouseMove = (e, currentShape) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
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

  // Modify toggleAudio function
  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (isAudioEnabled) {
      stopContinuousAudio();
    }
  };

  // Add cleanup for audio
  useEffect(() => {
    return () => {
      stopContinuousAudio();
    };
  }, []);

  // Modify calculateScore to include performance tracking
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
    
    // Update performance data based on score
    const isCorrect = result.score >= 50;
    const currentId = getCurrentId();
    updatePerformanceData(currentId, isCorrect); 
    
    if (isCorrect) {       
      if (!currentLevelCorrect[currentId]) {
        setCurrentLevelCorrect(prev => ({
          ...prev,
          [currentId]: (prev[currentId] || 0) + 1
        })); 
      }
    } else {
      if (!currentLevelMistakes[currentId]) {
        setCurrentLevelMistakes(prev => ({
          ...prev,
          [currentId]: (prev[currentId] || 0) + 1
        })); 
      }
    }
   
    if (stageRef.current) {
      const { width, height } = stageRef.current.getSize();
      // Ensure we have valid dimensions
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

  const moveToNextShape = () => {
    if (currentShapeIndex < SHAPES.length - 1) {
      // Reset states before moving to next shape
      resetStates();
      
      // Move to next shape
      setCurrentShapeIndex(prev => prev + 1);
      setShowScoreOverlay(false);
    } else {
      setIsGameComplete(true);
      setShowGameComplete(true);
    }
  };

  const retryCurrentShape = () => {
    resetStates();
  };


  const getCurrentId = () => {
    return SHAPES[currentShapeIndex];
  };

  // Modify renderScoreOverlay to show success/error status
  const renderScoreOverlay = (moveToNextShape) => {
    if (!showScoreOverlay || !scoreData) return null;
    
    const currentChar = getCurrentId();
    const isSuccess = charSuccess[currentChar];
    const isError = charErrors[currentChar];
    
    return (
      <div className="score-overlay">
        <div className="score-overlay-content">
          <div className="score-result">
            <div className={`score-circle ${isSuccess ? 'success' : isError ? 'error' : ''}`}>
              <span className="score-number">{scoreData.score}%</span>
            </div>
            <p className="score-feedback">
              {scoreData.score >= 90 ? "Excellent! Your drawing is nearly perfect!" :
               scoreData.score >= 75 ? "Great job! Your drawing is very good." :
               scoreData.score >= 60 ? "Good work! Keep practicing to improve." :
               scoreData.score >= 50 ? "Nice try! Practice will make it better." :
               "Keep practicing! You'll get better with time."}
            </p>
            {isSuccess && <p className="success-message">You've mastered this letter!</p>}
            {isError && <p className="error-message">Keep practicing this letter!</p>}
          </div>
          
          <div className="score-details">
            <div className="score-item">
              <span>Path Overlap:</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${scoreData.overlap}%` }}
                />
              </div>
              <span>{scoreData.overlap}%</span>
            </div>
            <div className="score-item">
              <span>Stroke Order:</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${scoreData.strokeOrder}%` }}
                />
              </div>
              <span>{scoreData.strokeOrder}%</span>
            </div>
            <div className="score-item">
              <span>Proportion:</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${scoreData.proportion}%` }}
                />
              </div>
              <span>{scoreData.proportion}%</span>
            </div>
          </div>
          
          <div className="score-actions">
            {/* <button onClick={() => setShowHeatmap(!showHeatmap)}>
              {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
            </button> */}
            <button onClick={resetDrawing}>Try Again</button>
            <button 
              onClick={() => moveToNextShape()}
              className="next-shape-btn"
            >
              Move to Next
            </button>
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

  // Get CSS cursor style based on mode
  const getCursorStyle = () => {
    if (cursorMode === "drawing") {
      return "url('data:image/svg+xml;utf8," + encodeURIComponent(renderPenCursor("drawing").outerHTML) + "') 2 30, auto";
    } else if (cursorMode === "guiding") {
      return "url('data:image/svg+xml;utf8," + encodeURIComponent(renderPenCursor("guiding").outerHTML) + "') 2 30, auto";
    }
    return "default";
  };

  const renderPracticeArea = ({ currentShape, moveToNextShape, retryCurrentShape, isGameComplete }) => {
    if (!currentShape) {
      return (
        <div className="practice-area">
          <div className="loading-message">Loading shape data...</div>

        </div>
      );
    }

    return (
      <div className="practice-area" >
        <div className="practice-controls">
          {currentShape && (
            <>
              <div className="button-group">
                <button
                  className="guide-btn"
                  onClick={() => animateGuide(currentShape)}
                  disabled={isAnimating}
                  title="Guide Me"
                >
                  <img src={require('../images/guideMe.png')} alt="Guide" />
                </button>
                <button 
                  className="reset-btn"
                  onClick={resetDrawing}
                  disabled={userLines.length === 0}
                  title="Reset"
                >
                  <img src={require('../images/rest.png')} alt="Reset" />
                </button>
                <button
                  className="score-btn"
                  onClick={() => calculateScore(currentShape)}
                  disabled={userLines.length === 0 || isScored}
                  title="Calculate Score"
                >
                  <img src={require('../images/calculate.png')} alt="Calculate" />
                </button>
                <div className="audio-controls">
                  <button
                    className={`audio-toggle-btn ${isAudioEnabled ? 'active' : ''}`}
                    onClick={toggleAudio}
                    title={isAudioEnabled ? 'Mute' : 'Unmute'}
                  >
                    {
                      !isAudioEnabled ? <img src={require('../images/mute.png')} alt="Mute" /> : <img src={require('../images/unmute.png')} alt="Unmute" />
                    }
                  </button>
  
                </div>
                <button 
                  className="performance-button"
                  onClick={onShowPerformance}
                  title="View Letter Performance"
                >
                  <img src={require('../images/performance.png')} alt="Performance" />
                </button>
              </div>
              
              <div className="speed-control">
                <div className="speed-header">
                  <img src={require('../images/speed.png')} alt="Speed" className="speed-icon" />
                  <span>Animation Speed</span>
                </div>
                <div className="speed-slider-container">
                  <span className="speed-label">Slow</span>
                  <input
                    id="speed-slider"
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={animationSpeed}
                    onChange={handleSpeedChange}
                    className="speed-slider"
                    disabled={isAnimating}
                  />
                  <span className="speed-label">Fast</span>
                </div>
              </div>
                <TamilAudioPlayer 
                  ref={audioPlayerRef}
                  selectedShapeId={currentShape?.id} 
                /> 

            </>
          )}   
        </div>
   
        <div className="canvas-container" ref={containerRef}>
          <Stage
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            ref={stageRef}
            onMouseDown={(e) => handleMouseDown(e, currentShape)}
            onMouseMove={(e) => handleMouseMove(e, currentShape)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => handleMouseDown(e, currentShape)}
            onTouchMove={(e) => handleMouseMove(e, currentShape)}
            onTouchEnd={handleMouseUp}
            className="practice-canvas"
            style={{ cursor: `url(${require('../images/chokeCursor.png')}) 0 0, auto` }}
          >
            <Layer>
              {currentShape?.shapes?.map((shape, i) => (
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
              
              {currentShape && isAnimating && currentShape.shapes?.[currentPathIndex] && (
                (() => {
                  const shape = currentShape.shapes[currentPathIndex];
                  const scaledPoints = scalePoints(shape.points);
                  const { x, y } = getInterpolatedPoint(scaledPoints, progress);
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
          {renderScoreOverlay(moveToNextShape)}
        </div>
      </div>
    );
  };
   const resetCurrentLevelPerformanceData = ()=>{
    setCurrentLevelCorrect({}); 
    setCurrentLevelMistakes({});
   }
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

  const renderStartOverlay = () => {
    if (isGameStarted) return null;
    return (
      <div className="start-overlay">
        <div className="start-overlay-content">
          <h2>Welcome to Tamil Letter Tracing!</h2>
          <p>Practice writing Tamil letters by following the guide.</p>
          <button 
            onClick={() => setIsGameStarted(true)}
            className="start-game-btn"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  };

  const updatePerformanceData = (char, isCorrect) => {
    const storedData = localStorage.getItem('tamilLetterPerformance');
    const data = storedData ? JSON.parse(storedData) : {};
    
    if (!data[char]) {
      data[char] = { attempts: 0, correct: 0 };
    }
    
    data[char].attempts += 1;
    if (isCorrect) {
      data[char].correct += 1;
    }
    
    // Update localStorage with English keys
    localStorage.setItem('tamilLetterPerformance', JSON.stringify(data));
    
    // Convert to Tamil for display
    const convertedData = convertPerformanceDataToTamil(data);
    
    // Update state with Tamil characters
    setPerformanceData(convertedData);
    
    // Update success/error states using Tamil characters
    const successRate = (data[char].correct / data[char].attempts) * 100;
    const tamilChar = convertPerformanceDataToTamil({ [char]: data[char] })[char];
    
    if (successRate >= 50) {
      setCharSuccess(prev => ({ ...prev, [tamilChar]: true }));
      setCharErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[tamilChar];
        return newErrors;
      });
    } else {
      setCharErrors(prev => ({ ...prev, [tamilChar]: true }));
      setCharSuccess(prev => {
        const newSuccess = { ...prev };
        delete newSuccess[tamilChar];
        return newSuccess;
      });
    }
  };

  // Add the onShowPerformance function
  const onShowPerformance = () => {
    // Reload performance data before showing overlay
    const storedData = localStorage.getItem('tamilLetterPerformance');
    if (storedData) {
      setPerformanceData(JSON.parse(storedData));
    }
    setShowPerformanceOverlay(true);
  };

  return (
    <div className="shapes-list">
      {!isGameComplete && (
        <>
          {!isGameStarted && renderStartOverlay()}
          {/* <div className="shape-info">
            <h2>Shape {currentShapeIndex + 1} of {SHAPES.length}</h2>
          </div> */}
  
            {renderPracticeArea({
              currentShape: getCurrentShape(),
              moveToNextShape,
              retryCurrentShape,
              isGameComplete
            })}
         
        </>
      )}
      {renderGameComplete()}
      {showPerformanceOverlay && (
        <PerformanceOverlay 
          onClose={() => setShowPerformanceOverlay(false)}
          performanceData={performanceData}
          currentLevelMistakes={currentLevelMistakes}
          currentLevelCorrect={currentLevelCorrect}
          onUpdate={() => {
            // Reload performance data when overlay requests an update
            const storedData = localStorage.getItem('tamilLetterPerformance');
            if (storedData) {
              setPerformanceData(JSON.parse(storedData));
            }
          }}
        />
      )}
    </div>
  );
};

export default ShapesList;
