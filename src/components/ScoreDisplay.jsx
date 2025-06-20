import React from 'react';
import '../styles/ResultOverlay.css';

const ScoreDisplay = ({ score, totalTasks }) => {
  const averageScore = Math.round(score / totalTasks);
  
  const getScoreMessage = (score) => {
    if (score >= 90) return "Outstanding! You're a Tamil writing master!";
    if (score >= 75) return "Excellent! Your Tamil writing skills are very good!";
    if (score >= 60) return "Good job! Keep practicing to improve further.";
    if (score >= 50) return "Nice work! With more practice, you'll get even better.";
    return "Keep practicing! You'll improve with time.";
  };

  return (
    <div className="result-overlay">
      <div className="result-content">
        <div className="result-header">
          <h2>Final Score</h2>
        </div>
        
        <div className={`result-circle ${averageScore >= 75 ? '' : 'error'}`}>
          <span className="result-number">{averageScore}%</span>
        </div>
        
        <p className="result-message">{getScoreMessage(averageScore)}</p>
        
        <div className="result-details">
          {/* <div className="result-item">
            <span>Total Score</span>
            <span className="result-value">{score}</span>
          </div> */}
          <div className="result-item">
            <span>Total Tasks</span>
            <span className="result-value">{totalTasks}</span>
          </div>
          <div className="result-item">
            <span>Average Score</span>
            <span className="result-value">{averageScore}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreDisplay; 