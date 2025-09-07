import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { EditablePost } from '@/components/EditablePost';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Enhanced Media Upload
vi.mock('@/components/EnhancedMediaUpload', () => ({
  EnhancedMediaUpload: ({ files, onFilesChange }: any) => (
    <div data-testid="enhanced-media-upload">
      <button onClick={() => onFilesChange([...files, 'new-file.jpg'])}>
        Add File
      </button>
    </div>
  ),
}));

describe('EditablePost', () => {
  const mockPost = {
    id: 'test-post-id',
    title: 'Test Post',
    content: 'Test content',
    user_id: 'test-user-id',
    media_type: null,
    media_url: null,
  };

  const mockProps = {
    post: mockPost,
    onUpdate: vi.fn(),
    isAuthor: true,
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders post content in view mode', () => {
    render(<EditablePost {...mockProps} />);
    
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows edit button on hover for authors', () => {
    render(<EditablePost {...mockProps} />);
    
    const editButton = screen.getByRole('button');
    expect(editButton).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', () => {
    render(<EditablePost {...mockProps} />);
    
    const editButton = screen.getByRole('button');
    fireEvent.click(editButton);

    expect(screen.getByText('Editing Post')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Post')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test content')).toBeInTheDocument();
  });

  it('saves changes when save button is clicked', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any).mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: mockUpdate,
          })),
        })),
      })),
    });

    render(<EditablePost {...mockProps} />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button');
    fireEvent.click(editButton);

    // Modify title
    const titleInput = screen.getByDisplayValue('Test Post');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    // Save changes
    const saveButton = screen.getByRole('button', { name: /check/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockProps.onUpdate).toHaveBeenCalled();
    });
  });

  it('cancels edit when cancel button is clicked', () => {
    render(<EditablePost {...mockProps} />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button');
    fireEvent.click(editButton);

    // Modify title
    const titleInput = screen.getByDisplayValue('Test Post');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    // Cancel changes
    const cancelButton = screen.getByRole('button', { name: /x/i });
    fireEvent.click(cancelButton);

    // Should be back in view mode with original content
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.queryByText('Editing Post')).not.toBeInTheDocument();
  });

  it('does not show edit controls for non-authors', () => {
    render(<EditablePost {...mockProps} isAuthor={false} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows edited tag for edited posts', () => {
    const editedPost = { ...mockPost, is_edited: true };
    render(<EditablePost {...mockProps} post={editedPost} />);
    
    expect(screen.getByText('Edited')).toBeInTheDocument();
  });
});