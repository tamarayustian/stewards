const ledgerDate = new Intl.DateTimeFormat('en-HK', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const monthYear = new Intl.DateTimeFormat('en-HK', {
  month: 'long',
  year: 'numeric',
});

export function formatLedgerDate(date: Date): string {
  return ledgerDate.format(date);
}

export function formatMonthYear(date: Date): string {
  return monthYear.format(date);
}

export function timeAgo(date: Date, now = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
