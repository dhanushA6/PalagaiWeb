import { getBoundingBox } from './drawingUtils';

// Calculate area of overlap between two shapes
export const calculateOverlap = (templatePoints, studentPoints, gridSize = 5, threshold = 5) => {
  // Input validation
  if (!templatePoints || !studentPoints || templatePoints.length < 4 || studentPoints.length < 4) {
    return 0;
  }
  
  // Get bounding boxes
  const templateBB = getBoundingBox(templatePoints);
  const studentBB = getBoundingBox(studentPoints);
  
  // Validate bounding boxes
  if (!templateBB || !studentBB || templateBB.width === 0 || templateBB.height === 0) {
    return 0;
  }
  
  // Calculate the combined area to create our grid
  const combinedBB = {
    minX: Math.min(templateBB.minX, studentBB.minX),
    minY: Math.min(templateBB.minY, studentBB.minY),
    maxX: Math.max(templateBB.maxX, studentBB.maxX),
    maxY: Math.max(templateBB.maxY, studentBB.maxY),
  };
  
  // Extend by a small margin
  const margin = 10;
  combinedBB.minX -= margin;
  combinedBB.minY -= margin;
  combinedBB.maxX += margin;
  combinedBB.maxY += margin;
  
  // Calculate grid dimensions
  const width = combinedBB.maxX - combinedBB.minX;
  const height = combinedBB.maxY - combinedBB.minY;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);
  
  // Prevent excessive grid sizes
  if (cols * rows > 100000) { // Limit grid size for performance
    console.warn('Grid too large, reducing precision');
    const newGridSize = Math.sqrt((width * height) / 50000);
    return calculateOverlap(templatePoints, studentPoints, newGridSize, threshold);
  }
  
  // Create grid masks for both shapes
  const templateMask = createShapeMask(templatePoints, combinedBB, gridSize, cols, rows, threshold);
  const studentMask = createShapeMask(studentPoints, combinedBB, gridSize, cols, rows, threshold);
  
  // Calculate overlap and total area with leniency
  let overlapCount = 0;
  let templateCount = 0;
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const index = i * cols + j;
      
      if (templateMask[index]) {
        templateCount++;
        
        // Check for nearby student points within threshold
        let hasNearbyStudentPoint = studentMask[index];
        
        if (!hasNearbyStudentPoint) {
          // Check neighboring cells within threshold distance
          const cellRadius = Math.ceil(threshold / gridSize);
          
          for (let di = -cellRadius; di <= cellRadius && !hasNearbyStudentPoint; di++) {
            for (let dj = -cellRadius; dj <= cellRadius && !hasNearbyStudentPoint; dj++) {
              const ni = i + di;
              const nj = j + dj;
              
              if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                const neighborIndex = ni * cols + nj;
                if (studentMask[neighborIndex]) {
                  // Additional distance check for accuracy
                  const cellX = combinedBB.minX + j * gridSize;
                  const cellY = combinedBB.minY + i * gridSize;
                  const neighborX = combinedBB.minX + nj * gridSize;
                  const neighborY = combinedBB.minY + ni * gridSize;
                  const distance = Math.sqrt((cellX - neighborX) ** 2 + (cellY - neighborY) ** 2);
                  
                  if (distance <= threshold) {
                    hasNearbyStudentPoint = true;
                  }
                }
              }
            }
          }
        }
        
        if (hasNearbyStudentPoint) {
          overlapCount++;
        }
      }
    }
  }
  
  // Return overlap percentage
  return templateCount > 0 ? (overlapCount / templateCount) * 100 : 0;
};

// Updated createShapeMask function to include threshold
const createShapeMask = (points, boundingBox, gridSize, cols, rows, threshold) => {
  const mask = new Array(cols * rows).fill(false);
  
  // Input validation
  if (!points || points.length < 4) return mask;
  
  // For each grid cell, check if it's inside or near the shape
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const cellX = boundingBox.minX + j * gridSize + gridSize / 2; // Use cell center
      const cellY = boundingBox.minY + i * gridSize + gridSize / 2;
      
      // Check if cell center is close to any line segment
      // Fixed: iterate through pairs of consecutive points correctly
      for (let p = 0; p < points.length - 2; p += 2) {
        const x1 = points[p];
        const y1 = points[p + 1];
        const x2 = points[p + 2];
        const y2 = points[p + 3];
        
        if (isPointNearLineSegment(cellX, cellY, x1, y1, x2, y2, threshold)) {
          mask[i * cols + j] = true;
          break;
        }
      }
    }
  }
  
  return mask;
};

