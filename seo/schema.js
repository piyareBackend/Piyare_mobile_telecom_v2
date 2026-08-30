// Shared SEO structured-data helpers for Piyare Mobile Telecom.
// Kept dependency-free so product pages can use it without adding bundle weight.
export function productJsonLd(product, url) {
  if (!product || !product.name) return null;
  const offers = product.variants?.length
    ? product.variants.map(v => ({
        '@type': 'Offer',
        name: [v.label, v.color].filter(Boolean).join(' / '),
        priceCurrency: 'INR',
        price: String(v.price ?? product.price ?? 0),
        availability: Number(v.stock ?? product.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url
      }))
    : [{
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: String(product.price ?? 0),
        availability: Number(product.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url
      }];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.seoTitle || product.name,
    description: product.seoDescription || product.description || '',
    image: (product.images || []).filter(Boolean),
    sku: product.sku || product.id || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: product.category || 'Mobile Accessories',
    offers: offers.length === 1 ? offers[0] : offers
  };
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobilePhoneStore',
    name: 'Piyare Mobile Telecom',
    url: 'https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/',
    telephone: '+91-74819-97721',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Basatpur',
      addressRegion: 'Bihar',
      postalCode: '855105',
      addressCountry: 'IN'
    }
  };
}
