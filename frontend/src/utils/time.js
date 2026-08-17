/**
 * Formats a given date string into a WhatsApp-style Last Seen string.
 * Examples:
 * - "Last seen just now" (if within 1 minute)
 * - "Last seen today at 3:42 PM"
 * - "Last seen yesterday at 8:15 PM"
 * - "Last seen 12 Aug at 7:30 PM"
 * - "Last seen 12 Aug 2023 at 7:30 PM" (if different year)
 *
 * @param {string|Date} dateStr - The date string or object to format
 * @returns {string} The formatted "Last seen..." string
 */
export const formatLastSeen = (dateStr) => {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Last seen just now';
  }

  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const formattedTime = date.toLocaleTimeString(undefined, timeOptions);

  // Check if it's today
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Last seen today at ${formattedTime}`;
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Last seen yesterday at ${formattedTime}`;
  }

  // Otherwise, format date like "12 Aug" or "12 Aug 2023"
  const isSameYear = date.getFullYear() === now.getFullYear();
  const dateOptions = {
    day: 'numeric',
    month: 'short',
    ...(isSameYear ? {} : { year: 'numeric' }),
  };
  const formattedDate = date.toLocaleDateString(undefined, dateOptions);

  return `Last seen ${formattedDate} at ${formattedTime}`;
};
