import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { EnhancedMediaUpload } from '@/components/EnhancedMediaUpload';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token' } }
      })),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('EnhancedMediaUpload', () => {
  const mockProps = {
    files: [],
    onFilesChange: vi.fn(),
    groupId: 'test-group',
    userId: 'test-user',
    draftId: 'test-draft',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area', () => {
    render(<EnhancedMediaUpload {...mockProps} />);
    
    expect(screen.getByText('Upload your media files')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop files here, or click to select files')).toBeInTheDocument();
  });

  it('shows immediate preview for image files', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Mock successful upload
    (supabase.storage.from as any).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/image.jpg' } }),
    });
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'test-media-id' }),
    });

    render(<EnhancedMediaUpload {...mockProps} />);
    
    const input = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    });
  });

  it('validates file size', () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    render(<EnhancedMediaUpload {...mockProps} />);
    
    const input = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(input, { target: { files: [largeFile] } });

    // Should show error message for large file
    expect(mockProps.onFilesChange).not.toHaveBeenCalled();
  });

  it('handles upload errors gracefully', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Mock failed upload
    (supabase.storage.from as any).mockReturnValue({
      upload: vi.fn().mockRejectedValue(new Error('Upload failed')),
    });

    render(<EnhancedMediaUpload {...mockProps} />);
    
    const input = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
    });
  });

  it('replaces preview URL with server URL on successful upload', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Mock successful upload
    (supabase.storage.from as any).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/image.jpg' } }),
    });
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'test-media-id' }),
    });

    render(<EnhancedMediaUpload {...mockProps} />);
    
    const input = screen.getByRole('textbox', { hidden: true });
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockProps.onFilesChange).toHaveBeenCalledWith(['https://test.com/image.jpg']);
    });

    await waitFor(() => {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });
});