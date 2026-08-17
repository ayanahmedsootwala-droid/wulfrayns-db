import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount?: number | null, currency = 'PKR'): string {
  if (amount == null) return '—';
  if (amount >= 10000000) return `${currency} ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${currency} ${(amount / 100000).toFixed(2)} Lac`;
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatMileage(km?: number | null): string {
  if (km == null) return '—';
  return `${km.toLocaleString()} km`;
}

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatRelativeTime(date?: string | null): string {
  if (!date) return '—';
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = now - d;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getStatusColor(status?: string): string {
  const map: Record<string, string> = {
    available: 'text-green-400 bg-green-400/10 border-green-400/20',
    reserved: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    booked: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    sold: 'text-muted-foreground bg-muted/50 border-border',
    incoming: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    archived: 'text-muted-foreground bg-muted/30 border-border',
    inspection: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  };
  return map[status ?? ''] ?? 'text-muted-foreground bg-muted/30 border-border';
}

export function getPriorityColor(priority?: string): string {
  const map: Record<string, string> = {
    low: 'text-muted-foreground',
    normal: 'text-foreground',
    high: 'text-yellow-400',
    urgent: 'text-red-400',
  };
  return map[priority ?? ''] ?? 'text-foreground';
}

export function truncate(str?: string | null, length = 30): string {
  if (!str) return '—';
  return str.length > length ? str.slice(0, length) + '…' : str;
}

export function capitalizeFirst(str?: string | null): string {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
