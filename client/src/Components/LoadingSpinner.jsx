import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const LoadingSpinner = ({ fullPage = false }) => (
  <div
    className={`flex justify-center items-center ${fullPage ? 'h-100vh bg-[rgba(255_255_255_0.8)]' : 'h-full min-h-[200px]'}`}
    role="status"
    aria-live="polite"
  >
    <FaSpinner className="text-40 text-[#000000] animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

export default LoadingSpinner;
