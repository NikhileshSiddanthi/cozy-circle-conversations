import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface TourStep {
  id: string;
  route: string;
  target?: string;
  title: string;
  description: string;
  position?: 'center' | 'top' | 'bottom';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/',
    title: 'Welcome to COZI!',
    description: "Let's take a quick tour. This will show you the key features.",
    position: 'center',
  },
  {
    id: 'categories',
    route: '/',
    target: '[data-tour="categories-grid"]',
    title: 'Browse Categories',
    description: 'Categories contain groups. Click any category to explore its groups.',
    position: 'bottom',
  },
  {
    id: 'groups',
    route: '/groups',
    target: '[data-tour="groups-page"]',
    title: 'All Groups',
    description: 'Browse all groups here. Join groups to participate in discussions.',
    position: 'top',
  },
  {
    id: 'create',
    route: '/',
    target: '[data-tour="create-post-button"]',
    title: 'Create Posts',
    description: 'Share your thoughts by creating posts with text, images, videos, and polls.',
    position: 'bottom',
  },
  {
    id: 'news',
    route: '/news',
    target: '[data-tour="news-feed"]',
    title: 'News & Updates',
    description: 'Stay informed with curated news organized by category.',
    position: 'top',
  },
];

const STORAGE_KEY = 'simple_tour_completed';

export const SimpleTour: React.FC<{ autoStart?: boolean; onComplete?: () => void }> = ({ 
  autoStart = false,
  onComplete 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (autoStart && !localStorage.getItem(STORAGE_KEY)) {
      setTimeout(() => {
        setIsActive(true);
        navigateToStep(0);
      }, 1000);
    }
  }, [autoStart]);

  const navigateToStep = async (stepIndex: number) => {
    const step = TOUR_STEPS[stepIndex];
    if (!step) return;

    // Navigate to route
    if (step.route !== location.pathname) {
      navigate(step.route);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Find target element
    if (step.target) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetPosition(null);
      }
    } else {
      setTargetPosition(null);
    }

    setCurrentStep(stepIndex);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      navigateToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    setTargetPosition(null);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    setTargetPosition(null);
  };

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isCenter = step.position === 'center';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={handleSkip} />

      {/* Highlight for target element */}
      {targetPosition && (
        <div
          className="fixed z-[9999] border-4 border-primary rounded-lg pointer-events-none"
          style={{
            top: targetPosition.top - 8,
            left: targetPosition.left - 8,
            width: targetPosition.width + 16,
            height: 'auto',
            minHeight: '50px',
          }}
        />
      )}

      {/* Tour Card */}
      <Card
        className={`fixed z-[10000] p-6 max-w-md ${
          isCenter
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : targetPosition && step.position === 'bottom'
            ? `top-[${targetPosition.top + 100}px] left-[${targetPosition.left}px]`
            : targetPosition && step.position === 'top'
            ? `top-[${targetPosition.top - 200}px] left-[${targetPosition.left}px]`
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={
          !isCenter && targetPosition
            ? {
                top: step.position === 'bottom' 
                  ? targetPosition.top + 100 
                  : targetPosition.top - 200,
                left: Math.max(20, Math.min(targetPosition.left, window.innerWidth - 420)),
              }
            : undefined
        }
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="mb-6 text-sm">{step.description}</p>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
          >
            Skip Tour
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
};

export const useSimpleTour = () => {
  const startTour = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return { startTour };
};
