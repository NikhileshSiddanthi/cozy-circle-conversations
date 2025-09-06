import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image, Video, FileText, BarChart3 } from "lucide-react";
import { EnhancedPostComposer } from "./EnhancedPostComposer";

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface PostComposerProps {
  groups: Group[];
  selectedGroupId?: string;
  onSuccess?: () => void;
}

export const PostComposer = ({ groups, selectedGroupId, onSuccess }: PostComposerProps) => {
  return (
    <EnhancedPostComposer
      groups={groups}
      selectedGroupId={selectedGroupId}
      onSuccess={onSuccess}
    />
  );
};