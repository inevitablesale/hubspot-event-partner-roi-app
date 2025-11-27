import { 
  generateId, 
  createAPIResponse, 
  createPaginatedResponse,
  parseDate,
  formatDate,
  daysBetween,
  formatCurrency,
  calculatePercentage,
  formatPercentage,
  isValidEmail,
  safeParseJSON,
  deepClone,
  chunkArray,
} from '../../src/utils/helpers';

describe('Helper Utils', () => {
  describe('generateId', () => {
    it('should generate a valid UUID', () => {
      const id = generateId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createAPIResponse', () => {
    it('should create a success response', () => {
      const response = createAPIResponse(true, { foo: 'bar' }, 'Success');
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ foo: 'bar' });
      expect(response.message).toBe('Success');
      expect(response.timestamp).toBeDefined();
    });

    it('should create an error response', () => {
      const response = createAPIResponse(false, undefined, undefined, 'Error occurred');
      
      expect(response.success).toBe(false);
      expect(response.data).toBeUndefined();
      expect(response.error).toBe('Error occurred');
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create a paginated response', () => {
      const data = [1, 2, 3, 4, 5];
      const response = createPaginatedResponse(true, data, 25, 1, 5);
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination.total).toBe(25);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.pageSize).toBe(5);
      expect(response.pagination.totalPages).toBe(5);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrevious).toBe(false);
    });

    it('should handle last page', () => {
      const response = createPaginatedResponse(true, [], 25, 5, 5);
      
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrevious).toBe(true);
    });
  });

  describe('parseDate', () => {
    it('should parse a valid ISO date string', () => {
      const date = parseDate('2024-01-15T10:30:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
    });

    it('should return null for invalid date', () => {
      const date = parseDate('not-a-date');
      expect(date).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('should format a date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-15');
      expect(daysBetween(start, end)).toBe(14);
    });

    it('should handle same date', () => {
      const date = new Date('2024-01-01');
      expect(daysBetween(date, date)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format a number as USD currency', () => {
      const formatted = formatCurrency(1234.56);
      expect(formatted).toBe('$1,234.56');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 1);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with two decimals', () => {
      expect(formatPercentage(33.333)).toBe('33.33%');
      expect(formatPercentage(100)).toBe('100.00%');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('safeParseJSON', () => {
    it('should parse valid JSON', () => {
      const result = safeParseJSON('{"foo": "bar"}', {});
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = safeParseJSON('not-json', fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe('deepClone', () => {
    it('should create a deep clone of an object', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });
  });

  describe('chunkArray', () => {
    it('should chunk array into smaller arrays', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(arr, 3);
      
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty array', () => {
      const chunks = chunkArray([], 3);
      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const chunks = chunkArray([1, 2], 5);
      expect(chunks).toEqual([[1, 2]]);
    });
  });
});
