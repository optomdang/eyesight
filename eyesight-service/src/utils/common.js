const moment = require('moment');

function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

const formatAmount = (amount = 0) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const unitOptions = {
  unit: 'Chiếc',
  box: 'Hộp',
  pack: 'Bao',
  piece: 'Miếng',
  milliliter: 'Ml',
  kilogram: 'Kg',
  gram: 'G',
};

function numberToWords(num) {
  if (num === 0) return 'Không đồng';
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  const teens = [
    'mười',
    'mười một',
    'mười hai',
    'mười ba',
    'mười bốn',
    'mười lăm',
    'mười sáu',
    'mười bảy',
    'mười tám',
    'mười chín',
  ];

  function readHundreds(number) {
    let result = '';
    const hundred = Math.floor(number / 100);
    const remainder = Math.floor(number % 100);

    if (hundred > 0) result += `${units[hundred]} trăm `;

    if (remainder > 0) {
      if (remainder < 20 && remainder >= 10) {
        result += teens[remainder - 10];
      } else {
        const ten = Math.floor(remainder / 10);
        const unit = remainder % 10;

        if (ten > 1) result += `${tens[ten]} `;
        else if (ten === 1) result += 'mười ';

        if (unit > 0) result += (ten === 0 && hundred > 0 ? 'lẻ ' : '') + units[unit];
      }
    }

    return result.trim();
  }

  function readThousands(number) {
    let result = '';
    const thousand = Math.floor(number / 1000);
    const remainder = Math.floor(number % 1000);

    if (thousand > 0) result += `${readHundreds(thousand)} nghìn `;

    if (remainder > 0) result += readHundreds(remainder);

    return result.trim();
  }

  function readMillions(number) {
    let result = '';
    const million = Math.floor(number / 1000000);
    const remainder = Math.floor(number % 1000000);

    if (million > 0) result += `${readHundreds(million)} triệu `;

    if (remainder > 0) result += readThousands(remainder);

    return result.trim();
  }

  function readBillions(number) {
    let result = '';
    const billion = Math.floor(number / 1000000000);
    const remainder = Math.floor(number % 1000000000);

    if (billion > 0) result += `${readHundreds(billion)} tỷ `;

    if (remainder > 0) result += readMillions(remainder);

    return result.trim();
  }

  // Viết hoa chữ cái đầu tiên
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  return `${capitalizeFirstLetter(readBillions(num))} đồng`;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const calculateEndDate = (startDate, frequency) => {
  const end = moment(startDate);
  // Standardize to moment.js duration units (use adjective form for consistency)
  const unitMap = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year',
  };
  const unit = unitMap[frequency] || 'week';
  return end.add(1, unit).toDate();
};

const calculateStartDate = (config, currentDate = new Date()) => {
  const start = moment(currentDate).startOf('day');

  if (config.frequencyUnit === 'week') {
    start.startOf('week'); // Sunday as start
  } else if (config.frequencyUnit === 'month') {
    start.startOf('month');
  } else if (config.frequencyUnit === 'year') {
    start.startOf('year');
  }

  return start.toDate();
};

/**
 * Calculate the start date of the next cycle based on the current session's end date
 * @param {Date} currentEndDate - The end date of the current session
 * @param {string} frequencyUnit - The unit of frequency (days, weeks, months, years)
 * @returns {Date} - The start date of the next cycle
 */
const calculateNextStartDate = (currentEndDate, frequency) => {
  const baseDate = currentEndDate || new Date();
  const nextDay = moment(baseDate).add(1, 'day').startOf('day');

  // Adjust to cycle start based on frequency
  if (frequency === 'weekly') {
    nextDay.startOf('week'); // Sunday as start
  } else if (frequency === 'monthly') {
    nextDay.startOf('month');
  } else if (frequency === 'quarterly') {
    nextDay.startOf('quarter');
  } else if (frequency === 'yearly') {
    nextDay.startOf('year');
  }

  return nextDay.toDate();
};

