import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'Unknown date';
  return new Date(timestamp).toLocaleString();
}

export function formatRelativeDate(timestamp: number | null): string {
  if (!timestamp) return 'Unknown date';
  
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (days > 30) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return 'Today';
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
