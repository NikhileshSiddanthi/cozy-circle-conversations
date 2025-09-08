import { MediaUpload } from "./MediaUpload";

interface MediaUploadProps {
  files: string[];
  onFilesChange: (files: string[]) => void;
  onUploadStatusChange?: (uploading: boolean) => void;
  groupId?: string;
  userId?: string;
  draftId?: string;
  disabled?: boolean;
  isWorkingMode?: boolean;
}

export const EnhancedMediaUpload = (props: MediaUploadProps) => {
  return (
    <MediaUpload
      files={props.files}
      onFilesChange={props.onFilesChange}
      onUploadStatusChange={props.onUploadStatusChange}
      maxFiles={10}
      disabled={props.disabled}
      draftId={props.draftId}
    />
  );
};