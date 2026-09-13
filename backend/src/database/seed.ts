import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { materialVariants, materials } from './schema';

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://e2m:e2m@localhost:5432/e2m',
  });
  const db = drizzle(pool);

  const materialRows = [
    {
      name: 'Exterior Paint',
      category: 'paint',
      calculationType: 'paint' as const,
      coveragePerUnit: 80,
      wastagePercent: 10,
      materialRate: 500,
      laborRate: 15,
      laborUnit: 'sqft',
      unit: 'litre',
    },
    {
      name: 'Stone Cladding',
      category: 'stone',
      calculationType: 'stone' as const,
      wastagePercent: 12,
      materialRate: 250,
      laborRate: 80,
      laborUnit: 'sqft',
      unit: 'sqft',
    },
    {
      name: 'Exterior Tiles',
      category: 'tile',
      calculationType: 'tile' as const,
      tileWidthFt: 2,
      tileHeightFt: 4,
      wastagePercent: 10,
      materialRate: 180,
      laborRate: 45,
      laborUnit: 'sqft',
      unit: 'tile',
    },
    {
      name: 'Glass Railing',
      category: 'railing',
      calculationType: 'railing' as const,
      wastagePercent: 5,
      materialRate: 1200,
      laborRate: 300,
      laborUnit: 'ft',
      unit: 'ft',
    },
  ];

  for (const material of materialRows) {
    const [inserted] = await db.insert(materials).values(material).returning();

    const variants =
      material.category === 'paint'
        ? [
            { name: 'Ivory White', colorHex: '#F5F5DC' },
            { name: 'Sand Beige', colorHex: '#D2B48C' },
          ]
        : material.category === 'stone'
          ? [
              { name: 'Beige Stone', colorHex: '#C2B280' },
              { name: 'Grey Slate', colorHex: '#708090' },
            ]
          : material.category === 'tile'
            ? [
                { name: 'Terracotta Tile', colorHex: '#E2725B' },
                { name: 'Charcoal Tile', colorHex: '#36454F' },
              ]
            : [{ name: 'Clear Glass', colorHex: '#E0F7FA' }];

    await db.insert(materialVariants).values(
      variants.map((variant) => ({
        materialId: inserted.id,
        name: variant.name,
        colorHex: variant.colorHex,
      })),
    );
  }

  await pool.end();
  console.log('Seed completed');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
