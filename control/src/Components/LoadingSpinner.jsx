import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import './LoadingSpinner.css';

const LoadingSpinner = React.memo(() => (
  <div className="loading-spinner-container">
    <FaSpinner className="loading-spinner" />
  </div>
));

export default LoadingSpinner;