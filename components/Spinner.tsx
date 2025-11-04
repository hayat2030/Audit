
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
};

export const FullPageSpinner: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex justify-center items-center z-50">
            <Spinner />
        </div>
    );
}

export default Spinner;
