import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  X, 
  BarChart3, 
  Users, 
  Clock, 
  CheckSquare,
  Square
} from 'lucide-react';

interface Poll {
  question: string;
  options: string[];
  duration: number;
  multipleChoice: boolean;
}

interface PollCreatorTabProps {
  poll?: Poll;
  onPollChange: (poll: Poll | undefined) => void;
}

export const PollCreatorTab: React.FC<PollCreatorTabProps> = ({
  poll,
  onPollChange
}) => {
  const [localPoll, setLocalPoll] = useState<Poll>(poll || {
    question: '',
    options: ['', ''],
    duration: 7,
    multipleChoice: false
  });

  const MAX_QUESTION_LENGTH = 100;
  const MAX_OPTION_LENGTH = 50;
  const MAX_OPTIONS = 4;
  const MIN_OPTIONS = 2;

  const updatePoll = (updates: Partial<Poll>) => {
    const updatedPoll = { ...localPoll, ...updates };
    setLocalPoll(updatedPoll);
    
    // Only emit if poll is valid
    if (isValidPoll(updatedPoll)) {
      onPollChange(updatedPoll);
    } else if (updates.question === '' && updates.options?.every(opt => opt === '')) {
      // Clear poll if everything is empty
      onPollChange(undefined);
    }
  };

  const isValidPoll = (pollToCheck: Poll): boolean => {
    return (
      pollToCheck.question.trim() !== '' &&
      pollToCheck.options.filter(opt => opt.trim() !== '').length >= MIN_OPTIONS
    );
  };

  const addOption = () => {
    if (localPoll.options.length < MAX_OPTIONS) {
      updatePoll({
        options: [...localPoll.options, '']
      });
    }
  };

  const removeOption = (index: number) => {
    if (localPoll.options.length > MIN_OPTIONS) {
      const newOptions = localPoll.options.filter((_, i) => i !== index);
      updatePoll({ options: newOptions });
    }
  };

  const updateOption = (index: number, value: string) => {
    if (value.length <= MAX_OPTION_LENGTH) {
      const newOptions = [...localPoll.options];
      newOptions[index] = value;
      updatePoll({ options: newOptions });
    }
  };

  const clearPoll = () => {
    setLocalPoll({
      question: '',
      options: ['', ''],
      duration: 7,
      multipleChoice: false
    });
    onPollChange(undefined);
  };

  const filledOptions = localPoll.options.filter(opt => opt.trim() !== '');
  const canAddOption = localPoll.options.length < MAX_OPTIONS;
  const canRemoveOption = localPoll.options.length > MIN_OPTIONS;

  return (
    <div className="space-y-6">
      {/* Poll Question */}
      <div className="space-y-2">
        <Label htmlFor="poll-question" className="text-sm font-medium">
          Poll Question *
        </Label>
        <Input
          id="poll-question"
          value={localPoll.question}
          onChange={(e) => updatePoll({ question: e.target.value })}
          placeholder="Ask a question for your poll..."
          maxLength={MAX_QUESTION_LENGTH}
          className="text-base"
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            This will be the main question people vote on
          </p>
          <p className="text-xs text-muted-foreground">
            {localPoll.question.length}/{MAX_QUESTION_LENGTH}
          </p>
        </div>
      </div>

      {/* Poll Options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Poll Options</Label>
        
        {localPoll.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              {localPoll.multipleChoice ? (
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              ) : (
                <div className="h-4 w-4 border-2 border-muted-foreground rounded-full" />
              )}
              
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={MAX_OPTION_LENGTH}
                className="flex-1"
              />
              
              <span className="text-xs text-muted-foreground w-12 text-right">
                {option.length}/{MAX_OPTION_LENGTH}
              </span>
            </div>
            
            {canRemoveOption && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(index)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {canAddOption && (
          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            className="w-full flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Option ({localPoll.options.length}/{MAX_OPTIONS})
          </Button>
        )}
      </div>

      {/* Poll Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Poll Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Multiple Choice Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">
                Allow Multiple Selections
              </Label>
              <p className="text-xs text-muted-foreground">
                Let users choose more than one option
              </p>
            </div>
            <Switch
              checked={localPoll.multipleChoice}
              onCheckedChange={(checked) => updatePoll({ multipleChoice: checked })}
            />
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Poll Duration
            </Label>
            <Select
              value={localPoll.duration.toString()}
              onValueChange={(value) => updatePoll({ duration: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">1 Week</SelectItem>
                <SelectItem value="14">2 Weeks</SelectItem>
                <SelectItem value="30">1 Month</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long should the poll remain open for voting?
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Poll Preview */}
      {isValidPoll(localPoll) && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Poll Preview
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearPoll}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <h3 className="font-medium">{localPoll.question}</h3>
            
            <div className="space-y-2">
              {filledOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                  {localPoll.multipleChoice ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-primary rounded-full" />
                  )}
                  <span className="text-sm">{option}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>
                {localPoll.multipleChoice ? 'Multiple choice' : 'Single choice'}
              </span>
              <Badge variant="outline" className="text-xs">
                {localPoll.duration} day{localPoll.duration !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>💡 <strong>Poll Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Ask clear, specific questions for better responses</li>
          <li>Keep options concise and distinct from each other</li>
          <li>Use multiple choice when options aren't mutually exclusive</li>
          <li>Longer polls get more responses but may lose momentum</li>
        </ul>
      </div>
    </div>
  );
};