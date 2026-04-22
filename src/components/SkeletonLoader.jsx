import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ type = 'poll' }) => {
  return (
    <div className={`skeleton skeleton-${type}`}>
      <div className="skeleton-line title"></div>
      <div className="skeleton-line option"></div>
      <div className="skeleton-line option"></div>
      <div className="skeleton-line option"></div>
    </div>
  );
};

export default SkeletonLoader;
