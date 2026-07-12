const { ARTICLES, ANNEXES, getPolicyMeta, POLICY_VERSION } = require('../../../src/templates/warranty/warrantyPolicyContent');

describe('warrantyPolicyContent', () => {
  test('policy version is 1.0 with 11 articles', () => {
    expect(POLICY_VERSION).toBe('1.0');
    expect(ARTICLES).toHaveLength(11);
    expect(ARTICLES[0].number).toBe(1);
    expect(ARTICLES[10].number).toBe(11);
  });

  test('each article has title and paragraphs', () => {
    ARTICLES.forEach((article) => {
      expect(article.title).toBeTruthy();
      expect(Array.isArray(article.paragraphs)).toBe(true);
      expect(article.paragraphs.length).toBeGreaterThan(0);
    });
  });

  test('annexes include benefit table and clinical fields', () => {
    expect(ANNEXES.length).toBeGreaterThanOrEqual(3);
    const annexA = ANNEXES.find((a) => a.id === 'A');
    const annexB = ANNEXES.find((a) => a.id === 'B');
    expect(annexA.rows).toBeDefined();
    expect(annexB.fields).toBeDefined();
    expect(annexB.fields.length).toBeGreaterThan(0);
  });

  test('getPolicyMeta returns summary', () => {
    const meta = getPolicyMeta();
    expect(meta.version).toBe('1.0');
    expect(meta.articleCount).toBe(11);
    expect(meta.annexCount).toBe(ANNEXES.length);
    expect(meta.title).toMatch(/THỎA THUẬN/i);
  });
});
