export interface MaterialSpec {
  calculationType: 'paint' | 'tile' | 'stone' | 'linear' | 'railing';
  coveragePerUnit?: number | null;
  tileWidthFt?: number | null;
  tileHeightFt?: number | null;
  wastagePercent: number;
  unit: string;
}

export interface QuantityInput {
  areaSqFt: number;
  lengthFt?: number;
  material: MaterialSpec;
}

export interface QuantityResult {
  baseQuantity: number;
  wastageQuantity: number;
  finalQuantity: number;
  unit: string;
}

export class QuantityEngine {
  calculate(input: QuantityInput): QuantityResult {
    const { material, areaSqFt, lengthFt = 0 } = input;
    const wastageFactor = 1 + material.wastagePercent / 100;

    let baseQuantity = 0;

    switch (material.calculationType) {
      case 'paint':
        baseQuantity = areaSqFt / (material.coveragePerUnit ?? 80);
        break;
      case 'tile': {
        const tileArea =
          (material.tileWidthFt ?? 1) * (material.tileHeightFt ?? 1);
        baseQuantity = Math.ceil(areaSqFt / tileArea);
        break;
      }
      case 'stone':
        baseQuantity = areaSqFt;
        break;
      case 'linear':
      case 'railing':
        baseQuantity = lengthFt;
        break;
      default:
        baseQuantity = areaSqFt;
    }

    const finalQuantity =
      material.calculationType === 'tile'
        ? Math.ceil(baseQuantity * wastageFactor)
        : baseQuantity * wastageFactor;

    return {
      baseQuantity: round(baseQuantity),
      wastageQuantity: round(finalQuantity - baseQuantity),
      finalQuantity: round(finalQuantity),
      unit: material.unit,
    };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
