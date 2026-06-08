import { describe, it, expect } from 'vitest';
import {
  getLisa2Rate,
  getLisa3Rate,
  calcKorrigeeritudPindala,
  stumpToD13,
  d13ToStump,
  calcG,
  getGn,
  calcStandFactor,
} from './calculations';

// ─── Lisa 2 ───────────────────────────────────────────────────────────────────

describe('getLisa2Rate', () => {
  it('returns correct rate for each group at exact table values', () => {
    // Row: [2, 0.38, 0.76, 0.25, 0.12]
    expect(getLisa2Rate(2, 1)).toBe(0.38);
    expect(getLisa2Rate(2, 2)).toBe(0.76);
    expect(getLisa2Rate(2, 3)).toBe(0.25);
    expect(getLisa2Rate(2, 4)).toBe(0.12);
  });

  it('uses upper bound — diameter exactly at boundary goes to that row', () => {
    // Row [6, 0.95, ...] — d=6 should use this row, not next
    expect(getLisa2Rate(6, 1)).toBe(0.95);
    // d=6.1 should use next row [10, 1.66, ...]
    expect(getLisa2Rate(6.1, 1)).toBe(1.66);
  });

  it('returns last table row rate for d=102', () => {
    expect(getLisa2Rate(102, 1)).toBe(373.3);
    expect(getLisa2Rate(102, 2)).toBe(872.3);
  });

  it('applies step formula correctly for d > 102', () => {
    // d=106: 1 step of 4cm beyond 102
    expect(getLisa2Rate(106, 1)).toBeCloseTo(373.3 + 28.75, 2);
    expect(getLisa2Rate(106, 2)).toBeCloseTo(872.3 + 31.95, 2);
    // d=110: 2 steps
    expect(getLisa2Rate(110, 1)).toBeCloseTo(373.3 + 2 * 28.75, 2);
  });

  it('handles very small diameter', () => {
    expect(getLisa2Rate(0.5, 1)).toBe(0.38); // below 2cm — first row
  });
});

// ─── Lisa 3 ───────────────────────────────────────────────────────────────────

describe('getLisa3Rate', () => {
  describe('mänd', () => {
    it('returns 0 for age ≤ 20', () => {
      expect(getLisa3Rate('mand', 1)).toBe(0);
      expect(getLisa3Rate('mand', 20)).toBe(0);
    });
    it('returns 1300 for ages 21–40', () => {
      expect(getLisa3Rate('mand', 21)).toBe(1300);
      expect(getLisa3Rate('mand', 30)).toBe(1300);
      expect(getLisa3Rate('mand', 40)).toBe(1300);
    });
    it('returns 640 for ages 41–50', () => {
      expect(getLisa3Rate('mand', 41)).toBe(640);
      expect(getLisa3Rate('mand', 50)).toBe(640);
    });
    it('returns 100 for ages 91–100', () => {
      expect(getLisa3Rate('mand', 91)).toBe(100);
      expect(getLisa3Rate('mand', 100)).toBe(100);
    });
    it('returns 0 for age > 100 (seadus: 101+ = —)', () => {
      expect(getLisa3Rate('mand', 101)).toBe(0);
      expect(getLisa3Rate('mand', 150)).toBe(0);
    });
  });

  describe('kuusk/kask/sanglepp — sama grupp', () => {
    it('all three species return same rates', () => {
      const ages = [21, 40, 50, 80, 90];
      ages.forEach(age => {
        expect(getLisa3Rate('kuusk', age)).toBe(getLisa3Rate('kask', age));
        expect(getLisa3Rate('kask', age)).toBe(getLisa3Rate('sanglepp', age));
      });
    });
    it('returns 0 for age 91–100 (erinevalt mändist)', () => {
      expect(getLisa3Rate('kuusk', 91)).toBe(0);
      expect(getLisa3Rate('kask', 100)).toBe(0);
    });
  });

  describe('tamm/saar/vaher/jalakas', () => {
    it('returns 1800 for ages 21–40', () => {
      expect(getLisa3Rate('tamm', 21)).toBe(1800);
      expect(getLisa3Rate('saar', 40)).toBe(1800);
    });
    it('returns 500 for ages 81–100', () => {
      expect(getLisa3Rate('tamm', 81)).toBe(500);
      expect(getLisa3Rate('jalakas', 100)).toBe(500);
    });
    it('returns 0 for age > 100 — CRITICAL seaduse fix', () => {
      // This was the bug: was returning 500, now must be 0
      expect(getLisa3Rate('tamm', 101)).toBe(0);
      expect(getLisa3Rate('saar', 150)).toBe(0);
      expect(getLisa3Rate('vaher', 999)).toBe(0);
      expect(getLisa3Rate('jalakas', 200)).toBe(0);
    });
  });

  describe('haab', () => {
    it('returns 990 for ages 21–30', () => {
      expect(getLisa3Rate('haab', 21)).toBe(990);
      expect(getLisa3Rate('haab', 30)).toBe(990);
    });
    it('returns 0 for age ≥ 81', () => {
      expect(getLisa3Rate('haab', 81)).toBe(0);
      expect(getLisa3Rate('haab', 90)).toBe(0);
    });
  });

  it('falls back to mand rates for unknown species', () => {
    expect(getLisa3Rate('tundmatu_liik', 30)).toBe(getLisa3Rate('mand', 30));
  });
});

