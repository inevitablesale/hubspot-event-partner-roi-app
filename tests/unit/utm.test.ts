import { cleanUTMParameters, parseUTMFromURL, buildUTMQueryString, generateCampaignNameFromUTM } from '../../src/utils/utm';

describe('UTM Utils', () => {
  describe('cleanUTMParameters', () => {
    it('should clean and normalize basic UTM parameters', () => {
      const rawUTM = {
        utm_source: 'Google',
        utm_medium: 'CPC',
        utm_campaign: 'Spring Event 2024',
      };

      const result = cleanUTMParameters(rawUTM);

      expect(result.source).toBe('google');
      expect(result.medium).toBe('cpc');
      expect(result.campaign).toBe('spring-event-2024');
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle alternative key formats', () => {
      const rawUTM = {
        utmsource: 'Facebook',
        utmmedium: 'Social',
        utmcampaign: 'Test',
      };

      const result = cleanUTMParameters(rawUTM);

      expect(result.source).toBe('facebook');
      expect(result.medium).toBe('social');
      expect(result.campaign).toBe('test');
    });

    it('should report issues for missing required fields', () => {
      const rawUTM = {
        utm_source: 'google',
      };

      const result = cleanUTMParameters(rawUTM);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing utm_medium');
      expect(result.issues).toContain('Missing utm_campaign');
    });

    it('should report unknown sources', () => {
      const rawUTM = {
        utm_source: 'unknown-source',
        utm_medium: 'cpc',
        utm_campaign: 'test',
      };

      const result = cleanUTMParameters(rawUTM);

      expect(result.issues).toContain('Unknown source: unknown-source');
    });

    it('should handle empty object', () => {
      const result = cleanUTMParameters({});

      expect(result.source).toBe('');
      expect(result.medium).toBe('');
      expect(result.campaign).toBe('');
      expect(result.isValid).toBe(false);
    });

    it('should preserve original data', () => {
      const rawUTM = {
        utm_source: 'Google',
        custom_param: 'value',
      };

      const result = cleanUTMParameters(rawUTM);

      expect(result.original).toEqual(rawUTM);
    });

    it('should clean special characters', () => {
      const rawUTM = {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'Test Campaign! @#$%',
      };

      const result = cleanUTMParameters(rawUTM);

      expect(result.campaign).toBe('test-campaign-');
    });
  });

  describe('parseUTMFromURL', () => {
    it('should parse UTM parameters from a valid URL', () => {
      const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=spring';

      const result = parseUTMFromURL(url);

      expect(result.utm_source).toBe('google');
      expect(result.utm_medium).toBe('cpc');
      expect(result.utm_campaign).toBe('spring');
    });

    it('should return empty object for invalid URL', () => {
      const result = parseUTMFromURL('not-a-valid-url');

      expect(result).toEqual({});
    });

    it('should return empty object for URL without UTM params', () => {
      const url = 'https://example.com/page?foo=bar';

      const result = parseUTMFromURL(url);

      expect(result).toEqual({});
    });

    it('should handle URL with mixed parameters', () => {
      const url = 'https://example.com?page=1&utm_source=email&foo=bar&utm_medium=newsletter';

      const result = parseUTMFromURL(url);

      expect(result.utm_source).toBe('email');
      expect(result.utm_medium).toBe('newsletter');
      expect(result.page).toBeUndefined();
      expect(result.foo).toBeUndefined();
    });
  });

  describe('buildUTMQueryString', () => {
    it('should build query string from cleaned UTM', () => {
      const cleanedUTM = {
        source: 'google',
        medium: 'cpc',
        campaign: 'test',
        content: '',
        term: '',
        original: {},
        isValid: true,
        issues: [],
      };

      const result = buildUTMQueryString(cleanedUTM);

      expect(result).toContain('utm_source=google');
      expect(result).toContain('utm_medium=cpc');
      expect(result).toContain('utm_campaign=test');
    });

    it('should skip empty values', () => {
      const cleanedUTM = {
        source: 'google',
        medium: '',
        campaign: 'test',
        content: '',
        term: '',
        original: {},
        isValid: true,
        issues: [],
      };

      const result = buildUTMQueryString(cleanedUTM);

      expect(result).not.toContain('utm_medium');
      expect(result).not.toContain('utm_content');
      expect(result).not.toContain('utm_term');
    });
  });

  describe('generateCampaignNameFromUTM', () => {
    it('should generate campaign name from UTM and event name', () => {
      const cleanedUTM = {
        source: 'google',
        medium: 'cpc',
        campaign: 'spring-promo',
        content: '',
        term: '',
        original: {},
        isValid: true,
        issues: [],
      };

      const result = generateCampaignNameFromUTM(cleanedUTM, 'Tech Summit 2024');

      expect(result).toBe('tech-summit-2024_google_cpc_spring-promo');
    });

    it('should handle empty event name', () => {
      const cleanedUTM = {
        source: 'google',
        medium: 'cpc',
        campaign: '',
        content: '',
        term: '',
        original: {},
        isValid: true,
        issues: [],
      };

      const result = generateCampaignNameFromUTM(cleanedUTM, '');

      expect(result).toBe('google_cpc');
    });

    it('should return unknown-campaign when no data', () => {
      const cleanedUTM = {
        source: '',
        medium: '',
        campaign: '',
        content: '',
        term: '',
        original: {},
        isValid: false,
        issues: [],
      };

      const result = generateCampaignNameFromUTM(cleanedUTM, '');

      expect(result).toBe('unknown-campaign');
    });
  });
});
