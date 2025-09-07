import React from 'react';
import { MultiImageUploadTest } from '@/components/MultiImageUploadTest';

const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Multi-Image Upload Backend Test</h1>
        <MultiImageUploadTest />
      </div>
    </div>
  );
};

export default TestPage;