import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  Quote, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Smile,
  AtSign,
  Hash
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import ReactQuill from 'react-quill';

interface RichTextToolbarProps {
  quillRef: React.RefObject<ReactQuill>;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ quillRef }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const applyFormat = (format: string, value?: any) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) return;

    switch (format) {
      case 'bold':
        quill.format('bold', !quill.getFormat().bold);
        break;
      case 'italic':
        quill.format('italic', !quill.getFormat().italic);
        break;
      case 'underline':
        quill.format('underline', !quill.getFormat().underline);
        break;
      case 'strike':
        quill.format('strike', !quill.getFormat().strike);
        break;
      case 'code':
        quill.format('code', !quill.getFormat().code);
        break;
      case 'blockquote':
        quill.format('blockquote', !quill.getFormat().blockquote);
        break;
      case 'list':
        quill.format('list', 'ordered');
        break;
      case 'bullet':
        quill.format('list', 'bullet');
        break;
      case 'header':
        quill.format('header', value);
        break;
      case 'mention':
        quill.insertText(range.index, '@');
        quill.setSelection({ index: range.index + 1, length: 0 });
        break;
      case 'hashtag':
        quill.insertText(range.index, '#');
        quill.setSelection({ index: range.index + 1, length: 0 });
        break;
      default:
        break;
    }
    
    // Refocus the editor
    quill.focus();
  };

  const insertEmoji = (emojiObject: any) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (range) {
      quill.insertText(range.index, emojiObject.emoji);
      quill.setSelection({ index: range.index + emojiObject.emoji.length, length: 0 });
    }
    setShowEmojiPicker(false);
    quill.focus();
  };

  const getActiveFormats = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return {};
    return quill.getFormat();
  };

  const activeFormats = getActiveFormats();

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border border-border rounded-md bg-muted/30">
      {/* Text Formatting */}
      <div className="flex items-center gap-1 pr-2 border-r border-border">
        <Button
          type="button"
          variant={activeFormats.bold ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('bold')}
          className="h-8 w-8 p-0"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.italic ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('italic')}
          className="h-8 w-8 p-0"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.underline ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('underline')}
          className="h-8 w-8 p-0"
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.strike ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('strike')}
          className="h-8 w-8 p-0"
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.code ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('code')}
          className="h-8 w-8 p-0"
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      {/* Headings */}
      <div className="flex items-center gap-1 pr-2 border-r border-border">
        <Button
          type="button"
          variant={activeFormats.header === 1 ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('header', 1)}
          className="h-8 w-8 p-0"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.header === 2 ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('header', 2)}
          className="h-8 w-8 p-0"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.header === 3 ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('header', 3)}
          className="h-8 w-8 p-0"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Lists and Quote */}
      <div className="flex items-center gap-1 pr-2 border-r border-border">
        <Button
          type="button"
          variant={activeFormats.list === 'bullet' ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('bullet')}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.list === 'ordered' ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('list')}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={activeFormats.blockquote ? "default" : "ghost"}
          size="sm"
          onClick={() => applyFormat('blockquote')}
          className="h-8 w-8 p-0"
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>

      {/* Special Inserts */}
      <div className="flex items-center gap-1">
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Insert Emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <EmojiPicker
              onEmojiClick={insertEmoji}
              width={320}
              height={400}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
            />
          </PopoverContent>
        </Popover>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormat('mention')}
          className="h-8 w-8 p-0"
          title="Mention User (@)"
        >
          <AtSign className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyFormat('hashtag')}
          className="h-8 w-8 p-0"
          title="Add Hashtag (#)"
        >
          <Hash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};