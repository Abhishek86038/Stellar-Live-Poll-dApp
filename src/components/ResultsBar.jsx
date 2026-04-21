import React, { useEffect, useState } from 'react';
import './ResultsBar.css';

const ResultsBar = ({ optionText, votes, totalVotes, index = 0 }) => {
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    // Calculates percentage safely
    const calculatedPercentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
    
    // Animate smoothly on mount
    const timer = setTimeout(() => {
      setPercentage(calculatedPercentage);
    }, 50);

    return () => clearTimeout(timer);
  }, [votes, totalVotes]);

  // Restricting gradients specifically to Stellar Brand clean blues to match Part 4 requirements
  const gradients = [
    'linear-gradient(90deg, #0052a3, #0066CC)',     
    'linear-gradient(90deg, #0066CC, #3385ff)',     
    'linear-gradient(90deg, #004080, #0066CC)',     
    'linear-gradient(90deg, #1a75ff, #4d94ff)',     
  ];

  const barGradient = gradients[index % gradients.length];

  return (
    <div className="results-bar-container">
      <div className="results-bar-stats">
        <span className="results-bar-title">{optionText}</span>
        <span className="results-bar-numbers">
          {votes} votes <span className="results-bar-percentage">({percentage}%)</span>
        </span>
      </div>
      
      <div className="results-bar-bg">
        <div 
          className="results-bar-fill" 
          style={{ 
            width: `${percentage}%`,
            background: barGradient
          }}
        ></div>
      </div>
    </div>
  );
};

export default ResultsBar;
