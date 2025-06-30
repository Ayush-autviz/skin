// Centralized photo utilities

/* ------------------------------------------------------
WHAT IT DOES
- Provides consistent photo ID handling
- Validates photo data structure
- Normalizes legacy data to current schema

DEV PRINCIPLES
- Single source of truth for photo-related utilities
- Consistent ID handling across app
- Proper type checking and validation

------------------------------------------------------*/

export const cleanPhotoId = (photoId) => {
  if (!photoId) return '';
  return photoId.replace('.jpg', '');
};

export const validatePhotoId = (photoId) => {
  if (!photoId) return false;
  const cleaned = cleanPhotoId(photoId);
  // Expects a timestamp-based ID
  return /^\d+$/.test(cleaned);
};

export const normalizePhotoData = (rawData) => {
  if (!rawData) return null;

  // Normalize to current data structure (status.state based)
  return {
    storageUrl: rawData.storageUrl,
    timestamp: rawData.timestamp,
    updatedAt: rawData.updatedAt,
    status: rawData.status || {
      state: 'no_metrics',
      lastUpdated: rawData.updatedAt
    },
    metrics: rawData.metrics || null,
    analysis: rawData.analysis || {}
  };
};

export const sanitizeSvgString = (svgString, addRegistrationMarks = false) => {
  if (typeof svgString !== 'string' || !svgString) {
    return svgString; // Return as is if not a string or empty
  }

  // console.log('\n\n============================================');
  // console.log("🎨 sanitizeSvgString - BEFORE (first 500 chars):", svgString.substring(0, 500));

  // 1. Remove style attribute from root <svg> tag (this will be covered by the global style removal below)
  // let sanitized = svgString.replace(
  //   /(<svg[^>]*?)\s+style=(?:"[^"]*"|'[^']*')([^>]*>)/i,
  //   '$1$2'
  // );
  let sanitized = svgString;

  // NEW: 1. Remove the entire <defs>...</defs> block
  sanitized = sanitized.replace(/<defs>.*?<\/defs>/gis, '');

  // NEW: 2. Remove ALL style attributes from ANY tag
  sanitized = sanitized.replace(/\s+style=(?:"[^"]*"|'[^']*')/gi, '');

  // 3. Remove "px" from stroke-width attributes (previously step 2)
  sanitized = sanitized.replace(/stroke-width="(\d*\.?\d+)px"/gi, 'stroke-width="$1"');

  // 4. Remove width, height, and preserveAspectRatio attributes from the root <svg> tag
  // This makes the SVG rely on viewBox for proportions and SvgXml styling for size.
  sanitized = sanitized.replace(/(<svg[^>]*?)\s+width=(?:"[^"]*"|'[^']*')/i, '$1');
  sanitized = sanitized.replace(/(<svg[^>]*?)\s+height=(?:"[^"]*"|'[^']*')/i, '$1');
  sanitized = sanitized.replace(/(<svg[^>]*?)\s+preserveAspectRatio=(?:"[^"]*"|'[^']*')/i, '$1');


  // console.log("🎨 sanitizeSvgString - AFTER (first 1500 chars):", sanitized.substring(0, 1500));
  // console.log('============================================\n\n');
  return sanitized;
}; 