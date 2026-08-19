// C:\Users\HP\MediTrack\frontend\src\utils\dateFormat.js

const DEFAULT_DATE_FORMAT = 'MM/DD/YYYY';

export const DATE_FORMATS = [
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
];

const pad = (value) => String(value).padStart(2, '0');

const parseDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const stringValue = String(value).trim();
  if (!stringValue) return null;

  // Handle YYYY-MM-DD without timezone shifting.
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stringValue);

  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(stringValue);

  return isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value, format = DEFAULT_DATE_FORMAT) => {
  const date = parseDate(value);

  if (!date) return value || '';

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;

    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;

    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
};

export const getDateFormat = (preferences) => {
  const format = preferences?.dateFormat;

  return DATE_FORMATS.includes(format)
    ? format
    : DEFAULT_DATE_FORMAT;
};

export const formatUserDate = (value, preferences) => {
  return formatDate(
    value,
    getDateFormat(preferences)
  );
};

export default formatDate;