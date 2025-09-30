import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Format a timestamp as relative time (e.g. "3 hours ago")
 * Handles UTC timestamps from database and converts to user's local timezone
 */
export function formatRelative(timestampIso: string): string {
  try {
    if (!timestampIso) {
      console.warn('formatRelative: Empty timestamp provided');
      return 'Just now';
    }
    
    // Parse the ISO timestamp - Supabase returns UTC timestamps
    const date = parseISO(timestampIso);
    
    // Validate the parsed date
    if (!isValid(date)) {
      console.warn('formatRelative: Invalid date after parsing:', timestampIso);
      return 'Just now';
    }
    
    // Convert to user's local timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const zonedDate = toZonedTime(date, userTimezone);
    
    return formatDistanceToNow(zonedDate, { addSuffix: true });
  } catch (error) {
    console.error('formatRelative: Error formatting timestamp:', timestampIso, error);
    return 'Just now';
  }
}

/**
 * Format a timestamp as full local time (e.g. "10 Sep 2025, 7:23 AM")
 * Automatically converts from UTC to user's local timezone
 */
export function formatFull(timestampIso: string): string {
  try {
    if (!timestampIso) return 'Unknown time';
    
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return formatInTimeZone(timestampIso, userTimezone, 'dd MMM yyyy, h:mm a');
  } catch (error) {
    console.warn('Invalid timestamp:', timestampIso, error);
    return 'Unknown time';
  }
}

/**
 * Format timestamp with timezone info (e.g. "10 Sep 2025, 7:23 AM IST")
 * Shows the full timestamp in user's local timezone with timezone abbreviation
 */
export function formatFullWithTz(timestampIso: string): string {
  try {
    if (!timestampIso) return 'Unknown time';
    
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formattedDate = formatInTimeZone(timestampIso, userTimezone, 'dd MMM yyyy, h:mm a zzz');
    
    return formattedDate;
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