import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";
import HelpOverlay from '../components/HelpOverlay';


const HomePage = () => {
  const navigate = useNavigate();
  const [showHelpOverlay, setShowHelpOverlay] = useState(false); // Move inside component

  const handleStartGame = () => {
    navigate("/game");
  };

  return (
    <div className="landing-container">
      {/* Background Image */}
      <div className="background-container">
        {/* Centered GIF */}
        <div className="start-gif1" onClick={handleStartGame}></div>

        {/* Question Mark Logo */}
        <div className="help-logo" onClick={() => setShowHelpOverlay(true)}>
          
        </div>
      </div> 

      <div className="white-box-overlay">
        {/* <p>இது ஒரு தமிழ் வாக்கியம்.</p> Replace with your Tamil sentence */}
      </div>

      {showHelpOverlay && (
        <HelpOverlay onClose={() => setShowHelpOverlay(false)} />
      )}
    </div>
  );
};

export default HomePage;
