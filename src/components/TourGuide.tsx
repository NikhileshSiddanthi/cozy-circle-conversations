import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to COZI!",
    description: "Let's take a quick tour to help you get started with the platform. This will only take a minute."
  },
  {
    title: "Browse Categories",
    description: "Explore different political categories on the home page. Each category contains multiple groups focused on specific topics."
  },
  {
    title: "Join Groups",
    description: "Click on any category to see its groups. Join groups that interest you to participate in discussions and stay updated."
  },
  {
    title: "Create Posts",
    description: "Click the 'Create' button in the header to share your thoughts. You can add text, images, videos, polls, and link previews to your posts."
  },
  {
    title: "Engage with Content",
    description: "React to posts with different emojis, leave comments, and share content. Your interactions help build a vibrant community."
  },
  {
    title: "Stay Informed",
    description: "Visit the News section to read curated news articles from trusted sources, organized by category for your convenience."
  },
  {
    title: "Customize Your Experience",
    description: "Use the theme toggle and accent color picker in the header to personalize the app's appearance to your liking."
  },
  {
    title: "Ready to Go!",
    description: "You're all set! Start exploring, join conversations, and make your voice heard in the COZI community."
  }
];

const TOUR_COMPLETED_KEY = 'cozi_tour_completed';

interface TourGuideProps {
  autoStart?: boolean;
  forceShow?: boolean;
  onComplete?: () => void;
}

export const TourGuide: React.FC<TourGuideProps> = ({ autoStart = false, forceShow = false, onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
    } else if (autoStart) {
      const hasCompletedTour = localStorage.getItem(TOUR_COMPLETED_KEY);
      if (!hasCompletedTour) {
        setIsOpen(true);
      }
    }
  }, [autoStart, forceShow]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setIsOpen(false);
    setCurrentStep(0);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setIsOpen(false);
    setCurrentStep(0);
  };

  const currentStepData = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{currentStepData.title}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentStep + 1} / {TOUR_STEPS.length}
            </span>
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-2">
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
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to programmatically trigger the tour
export const useTourGuide = () => {
  const [showTour, setShowTour] = useState(false);

  const startTour = () => {
    // Clear the completed flag so tour can be shown again
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    setShowTour(true);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
  };

  return {
    showTour,
    setShowTour,
    startTour,
    resetTour
  };
};
