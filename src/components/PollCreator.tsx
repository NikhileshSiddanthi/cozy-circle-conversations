import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, BarChart3, Calendar } from 'lucide-react';

interface Poll {
  question: string;
  options: string[];
  allowMultiple: boolean;
  duration: number; // in days
}

interface PollCreatorProps {
  onPollCreated: (poll: Poll | null) => void;
  currentPoll?: Poll | null;
}

export const PollCreator: React.FC<PollCreatorProps> = ({
  onPollCreated,
  currentPoll
}) => {
  const [poll, setPoll] = useState<Poll>({
    question: '',
    options: ['', ''],
    allowMultiple: false,
    duration: 7
  });

  useEffect(() => {
    if (currentPoll) {
      setPoll(currentPoll);
    }
  }, [currentPoll]);

  useEffect(() => {
    // Only emit poll if question and at least 2 non-empty options exist
    const validOptions = poll.options.filter(opt => opt.trim() !== '');
    if (poll.question.trim() && validOptions.length >= 2) {
      onPollCreated({
        ...poll,
        options: validOptions
      });
    } else {
      onPollCreated(null);
    }
  }, [poll, onPollCreated]);

  const updateQuestion = (question: string) => {
    setPoll(prev => ({ ...prev, question }));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...poll.options];
    newOptions[index] = value;
    setPoll(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if (poll.options.length < 10) {
      setPoll(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removeOption = (index: number) => {
    if (poll.options.length > 2) {
      const newOptions = poll.options.filter((_, i) => i !== index);
      setPoll(prev => ({ ...prev, options: newOptions }));
    }
  };

  const updateDuration = (duration: string) => {
    setPoll(prev => ({ ...prev, duration: parseInt(duration) }));
  };

  const toggleMultiple = (allowMultiple: boolean) => {
    setPoll(prev => ({ ...prev, allowMultiple }));
  };

  const clearPoll = () => {
    setPoll({
      question: '',
      options: ['', ''],
      allowMultiple: false,
      duration: 7
    });
    onPollCreated(null);
  };

  const validOptions = poll.options.filter(opt => opt.trim() !== '');
  const isValidPoll = poll.question.trim() && validOptions.length >= 2;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Create Poll
          {isValidPoll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearPoll}
              className="ml-auto h-6 text-xs"
            >
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="poll-question">Poll Question</Label>
          <Input
            id="poll-question"
            placeholder="What would you like to ask?"
            value={poll.question}
            onChange={(e) => updateQuestion(e.target.value)}
            className="border-border/50 focus:border-primary"
          />
        </div>

        <div className="space-y-3">
          <Label>Poll Options</Label>
          {poll.options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex items-center justify-center w-6 h-10 text-sm text-muted-foreground">
                {index + 1}.
              </div>
              <Input
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                className="flex-1 border-border/50 focus:border-primary"
              />
              {poll.options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="h-10 w-10 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {poll.options.length < 10 && (
            <Button
              type="button"
              variant="outline"
              onClick={addOption}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="poll-duration">Duration</Label>
            <Select value={poll.duration.toString()} onValueChange={updateDuration}>
              <SelectTrigger className="border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="poll-multiple">Multiple Choice</Label>
              <Switch
                id="poll-multiple"
                checked={poll.allowMultiple}
                onCheckedChange={toggleMultiple}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {poll.allowMultiple 
                ? 'Users can select multiple options'
                : 'Users can select only one option'
              }
            </p>
          </div>
        </div>

        {isValidPoll && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">Poll Preview</p>
                <p className="text-muted-foreground">
                  {validOptions.length} options • {poll.duration} day{poll.duration !== 1 ? 's' : ''} • {poll.allowMultiple ? 'Multiple choice' : 'Single choice'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};