// Check if a point is near a line segment
const isPointNearLineSegment = (px, py, x1, y1, x2, y2, threshold) => {
  const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  if (lineLength === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= threshold;
  
  // Calculate the perpendicular distance using the correct formula
  const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineLength ** 2)));
  
  // Find the closest point on the line segment
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  
  // Calculate distance from point to closest point on line segment
  const distance = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  return distance <= threshold;
};

// Calculate stroke order similarity
export const calculateStrokeOrder = (templateLines, studentLines) => {
  if (!templateLines || !studentLines || !templateLines.length || !studentLines.length) return 0;
  
  const templateCount = templateLines.length;
  const studentCount = studentLines.length;
  
  // If stroke counts are very different, apply penalty but don't return early
  const strokeCountPenalty = Math.abs(templateCount - studentCount) / Math.max(templateCount, studentCount);
  
  // Score based on start point similarity of corresponding strokes
  let totalScore = 0;
  const minCount = Math.min(templateCount, studentCount);
  
  if (minCount === 0) return 0;
  
  for (let i = 0; i < minCount; i++) {
    const templateStroke = templateLines[i];
    const studentStroke = studentLines[i];
    
    if (templateStroke && studentStroke && 
        templateStroke.points && studentStroke.points &&
        templateStroke.points.length >= 2 && studentStroke.points.length >= 2) {
      
      // Compare start points of the strokes
      const templateStartX = templateStroke.points[0];
      const templateStartY = templateStroke.points[1];
      const studentStartX = studentStroke.points[0];
      const studentStartY = studentStroke.points[1];
      
      // Calculate distance between start points
      const distance = Math.sqrt(
        (templateStartX - studentStartX) ** 2 + 
        (templateStartY - studentStartY) ** 2
      );
      
      // Convert distance to a score (closer is better)
      // Use adaptive max distance based on drawing size
      const templateBB = getBoundingBox([templateStartX, templateStartY]);
      const maxDistance = Math.max(100, Math.min(templateBB.width, templateBB.height) * 0.3);
      const pointScore = Math.max(0, 100 - (distance / maxDistance) * 100);
      totalScore += pointScore;
    }
  }
  
  const averageScore = totalScore / minCount;
  // Apply stroke count penalty
  return Math.max(0, averageScore * (1 - strokeCountPenalty * 0.5));
};

// Calculate proportion accuracy
export const calculateProportion = (templatePoints, studentPoints) => {
  if (!templatePoints || !studentPoints || templatePoints.length < 4 || studentPoints.length < 4) {
    return 0;
  }
  
  const templateBB = getBoundingBox(templatePoints);
  const studentBB = getBoundingBox(studentPoints);
  
  if (!templateBB || !studentBB || templateBB.width === 0 || templateBB.height === 0 || 
      studentBB.width === 0 || studentBB.height === 0) {
    return 0;
  }
  
  // Calculate aspect ratios
  const templateRatio = templateBB.width / templateBB.height;
  const studentRatio = studentBB.width / studentBB.height;
  
  // Compare ratios - use relative difference instead of absolute
  const maxRatio = Math.max(templateRatio, studentRatio);
  const minRatio = Math.min(templateRatio, studentRatio);
  const ratioDifference = (maxRatio - minRatio) / maxRatio;
  
  // Convert to score (0-100) - closer ratios get higher scores
  const proportionScore = Math.max(0, 100 * (1 - ratioDifference));
  return proportionScore;
};

