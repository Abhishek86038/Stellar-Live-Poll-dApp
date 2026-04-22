import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'md', text }) => {
  return (
    <div className={`spinner-container spinner-${size}`}>
      <div className="spinner-circle"></div>
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
