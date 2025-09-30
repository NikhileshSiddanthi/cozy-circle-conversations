import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  route?: string;
  highlightSelector?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to COZI!",
    description: "Let's take a quick tour to help you get started with the platform. This will only take a minute.",
    route: "/"
  },
  {
    title: "Browse Categories",
    description: "These are the main categories covering different political topics. Each category contains multiple groups focused on specific discussions.",
    route: "/"
  },
  {
    title: "Join Groups",
    description: "Click on any category to explore its groups. Let me show you an example.",
    route: "/groups"
  },
  {
    title: "Create Posts",
    description: "Click the 'Create' button in the header to share your thoughts. You can add text, images, videos, polls, and link previews to your posts.",
    route: "/"
  },
  {
    title: "AI Post Suggestions",
    description: "When creating a post, you can use AI-powered suggestions to get ideas, improve your content, or generate engaging posts automatically.",
    route: "/"
  },
  {
    title: "Engage with Content",
    description: "React to posts with different emojis, leave comments, and share content. Your interactions help build a vibrant community.",
    route: "/"
  },
  {
    title: "Stay Informed",
    description: "Visit the News section to read curated news articles from trusted sources, organized by category for your convenience.",
    route: "/news"
  },
  {
    title: "Customize Your Experience",
    description: "Use the theme toggle and accent color picker in the header to personalize the app's appearance to your liking.",
    route: "/"
  },
  {
    title: "Ready to Go!",
    description: "You're all set! Start exploring, join conversations, and make your voice heard in the COZI community.",
    route: "/"
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
  const navigate = useNavigate();

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      setCurrentStep(0);
    } else if (autoStart) {
      const hasCompletedTour = localStorage.getItem(TOUR_COMPLETED_KEY);
      if (!hasCompletedTour) {
        // Delay showing tour by 1 second to let page load
        const timer = setTimeout(() => setIsOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStart, forceShow]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Navigate to the route for the next step
      const nextStepData = TOUR_STEPS[nextStep];
      if (nextStepData.route) {
        navigate(nextStepData.route);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // Navigate to the route for the previous step
      const prevStepData = TOUR_STEPS[prevStep];
      if (prevStepData.route) {
        navigate(prevStepData.route);
      }
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
