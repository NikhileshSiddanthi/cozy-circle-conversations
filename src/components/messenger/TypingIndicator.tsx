interface TypingIndicatorProps {
  users: Array<{
    userId: string;
    displayName: string;
  }>;
}

export const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const displayText =
    users.length === 1
      ? `${users[0].displayName} is typing`
      : users.length === 2
      ? `${users[0].displayName} and ${users[1].displayName} are typing`
      : `${users.length} people are typing`;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span>{displayText}</span>
    </div>
  );
};