// ─── Pindala korrigeerimine ────────────────────────────────────────────────────

describe('calcKorrigeeritudPindala', () => {
  it('subtracts perimeter error from measured area', () => {
    // error = (2.5 × 400) / 10000 = 0.1 ha
    expect(calcKorrigeeritudPindala(400, 1.5)).toBeCloseTo(1.4, 4);
  });

  it('never returns negative — clamps to 0', () => {
    // narrow strip: large perimeter relative to area
    expect(calcKorrigeeritudPindala(10000, 0.1)).toBe(0);
    expect(calcKorrigeeritudPindala(99999, 0.01)).toBe(0);
  });

  it('returns measuredArea unchanged when perimeter is 0', () => {
    expect(calcKorrigeeritudPindala(0, 2.5)).toBe(2.5);
  });

  it('returns measuredArea unchanged when measuredArea is 0', () => {
    expect(calcKorrigeeritudPindala(500, 0)).toBe(0);
  });
});

// ─── Känd konverter ────────────────────────────────────────────────────────────

describe('stumpToD13 / d13ToStump', () => {
  it('stumpToD13 is inverse of d13ToStump for mänd', () => {
    const original = 25;
    const d13 = stumpToD13('mand', original);
    const back = d13ToStump('mand', d13);
    expect(back).toBeCloseTo(original, 1);
  });

  it('stumpToD13 for kuusk at 30cm stump', () => {
    // a=0.19, b=0.76 → 0.19 + 0.76*30 = 22.99
    expect(stumpToD13('kuusk', 30)).toBeCloseTo(22.99, 1);
  });

  it('returns 0 for unknown species', () => {
    expect(stumpToD13('tundmatu', 20)).toBe(0);
    expect(d13ToStump('tundmatu', 20)).toBe(0);
  });

  it('handles zero diameter', () => {
    expect(stumpToD13('mand', 0)).toBeCloseTo(-1.21, 2); // a + b*0
  });
});

// ─── G arvutus ─────────────────────────────────────────────────────────────────

describe('calcG', () => {
  it('calculates basal area correctly using Math.PI', () => {
    // Single tree, d=20cm, r=0.1m → π×0.1² = 0.03142
    expect(calcG(20, 1)).toBeCloseTo(Math.PI * 0.01, 5);
  });

  it('scales linearly with count', () => {
    const single = calcG(30, 1);
    expect(calcG(30, 5)).toBeCloseTo(single * 5, 5);
  });

  it('divides by area when area > 1', () => {
    const noArea = calcG(20, 10, 1);
    expect(calcG(20, 10, 2)).toBeCloseTo(noArea / 2, 5);
  });

  it('returns 0 for zero diameter', () => {
    expect(calcG(0, 10)).toBe(0);
  });

  it('returns 0 for zero count', () => {
    expect(calcG(20, 0)).toBe(0);
  });
});

// ─── Gn standardtabel ──────────────────────────────────────────────────────────

describe('getGn', () => {
  it('returns exact table value at H=10 for mänd (idx 0)', () => {
    expect(getGn('mand', 10)).toBe(26.5);
  });

  it('returns exact table value at H=20 for kuusk (idx 1)', () => {
    expect(getGn('kuusk', 20)).toBe(33.0);
  });

  it('interpolates linearly between H=10 and H=11 for mänd', () => {
    const at10 = getGn('mand', 10); // 26.5
    const at11 = getGn('mand', 11); // 27.8
    const mid = getGn('mand', 10.5);
    expect(mid).toBeCloseTo((at10 + at11) / 2, 2);
  });

  it('clamps to minimum table height (H=6)', () => {
    expect(getGn('mand', 1)).toBe(getGn('mand', 6));
    expect(getGn('mand', 0)).toBe(getGn('mand', 6));
  });

  it('clamps to maximum table height (H=35)', () => {
    expect(getGn('mand', 100)).toBe(getGn('mand', 35));
  });

  it('returns 0 for unknown species', () => {
    expect(getGn('tundmatu', 15)).toBe(0);
  });
});

// ─── Puistu tagavara vormiarv ──────────────────────────────────────────────────

describe('calcStandFactor', () => {
  it('returns 0 for height < 6', () => {
    expect(calcStandFactor('mand', 5)).toBe(0);
    expect(calcStandFactor('mand', 0)).toBe(0);
  });

  it('returns a positive value for valid inputs', () => {
    expect(calcStandFactor('mand', 20)).toBeGreaterThan(0);
    expect(calcStandFactor('kuusk', 15)).toBeGreaterThan(0);
  });

  it('returns 0 for unknown species', () => {
    expect(calcStandFactor('tundmatu', 20)).toBe(0);
  });
});
