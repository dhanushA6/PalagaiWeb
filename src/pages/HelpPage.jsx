import React from "react";
import { useNavigate } from "react-router-dom";
import "./HelpPage.css";
import CloseIcon from "../images/Close_Icon.png";

const HelpPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/"); // Redirect back to the home page
  };

  return (
    <div className="help-container">
      <div className="back-button" onClick={handleBack}>
      <img src={CloseIcon} alt="Back" />      </div>
      {/* Add your help content here */}
      <div className="help-content">
        {/* <p>This is the help page content.</p> */}
      </div>
    </div>
  );
};

export default HelpPage;