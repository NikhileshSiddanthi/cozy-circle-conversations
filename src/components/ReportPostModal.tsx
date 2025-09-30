import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

interface ReportPostModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'violence', label: 'Violence or dangerous content' },
  { value: 'misinformation', label: 'False information' },
  { value: 'inappropriate_content', label: 'Inappropriate or offensive content' },
  { value: 'other', label: 'Other' },
] as const;

export const ReportPostModal = ({ postId, isOpen, onClose }: ReportPostModalProps) => {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('create-report', {
        body: {
          post_id: postId,
          reason,
          details: details.trim() || undefined,
        }
      });

      if (error) {
        if (error.message?.includes('already reported')) {
          toast.error('You have already reported this post');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Report submitted', {
        description: 'Thank you for helping keep our community safe. We will review this report shortly.',
      });
      
      onClose();
      setReason('');
      setDetails('');
    } catch (error) {
      console.error('Report submission error:', error);
      toast.error('Failed to submit report', {
        description: 'Please try again later',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Report Post
          </DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this post. Your report will be reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="reason">Reason for reporting *</Label>
            <RadioGroup 
              value={reason} 
              onValueChange={setReason}
              className="space-y-2"
            >
              {REPORT_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label 
                    htmlFor={item.value} 
                    className="font-normal cursor-pointer"
                  >
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context that might help us review this report..."
              className="resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {details.length}/500 characters
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isSubmitting || !reason}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
