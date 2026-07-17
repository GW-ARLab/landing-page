import { getCollection, type CollectionEntry } from 'astro:content';

export type Product = CollectionEntry<'products'>;
export type Research = CollectionEntry<'research'>;

export type ProductStatus = 'available' | 'beta' | 'coming-soon' | 'research' | 'archived';
export type ResearchType = 'research-area' | 'project' | 'publication' | 'technical-article' | 'open-source';

// ── Products ────────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  return getCollection('products');
}

export async function getPublishedProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all
    .filter((p) => p.data.published && p.data.status !== 'archived')
    .sort((a, b) => a.data.order - b.data.order);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const published = await getPublishedProducts();
  return published.filter((p) => p.data.featured);
}

export function productSlug(product: Product): string {
  return product.data.slug ?? product.id.replace(/\.mdx?$/, '');
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getAllProducts();
  return all.find((p) => (p.data.slug ?? p.id) === slug);
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const published = await getPublishedProducts();
  return published.filter((p) => p.data.categories.includes(category));
}

// ── Research ─────────────────────────────────────────────────────────────────

export async function getAllResearch(): Promise<Research[]> {
  return getCollection('research');
}

export async function getPublishedResearch(): Promise<Research[]> {
  const all = await getAllResearch();
  return all
    .filter((r) => r.data.published)
    .sort((a, b) => {
      if (a.data.order !== b.data.order) return a.data.order - b.data.order;
      const dateA = a.data.publishedAt ? new Date(a.data.publishedAt).getTime() : 0;
      const dateB = b.data.publishedAt ? new Date(b.data.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
}

export async function getFeaturedResearch(): Promise<Research[]> {
  const published = await getPublishedResearch();
  return published.filter((r) => r.data.featured);
}

export function researchSlug(item: Research): string {
  return item.data.slug ?? item.id.replace(/\.mdx?$/, '');
}

export async function getResearchBySlug(slug: string): Promise<Research | undefined> {
  const all = await getAllResearch();
  return all.find((r) => (r.data.slug ?? r.id) === slug);
}

export async function getResearchByType(type: ResearchType): Promise<Research[]> {
  const published = await getPublishedResearch();
  return published.filter((r) => r.data.type === type);
}

export async function getResearchByTopic(topic: string): Promise<Research[]> {
  const published = await getPublishedResearch();
  return published.filter((r) => r.data.topics.includes(topic));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function statusLabel(status: ProductStatus): string {
  const labels: Record<ProductStatus, string> = {
    available: 'Available',
    beta: 'Beta',
    'coming-soon': 'Coming Soon',
    research: 'Research',
    archived: 'Archived',
  };
  return labels[status] ?? status;
}

export function researchTypeLabel(type: ResearchType): string {
  const labels: Record<ResearchType, string> = {
    'research-area': 'Research Area',
    project: 'Project',
    publication: 'Publication',
    'technical-article': 'Article',
    'open-source': 'Open Source',
  };
  return labels[type] ?? type;
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
