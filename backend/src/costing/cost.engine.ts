import { CostLineItem } from '../database/schema/estimations';

export interface CostInput {
  materialName: string;
  regionLabel: string;
  calculationType: 'paint' | 'tile' | 'stone' | 'linear' | 'railing';
  finalQuantity: number;
  areaSqFt: number;
  lengthFt: number;
  unit: string;
  materialRate: number;
  laborRate: number;
  laborUnit: string;
}

export interface CostResult {
  lineItems: CostLineItem[];
  materialTotal: number;
  laborTotal: number;
  contingency: number;
  grandTotal: number;
  rangeLow: number;
  rangeHigh: number;
}

export class CostEngine {
  calculateLine(input: CostInput): CostLineItem {
    const materialCost =
      input.calculationType === 'paint'
        ? input.finalQuantity * input.materialRate
        : input.calculationType === 'railing' || input.calculationType === 'linear'
          ? input.finalQuantity * input.materialRate
          : input.areaSqFt * input.materialRate;

    const laborCost =
      input.laborUnit === 'ft'
        ? input.lengthFt * input.laborRate
        : input.areaSqFt * input.laborRate;

    return {
      materialName: input.materialName,
      regionLabel: input.regionLabel,
      quantity: input.finalQuantity,
      unit: input.unit,
      materialCost: round(materialCost),
      laborCost: round(laborCost),
      total: round(materialCost + laborCost),
    };
  }

  summarize(lineItems: CostLineItem[]): CostResult {
    const materialTotal = round(
      lineItems.reduce((sum, item) => sum + item.materialCost, 0),
    );
    const laborTotal = round(
      lineItems.reduce((sum, item) => sum + item.laborCost, 0),
    );
    const subtotal = materialTotal + laborTotal;
    const contingency = round(subtotal * 0.05);
    const grandTotal = round(subtotal + contingency);

    return {
      lineItems,
      materialTotal,
      laborTotal,
      contingency,
      grandTotal,
      rangeLow: round(grandTotal * 0.92),
      rangeHigh: round(grandTotal * 1.08),
    };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
