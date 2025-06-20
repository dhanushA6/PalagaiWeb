import React, { useEffect, useState, useRef } from 'react';
import timeIcon from '../images/timer.png';
import '../styles/TaskTimer.css';

const TaskTimer = ({ duration = 60, onTimeUp, keyProp }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef();

  useEffect(() => {
    setTimeLeft(duration);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [duration, keyProp]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="stats-bar__item">
      <img src={timeIcon} alt="Timer" className="stats-bar__icon" />
      <div className={`stats-bar__value ${timeLeft <= 10 ? 'stats-bar__value--critical' : ''}`}>
        {formatTime(timeLeft)}
      </div>
    </div>
  );
};

export default TaskTimer; 