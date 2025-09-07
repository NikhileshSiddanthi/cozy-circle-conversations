import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote,
  Code,
  AtSign,
  Hash
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  showToolbar?: boolean;
  onMention?: (query: string) => void;
  onHashtag?: (query: string) => void;
  'data-testid'?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "What's on your mind?",
  maxLength = 5000,
  showToolbar = true,
  onMention,
  onHashtag,
  'data-testid': dataTestId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Handle mention and hashtag detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check for mentions (@)
    const beforeCursor = newValue.slice(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
      onMention?.(mentionMatch[1]);
    } else {
      setShowMentions(false);
    }

    // Check for hashtags (#)
    const hashtagMatch = beforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      setHashtagQuery(hashtagMatch[1]);
      setShowHashtags(true);
      onHashtag?.(hashtagMatch[1]);
    } else {
      setShowHashtags(false);
    }
  };

  // Insert formatting
  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = value.slice(start, end);
    
    const newText = value.slice(0, start) + before + selectedText + after + value.slice(end);
    
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  // Insert list item
  const insertList = (ordered: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const beforeCursor = value.slice(0, start);
    const afterCursor = value.slice(start);
    
    // Check if we're at the start of a line
    const isStartOfLine = start === 0 || value[start - 1] === '\n';
    const prefix = isStartOfLine ? '' : '\n';
    const listMarker = ordered ? '1. ' : '- ';
    
    const newText = beforeCursor + prefix + listMarker + afterCursor;
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length + listMarker.length,
        start + prefix.length + listMarker.length
      );
    }, 0);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertFormatting('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('*', '*');
          break;
        case 'Enter':
          if (e.shiftKey) {
            e.preventDefault();
            insertFormatting('\n');
          }
          break;
      }
    }

    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      insertFormatting('  ');
    }
  };

  return (
    <div className="space-y-2">
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 border-b border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('**', '**')}
            title="Bold (Ctrl+B)"
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('*', '*')}
            title="Italic (Ctrl+I)"
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertList(false)}
            title="Bullet List"
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertList(true)}
            title="Numbered List"
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('\n> ')}
            title="Quote"
            className="h-8 w-8 p-0"
          >
            <Quote className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('`', '`')}
            title="Code"
            className="h-8 w-8 p-0"
          >
            <Code className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-2" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('@')}
            title="Mention someone"
            className="h-8 w-8 p-0"
          >
            <AtSign className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertFormatting('#')}
            title="Add hashtag"
            className="h-8 w-8 p-0"
          >
            <Hash className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="border-border/50 focus:border-primary resize-none overflow-hidden min-h-[120px] max-h-[200px]"
          rows={4}
          data-testid={dataTestId}
        />
        
        {/* Mention/Hashtag suggestions would go here */}
        {(showMentions || showHashtags) && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-popover border border-border rounded-md shadow-md z-10">
            <p className="text-xs text-muted-foreground">
              {showMentions ? `Mentioning: @${mentionQuery}` : `Hashtag: #${hashtagQuery}`}
            </p>
            {/* Add actual suggestions here */}
          </div>
        )}
      </div>

      {showToolbar && (
        <div className="text-xs text-muted-foreground">
          <span>Tip: Use </span>
          <code className="bg-muted px-1 rounded">**bold**</code>
          <span>, </span>
          <code className="bg-muted px-1 rounded">*italic*</code>
          <span>, </span>
          <code className="bg-muted px-1 rounded">@mention</code>
          <span>, </span>
          <code className="bg-muted px-1 rounded">#hashtag</code>
          <span> for formatting</span>
        </div>
      )}
    </div>
  );
};