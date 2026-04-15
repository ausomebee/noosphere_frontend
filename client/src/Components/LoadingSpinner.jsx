import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-100vh bg-[rgba(255_255_255_0.8)]" role="status" aria-live="polite">
    <FaSpinner className="text-40 text-[#000000] animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

export default LoadingSpinner;