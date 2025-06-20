import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HelpPage.css";
import CloseIcon from "../images/Close_Icon.png";
import HelpPageImage from "../images/Help_Page.jpg";  // import image directly

const HelpPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="help-container">
      <img src={HelpPageImage} alt="Help Page" className="help-background" />
      
      <div className="back-button" onClick={handleBack}>
        <img src={CloseIcon} alt="Back" />
      </div>

      <div className="help-content">
        {/* Add your help content here */}
      </div>
    </div>
  );
};

export default HelpPage;