// Calculate start and end point accuracy
export const calculateEndpointAccuracy = (templateLine, studentLine) => {
  if (!templateLine || !studentLine || 
      !templateLine.points || !studentLine.points ||
      templateLine.points.length < 2 || studentLine.points.length < 2) {
    return 0;
  }
  
  // Get start and end points
  const templateStart = { x: templateLine.points[0], y: templateLine.points[1] };
  const templateEnd = { 
    x: templateLine.points[templateLine.points.length - 2], 
    y: templateLine.points[templateLine.points.length - 1] 
  };
  
  const studentStart = { x: studentLine.points[0], y: studentLine.points[1] };
  const studentEnd = { 
    x: studentLine.points[studentLine.points.length - 2], 
    y: studentLine.points[studentLine.points.length - 1]
  };
  
  // Calculate distances
  const startDistance = Math.sqrt(
    (templateStart.x - studentStart.x) ** 2 + 
    (templateStart.y - studentStart.y) ** 2
  );
  
  const endDistance = Math.sqrt(
    (templateEnd.x - studentEnd.x) ** 2 + 
    (templateEnd.y - studentEnd.y) ** 2
  );
  
  // Use adaptive max distance based on line length
  const templateLineLength = Math.sqrt(
    (templateEnd.x - templateStart.x) ** 2 + 
    (templateEnd.y - templateStart.y) ** 2
  );
  const maxDistance = Math.max(50, templateLineLength * 0.1); // 10% of line length
  
  // Convert to score (closer is better)
  const startScore = Math.max(0, 100 - (startDistance / maxDistance) * 100);
  const endScore = Math.max(0, 100 - (endDistance / maxDistance) * 100);
  
  return (startScore + endScore) / 2;
};

// Create a heatmap showing trace quality
export const generateHeatmapData = (templateLines, studentLines, width, height) => {
  // Validate input dimensions
  if (!width || !height || width <= 0 || height <= 0) {
    console.warn('Invalid dimensions for heatmap:', { width, height });
    return [];
  }

  // Validate input lines
  if (!templateLines || !Array.isArray(templateLines)) {
    console.warn('Invalid template lines for heatmap');
    return [];
  }

  // Ensure dimensions are reasonable
  const maxDimension = 1000; // Maximum allowed dimension
  const safeWidth = Math.min(Math.floor(width), maxDimension);
  const safeHeight = Math.min(Math.floor(height), maxDimension);

  try {
    const heatmapData = new Array(safeWidth * safeHeight).fill(0);
    
    // For each point in the template, increment the heatmap
    templateLines.forEach(templateLine => {
      if (!templateLine || !templateLine.points || !Array.isArray(templateLine.points)) return;
      
      for (let i = 0; i < templateLine.points.length; i += 2) {
        if (i + 1 >= templateLine.points.length) break;
        
        const x = Math.floor(templateLine.points[i]);
        const y = Math.floor(templateLine.points[i + 1]);
        
        if (x >= 0 && x < safeWidth && y >= 0 && y < safeHeight) {
          const index = y * safeWidth + x;
          if (index >= 0 && index < heatmapData.length) {
            heatmapData[index] += 1;
          }
        }
      }
    });

    return heatmapData;
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return [];
  }
};

// Calculate overall accuracy score
export const calculateAccuracy = (templateLines, studentLines) => {
  // Input validation
  if (!templateLines || !studentLines || !Array.isArray(templateLines) || !Array.isArray(studentLines)) {
    return { score: 0, overlap: 0, strokeOrder: 0, proportion: 0 };
  }
  
  // Extract all points from template and student lines
  const templatePoints = templateLines.flatMap(line => 
    line && line.points && Array.isArray(line.points) ? line.points : []
  );
  const studentPoints = studentLines.flatMap(line => 
    line && line.points && Array.isArray(line.points) ? line.points : []
  );
  
  if (templatePoints.length < 4 || studentPoints.length < 4) {
    return { score: 0, overlap: 0, strokeOrder: 0, proportion: 0 };
  }
  
  // Calculate individual metrics
  const overlap = calculateOverlap(templatePoints, studentPoints);
  const strokeOrder = calculateStrokeOrder(templateLines, studentLines);
  const proportion = calculateProportion(templatePoints, studentPoints);
  
  // Ensure all scores are valid numbers
  const safeOverlap = isNaN(overlap) ? 0 : Math.max(0, Math.min(100, overlap));
  const safeStrokeOrder = isNaN(strokeOrder) ? 0 : Math.max(0, Math.min(100, strokeOrder));
  const safeProportion = isNaN(proportion) ? 0 : Math.max(0, Math.min(100, proportion));
  
  // Calculate final score with weightings
  // Adjusted weights to sum to 1.0
  const finalScore = (safeOverlap * 0.7) + (safeStrokeOrder * 0.2) + (safeProportion * 0.1);
  
  return {
    score: Math.round(Math.max(0, Math.min(100, finalScore))),
    overlap: Math.round(safeOverlap),
    strokeOrder: Math.round(safeStrokeOrder),
    proportion: Math.round(safeProportion)
  };
};