import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate("/game"); // Redirect to the game page
  };

  const handleHelp = () => {
    navigate("/help"); // Redirect to the help page
  };

  return (
    <div className="landing-container">
      {/* Background Image */}
      <div className="background-container">
        {/* Centered GIF */}
        <div className="start-gif1" onClick={handleStartGame}></div>
        {/* Question Mark Logo */}
        <div className="help-logo" onClick={handleHelp}></div>
      </div> 
       <div className="white-box-overlay">
          {/* <p>இது ஒரு தமிழ் வாக்கியம்.</p> Replace with your Tamil sentence */}
        </div>
    </div>
  );
};

export default HomePage;