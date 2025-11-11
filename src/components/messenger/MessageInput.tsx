import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Smile, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface MessageInputProps {
  onSend: (data: {
    content: string;
    attachment_url?: string;
    attachment_name?: string;
    attachment_size?: number;
    content_type?: string;
  }) => Promise<void>;
  onTyping: () => void;
  onStopTyping: () => void;
  isSending: boolean;
}

export const MessageInput = ({
  onSend,
  onTyping,
  onStopTyping,
  isSending,
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<{
    file: File;
    preview?: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { uploadFile, uploading, progress } = useFileUpload();

  const handleTyping = () => {
    onTyping();
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSend = async () => {
    if ((!message.trim() && !attachment) || isSending || uploading) return;

    try {
      let uploadResult = null;
      
      // Upload attachment if present
      if (attachment) {
        uploadResult = await uploadFile(attachment.file);
        if (!uploadResult) {
          toast.error('Failed to upload attachment');
          return;
        }
      }

      // Send message
      await onSend({
        content: message.trim() || 'Sent an attachment',
        attachment_url: uploadResult?.url,
        attachment_name: uploadResult?.name,
        attachment_size: uploadResult?.size,
        content_type: uploadResult?.type,
      });

      // Clear input
      setMessage('');
      setAttachment(null);
      onStopTyping();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachment({
          file,
          preview: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachment({ file });
    }
  };

  return (
    <div className="p-4">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-3 p-3 bg-muted rounded-lg">
          <div className="flex items-start gap-3">
            {attachment.preview ? (
              <img
                src={attachment.preview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-background rounded flex items-center justify-center">
                <Paperclip className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAttachment(null)}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-3">
          <Progress value={progress} className="h-1" />
          <p className="text-xs text-muted-foreground mt-1">Uploading... {progress}%</p>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isSending}
          className="flex-shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 resize-none min-h-[44px] max-h-32"
          rows={1}
          disabled={uploading || isSending}
        />

        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !attachment) || isSending || uploading}
          size="icon"
          className="flex-shrink-0"
        >
          {isSending || uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
};
