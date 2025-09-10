import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-100vh bg-[rgba(255_255_255_0.8)]">
    <FaSpinner className="text-40 text-[#000000] animate-spin" />
  </div>
);

export default LoadingSpinner;