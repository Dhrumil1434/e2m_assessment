import { CostEngine } from './cost.engine';

describe('CostEngine', () => {
  const engine = new CostEngine();

  it('summarizes material and labor totals with contingency range', () => {
    const line = engine.calculateLine({
      materialName: 'Exterior Paint',
      regionLabel: 'Main Wall',
      calculationType: 'paint',
      finalQuantity: 11,
      areaSqFt: 800,
      lengthFt: 0,
      unit: 'litre',
      materialRate: 500,
      laborRate: 15,
      laborUnit: 'sqft',
    });

    const summary = engine.summarize([line]);

    expect(summary.materialTotal).toBe(5500);
    expect(summary.laborTotal).toBe(12000);
    expect(summary.contingency).toBe(875);
    expect(summary.grandTotal).toBe(18375);
    expect(summary.rangeLow).toBe(16905);
    expect(summary.rangeHigh).toBe(19845);
  });
});
