import { defineCollection, z } from 'astro:content';

// ── Shared sub-schemas ──────────────────────────────────────────────────────

const SeoSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const CtaSchema = z.object({
  type: z.string(),
  label: z.string(),
  url: z.string(),
});

const ProductFeatureSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});

const ScreenshotSchema = z.object({
  src: z.string(),
  alt: z.string(),
});

const DownloadSchema = z.object({
  enabled: z.boolean().default(false),
  latestVersion: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  releaseNotesUrl: z.string().nullable().optional(),
  windows: z.object({
    url: z.string(),
    size: z.string().optional(),
    checksum: z.string().nullable().optional(),
  }).nullable().optional(),
  macos: z.object({
    url: z.string(),
    size: z.string().optional(),
    checksum: z.string().nullable().optional(),
  }).nullable().optional(),
});

// ── Products Collection ─────────────────────────────────────────────────────

const productsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    slug: z.string().optional(),
    status: z.enum(['available', 'beta', 'coming-soon', 'research', 'archived']),
    featured: z.boolean().default(false),
    published: z.boolean().default(false),
    order: z.number().default(99),

    categories: z.array(z.string()).default([]),
    shortDescription: z.string(),
    description: z.string().optional(),

    thumbnail: z.string().optional(),
    heroImage: z.string().optional(),
    ogImage: z.string().optional(),

    platforms: z.array(z.string()).default([]),
    features: z.array(ProductFeatureSchema).default([]),
    useCases: z.array(z.string()).default([]),

    media: z.object({
      videoUrl: z.string().nullable().optional(),
      screenshots: z.array(ScreenshotSchema).default([]),
    }).optional(),

    primaryCta: CtaSchema.optional(),
    secondaryCta: CtaSchema.optional(),

    download: DownloadSchema.optional(),

    relatedResearch: z.array(z.string()).default([]),

    seo: SeoSchema,
  }),
});

// ── Research Collection ─────────────────────────────────────────────────────

const PublicationSchema = z.object({
  venue: z.string().optional(),
  year: z.number().optional(),
  doi: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  citation: z.string().optional(),
});

const OpenSourceSchema = z.object({
  repositoryUrl: z.string().optional(),
  license: z.string().optional(),
  documentationUrl: z.string().optional(),
});

const researchCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    type: z.enum(['research-area', 'project', 'publication', 'technical-article', 'open-source']),
    status: z.enum(['active', 'completed', 'paused', 'archived']).default('active'),
    published: z.boolean().default(false),
    featured: z.boolean().default(false),
    order: z.number().default(99),

    topics: z.array(z.string()).default([]),
    summary: z.string(),

    coverImage: z.string().optional(),
    ogImage: z.string().optional(),

    authors: z.array(z.string()).default([]),
    publishedAt: z.string().optional(),
    updatedAt: z.string().optional(),

    repositoryUrl: z.string().nullable().optional(),
    publicationUrl: z.string().nullable().optional(),
    citationUrl: z.string().nullable().optional(),
    demoUrl: z.string().nullable().optional(),

    publication: PublicationSchema.optional(),
    openSource: OpenSourceSchema.optional(),

    relatedProducts: z.array(z.string()).default([]),

    seo: SeoSchema,
  }),
});

export const collections = {
  products: productsCollection,
  research: researchCollection,
};
