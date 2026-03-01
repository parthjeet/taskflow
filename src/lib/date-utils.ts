import { formatDistanceToNow, format, differenceInDays } from 'date-fns';

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = differenceInDays(new Date(), date);
  if (days < 7) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return format(date, 'MMM d');
}

export function isWithin24Hours(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
}
