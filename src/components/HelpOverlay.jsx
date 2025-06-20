import React from 'react';
import '../styles/HelpOverlay.css';
import helpBg from '../images/Help_Page.jpg';
import closeButton from '../images/closeButton.png';

const HelpOverlay = ({ onClose }) => {
  return (
    <div className="help-overlay">
      <div className="help-content">
        <div className="image-wrapper">
          <img src={helpBg} alt="Help Background" className="help-background" />
          <button className="close-button" onClick={onClose}>
            <img src={closeButton} alt="Close" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpOverlay;