const generateCode = (prefix) => {
  // Use a prefix to indicate it's a product code
  // Format the current date as YYYYMMDD
  const datePart = moment().format('YYMMDD');
  // Generate a random string for uniqueness
  const uniquePart = Math.random().toString(36).substring(2, 5).toUpperCase();
  // Combine the prefix, date part, and the unique part
  return `${prefix}${datePart}${uniquePart}`;
};

// ==================== EXAM TYPE CONSTANTS ====================
/**
 * Valid exam types
 */
const EXAM_TYPES = {
  FAR: 'far',
  NEAR: 'near',
  CONTRAST: 'contrast',
  STEREOPSIS: 'stereopsis',
};

/**
 * Get exam type display name
 * @param {string} examType - The exam type enum value
 * @returns {string} Human readable exam type
 */
const getExamTitle = (examType) => {
  const titles = {
    far: 'Kiểm tra thị lực nhìn xa',
    near: 'Kiểm tra thị lực nhìn gần',
    contrast: 'Kiểm tra độ tương phản',
    stereopsis: 'Kiểm tra thị giác lập thể',
  };
  return titles[examType] || examType;
};

// ==================== FREQUENCY UTILITIES ====================

/**
 * Convert frequency enum to days for scheduling calculations
 * @param {string} frequency - The frequency enum value
 * @returns {number} Number of days
 */
const frequencyToDays = (frequency) => {
  // Standardize frequency to days mapping (adjective form)
  const frequencyMap = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  };
  return frequencyMap[frequency] || 7; // Default to weekly if invalid
};

/**
 * Convert frequency enum to human readable text
 * @param {string} frequency - The frequency enum value
 * @returns {string} Human readable frequency
 */
const frequencyToText = (frequency) => {
  // Vietnamese text mapping for frequency (adjective form)
  const textMap = {
    daily: 'Hàng ngày',
    weekly: 'Hàng tuần',
    monthly: 'Hàng tháng',
    quarterly: 'Hàng quý',
    yearly: 'Hàng năm',
  };
  return textMap[frequency] || 'Hàng tuần';
};

/**
 * Calculate next due date based on last exam date and frequency
 * @param {string} lastDate - The last exam date (ISO string)
 * @param {string} frequency - The frequency enum value
 * @returns {string} Next due date (ISO string)
 */
const calculateNextDueDate = (lastDate, frequency) => {
  const last = moment(lastDate);
  // Standardize to moment.js duration units
  const unitMap = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year',
  };
  const unit = unitMap[frequency] || 'week';
  return last.add(1, unit).toISOString();
};

/**
 * Get the start/end boundaries of the current calendar cycle for a frequency.
 *
 * This is used for session scheduling and "current session" selection.
 * - daily:   today 00:00:00 → today 23:59:59
 * - weekly:  Monday 00:00:00 → Sunday 23:59:59 (ISO-like)
 * - monthly: 1st 00:00:00 → last day 23:59:59
 * - quarterly: first day of quarter → last day of quarter
 * - yearly:  Jan 1st → Dec 31st
 */
const getCurrentCycleDateRange = (frequency, now = new Date()) => {
  // Use moment() to work with local time
  const start = moment(now).startOf('day');

  // Adjust to cycle start based on frequency
  if (frequency === 'weekly') {
    start.startOf('isoWeek'); // Monday as start
  } else if (frequency === 'monthly') {
    start.startOf('month');
  } else if (frequency === 'quarterly') {
    start.startOf('quarter');
  } else if (frequency === 'yearly') {
    start.startOf('year');
  }

  // Calculate cycle end
  const end = start.clone();
  const unitMap = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year',
  };
  const unit = unitMap[frequency] || 'week';
  end.add(1, unit).subtract(1, 'millisecond');

  return { start: start.toDate(), end: end.toDate() };
};

module.exports = {
  escapeRegExp,
  numberToWords,
  removeAccents,
  formatAmount,
  unitOptions,
  calculateEndDate,
  calculateStartDate,
  calculateNextStartDate,
  generateCode,
  EXAM_TYPES,
  getExamTitle,
  frequencyToDays,
  frequencyToText,
  calculateNextDueDate,
  getCurrentCycleDateRange,
};
