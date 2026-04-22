import React from 'react';
import './ProgressIndicator.css';

const ProgressIndicator = ({ percentage, text }) => {
  return (
    <div className="progress-container">
      {text && <div className="progress-text">{text} ({percentage}%)</div>}
      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
