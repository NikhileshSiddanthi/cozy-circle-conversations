import { formatDistanceToNow, format, parseISO } from 'date-fns';

/**
 * Format a timestamp as relative time (e.g. "3 hours ago")
 */
export function formatRelative(timestampIso: string): string {
  try {
    if (!timestampIso) return 'Just now';
    
    const date = parseISO(timestampIso);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn('Invalid timestamp:', timestampIso, error);
    return 'Just now';
  }
}

/**
 * Format a timestamp as full local time (e.g. "10 Sep 2025, 7:23 AM")
 */
export function formatFull(timestampIso: string): string {
  try {
    if (!timestampIso) return 'Unknown time';
    
    const date = parseISO(timestampIso);
    return format(date, 'dd MMM yyyy, h:mm a');
  } catch (error) {
    console.warn('Invalid timestamp:', timestampIso, error);
    return 'Unknown time';
  }
}

/**
 * Format timestamp with timezone info (e.g. "10 Sep 2025, 7:23 AM GMT+5:30")
 */
export function formatFullWithTz(timestampIso: string): string {
  try {
    if (!timestampIso) return 'Unknown time';
    
    const date = parseISO(timestampIso);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzOffset = date.getTimezoneOffset();
    const tzString = `GMT${tzOffset <= 0 ? '+' : '-'}${Math.abs(Math.floor(tzOffset / 60))}:${String(Math.abs(tzOffset % 60)).padStart(2, '0')}`;
    
    return `${format(date, 'dd MMM yyyy, h:mm a')} ${tzString}`;
  } catch (error) {
    console.warn('Invalid timestamp:', timestampIso, error);
    return 'Unknown time';
  }
}

/**
 * Check if a timestamp represents an edited time that's different from created time
 */
export function isEdited(createdAt: string, editedAt?: string): boolean {
  if (!editedAt) return false;
  
  try {
    const created = parseISO(createdAt);
    const edited = parseISO(editedAt);
    // Consider edited if there's more than 1 minute difference
    return Math.abs(edited.getTime() - created.getTime()) > 60000;
  } catch {
    return false;
  }
}