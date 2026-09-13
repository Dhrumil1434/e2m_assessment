import { QuantityEngine } from './quantity.engine';

describe('QuantityEngine', () => {
  const engine = new QuantityEngine();

  it('calculates paint quantity with wastage', () => {
    const result = engine.calculate({
      areaSqFt: 800,
      material: {
        calculationType: 'paint',
        coveragePerUnit: 80,
        wastagePercent: 10,
        unit: 'litre',
      },
    });

    expect(result.baseQuantity).toBe(10);
    expect(result.finalQuantity).toBe(11);
  });

  it('calculates stone cladding area', () => {
    const result = engine.calculate({
      areaSqFt: 300,
      material: {
        calculationType: 'stone',
        wastagePercent: 12,
        unit: 'sqft',
      },
    });

    expect(result.finalQuantity).toBe(336);
  });
});
