import { PostComposer } from "./PostComposer";

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface PostComposerProps {
  groups: Group[];
  selectedGroupId?: string;
  onSuccess?: () => void;
  onOptimisticPost?: (post: any) => void;
}

export const EnhancedPostComposer = ({ groups, selectedGroupId, onSuccess }: PostComposerProps) => {
  return (
    <PostComposer
      groups={groups}
      selectedGroupId={selectedGroupId}
      onSuccess={onSuccess || (() => {})}
    />
  );
};