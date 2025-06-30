// concernMappings.js
// Centralized utility for handling concern data mapping between different systems

/* ------------------------------------------------------
WHAT IT DOES
- Provides centralized mapping between concerns.json keyForLookup and profile display names
- Handles bidirectional conversion between technical keys and user-facing names
- Ensures consistency across all concern-related components

DATA STRUCTURES
- concerns.json: uses technical keys (acneScore, pigmentationScore) with keyForLookup + displayName
- User profiles: stores display names as keys ("Breakouts": true, "Pigmented spots": true)
- This utility bridges the gap between these two systems

DEV PRINCIPLES
- Single source of truth for all concern mappings
- Bidirectional lookup functions
- Error handling for missing mappings
------------------------------------------------------*/

// Central mapping between technical keys (keyForLookup) and profile storage keys (display names)
const CONCERN_MAPPINGS = {
  // Main skin concerns
  'acneScore': 'Breakouts',
  'pigmentationScore': 'Pigmented spots', 
  'uniformnessScore': 'Uneven skin tone',
  'rednessScore': 'Redness',
  'linesScore': 'Wrinkles',
  'saggingScore': 'Sagging',
  'poresScore': 'Pores',
  
  // Eye area concerns
  'eyeLinesScore': 'Under eye lines',
  'darkCirclesScore': 'Dark circles', 
  'eyeBagsScore': 'Under eye puff',
  
  // Additional concerns (mapped to existing metrics)
  'aging': 'Aging', // Maps to combination of lines + pigmentation logic
  'fineLines': 'Fine Lines', // Maps to linesScore
  'postAcneMarks': 'Post-Acne Marks', // Maps to pigmentationScore
  'translucencyScore': 'Translucency',
  'hydrationScore': 'Hydration'
};

// Reverse mapping for quick lookup
const PROFILE_TO_LOOKUP_MAPPINGS = Object.fromEntries(
  Object.entries(CONCERN_MAPPINGS).map(([key, value]) => [value, key])
);

/**
 * Convert technical concern key (keyForLookup) to profile storage key (display name)
 * @param {string} lookupKey - Technical key from concerns.json (e.g., 'acneScore')
 * @returns {string|null} - Profile display name (e.g., 'Breakouts') or null if not found
 */
export function lookupKeyToProfileKey(lookupKey) {
  const profileKey = CONCERN_MAPPINGS[lookupKey];
  if (!profileKey) {
    console.warn(`⚠️ [concernMappings] No profile key found for lookup key: ${lookupKey}`);
    return null;
  }
  return profileKey;
}

/**
 * Convert profile storage key (display name) to technical concern key (keyForLookup)
 * @param {string} profileKey - Profile display name (e.g., 'Breakouts')
 * @returns {string|null} - Technical key (e.g., 'acneScore') or null if not found
 */
export function profileKeyToLookupKey(profileKey) {
  const lookupKey = PROFILE_TO_LOOKUP_MAPPINGS[profileKey];
  if (!lookupKey) {
    console.warn(`⚠️ [concernMappings] No lookup key found for profile key: ${profileKey}`);
    return null;
  }
  return lookupKey;
}

/**
 * Get all technical keys (keyForLookup values)
 * @returns {string[]} - Array of technical concern keys
 */
export function getAllLookupKeys() {
  return Object.keys(CONCERN_MAPPINGS);
}

/**
 * Get all profile keys (display names)
 * @returns {string[]} - Array of profile display names
 */
export function getAllProfileKeys() {
  return Object.values(CONCERN_MAPPINGS);
}

/**
 * Convert profile concerns object to lookup keys set
 * @param {Object} profileConcerns - User profile concerns object {"Breakouts": true, "Pores": false}
 * @returns {Set<string>} - Set of active lookup keys
 */
export function profileConcernsToLookupKeys(profileConcerns = {}) {
  const activeKeys = new Set();
  
  Object.entries(profileConcerns).forEach(([profileKey, isSelected]) => {
    if (isSelected) {
      const lookupKey = profileKeyToLookupKey(profileKey);
      if (lookupKey) {
        activeKeys.add(lookupKey);
      }
    }
  });
  
  return activeKeys;
}

/**
 * Convert lookup keys set to profile concerns object
 * @param {Set<string>} lookupKeys - Set of active lookup keys
 * @returns {Object} - Profile concerns object {"Breakouts": true, "Pores": false}
 */
export function lookupKeysToProfileConcerns(lookupKeys = new Set()) {
  const profileConcerns = {};
  
  // Set all concerns to false first
  getAllProfileKeys().forEach(profileKey => {
    profileConcerns[profileKey] = false;
  });
  
  // Set selected concerns to true
  lookupKeys.forEach(lookupKey => {
    const profileKey = lookupKeyToProfileKey(lookupKey);
    if (profileKey) {
      profileConcerns[profileKey] = true;
    }
  });
  
  return profileConcerns;
}

/**
 * Validate that a lookup key exists in the mapping
 * @param {string} lookupKey - Technical key to validate
 * @returns {boolean} - True if key exists
 */
export function isValidLookupKey(lookupKey) {
  return lookupKey in CONCERN_MAPPINGS;
}

/**
 * Validate that a profile key exists in the mapping
 * @param {string} profileKey - Profile key to validate
 * @returns {boolean} - True if key exists
 */
export function isValidProfileKey(profileKey) {
  return profileKey in PROFILE_TO_LOOKUP_MAPPINGS;
}

// Export the raw mappings for debugging/inspection
export { CONCERN_MAPPINGS, PROFILE_TO_LOOKUP_MAPPINGS };