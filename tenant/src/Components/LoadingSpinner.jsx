import React from 'react';
import { FaSpinner } from 'react-icons/fa';

/**
 * fullPage = true  → covers the entire viewport (used for initial app load)
 * fullPage = false → fills only its parent container (used for route transitions)
 */
const LoadingSpinner = ({ fullPage = false }) => (
  <div
    className={`flex justify-center items-center ${
      fullPage ? 'h-100vh' : 'h-full min-h-[200px]'
    }`}
    role="status"
    aria-live="polite"
  >
    <FaSpinner className="text-40 text-[#000000] animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

export default LoadingSpinner;
