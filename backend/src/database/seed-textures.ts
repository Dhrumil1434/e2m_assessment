import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import sharp from 'sharp';
import * as schema from './schema';
import { materialVariants } from './schema';

const TEXTURE_VARIANTS: {
  name: string;
  colorHex: string;
  pattern: 'paint' | 'stone' | 'tile' | 'glass';
}[] = [
  { name: 'Ivory White', colorHex: '#F5F5DC', pattern: 'paint' },
  { name: 'Sand Beige', colorHex: '#D2B48C', pattern: 'paint' },
  { name: 'Beige Stone', colorHex: '#C2B280', pattern: 'stone' },
  { name: 'Grey Slate', colorHex: '#708090', pattern: 'stone' },
  { name: 'Terracotta Tile', colorHex: '#E2725B', pattern: 'tile' },
  { name: 'Charcoal Tile', colorHex: '#36454F', pattern: 'tile' },
  { name: 'Clear Glass', colorHex: '#E0F7FA', pattern: 'glass' },
];

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

async function createTextureBuffer(
  colorHex: string,
  pattern: 'paint' | 'stone' | 'tile' | 'glass',
) {
  const size = 256;
  const { r, g, b } = hexToRgb(colorHex);
  const base = sharp({
    create: {
      width: size,
      height: size,
      channels: 3 as const,
      background: { r, g, b },
    },
  });

  if (pattern === 'paint') {
    const noise = Buffer.alloc(size * size)
    for (let i = 0; i < noise.length; i++) {
      noise[i] = Math.floor(Math.random() * 24)
    }
    return base
      .composite([
        {
          input: await sharp(noise, { raw: { width: size, height: size, channels: 1 } })
            .png()
            .toBuffer(),
          blend: 'overlay',
        },
      ])
      .png()
      .toBuffer()
  }

  if (pattern === 'stone') {
    const blocks = sharp({
      create: {
        width: size,
        height: size,
        channels: 3 as const,
        background: { r: Math.max(0, r - 20), g: Math.max(0, g - 20), b: Math.max(0, b - 20) },
      },
    })
    const overlays = []
    for (let y = 0; y < size; y += 32) {
      for (let x = 0; x < size; x += 32) {
        const shade = ((x / 32 + y / 32) % 2) * 18
        overlays.push({
          input: {
            create: {
              width: 32,
              height: 32,
              channels: 3 as const,
              background: {
                r: Math.min(255, r + shade),
                g: Math.min(255, g + shade),
                b: Math.min(255, b + shade),
              },
            },
          },
          left: x,
          top: y,
        })
      }
    }
    return blocks.composite(overlays).png().toBuffer()
  }

  if (pattern === 'tile') {
    const tile = sharp({
      create: {
        width: size,
        height: size,
        channels: 3 as const,
        background: { r, g, b },
      },
    })
    const grout = []
    for (let i = 0; i <= size; i += 64) {
      grout.push({
        input: {
          create: {
            width: size,
            height: 2,
            channels: 3 as const,
            background: { r: 40, g: 40, b: 40 },
          },
        },
        left: 0,
        top: i,
      })
      grout.push({
        input: {
          create: {
            width: 2,
            height: size,
            channels: 3 as const,
            background: { r: 40, g: 40, b: 40 },
          },
        },
        left: i,
        top: 0,
      })
    }
    return tile.composite(grout).png().toBuffer()
  }

  return base
    .modulate({ brightness: 1.05 })
    .png()
    .toBuffer()
}

async function seedTextures() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://e2m:e2m@localhost:5432/e2m',
  })
  const db = drizzle(pool, { schema });

  const client = new S3Client({
    region: 'us-east-1',
    endpoint: `http://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? '9000'}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    },
  })

  const bucket = process.env.MINIO_BUCKET_TEXTURES ?? 'textures'

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
  }

  for (const texture of TEXTURE_VARIANTS) {
    const variant = await db.query.materialVariants.findFirst({
      where: eq(materialVariants.name, texture.name),
    })

    if (!variant) {
      console.warn(`Variant not found: ${texture.name}`)
      continue
    }

    const buffer = await createTextureBuffer(texture.colorHex, texture.pattern)
    const storageKey = `catalog/${variant.id}.png`

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: 'image/png',
      }),
    )

    await db
      .update(materialVariants)
      .set({ textureStorageKey: storageKey })
      .where(eq(materialVariants.id, variant.id))

    console.log(`Uploaded texture for ${texture.name}`)
  }

  await pool.end()
  console.log('Texture seed completed')
}

seedTextures().catch((error) => {
  console.error(error)
  process.exit(1)
})
