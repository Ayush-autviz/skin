// imageUtils.js
// Utility functions for handling different image types (SVG vs regular images)

import React from 'react';
import { Image } from 'react-native';
import SvgUri from 'react-native-svg-uri';

/**
 * Detects if a URL points to an SVG file
 * @param {string} url - The image URL to check
 * @returns {boolean} - True if the URL is for an SVG file
 */
export const isSvgUrl = (url) => {

  if (!url || typeof url !== 'string') return false;
  
  // Check file extension
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes('.svg')) return true;
  
  // Check query parameters for format
  if (lowercaseUrl.includes('format=svg') || lowercaseUrl.includes('type=svg')) return true;
  
  // Check if the URL contains common SVG indicators
  if (lowercaseUrl.includes('svg') && (lowercaseUrl.includes('mask') || lowercaseUrl.includes('overlay'))) return true;
  
  return false;
};

/**
 * Sanitizes S3 URI by removing duplicate protocols
 * @param {string} uri - The S3 URI to sanitize
 * @returns {string} - The sanitized URI
 */
export const sanitizeS3Uri = (uri) => {
  if (!uri) return '';
  return uri.replace(/^https?:\/\/https?:\/\//, 'https://');
};

/**
 * Conditional Image Component that renders SvgUri for SVG files and Image for others
 * @param {Object} props - Component props
 * @param {string} props.source - Image source (can be string URL or {uri: string} object)
 * @param {Object} props.style - Styles to apply
 * @param {string} props.resizeMode - Resize mode for regular images
 * @param {Function} props.onLoad - Callback when image loads
 * @param {Function} props.onError - Callback when image fails to load
 * @param {string} props.width - Width for SVG (defaults to '100%')
 * @param {string} props.height - Height for SVG (defaults to '100%')
 * @returns {JSX.Element} - Either SvgUri or Image component
 */
export const ConditionalImage = ({ 
  source, 
  style, 
  resizeMode = 'cover', 
  onLoad, 
  onError,
  width = '100%',
  height = '100%',
  ...props 
}) => {
  // Extract URL from source
  const url = typeof source === 'string' ? source : source?.uri;
  const sanitizedUrl = sanitizeS3Uri(url);
  console.log('🔵 isSvgUrl:', isSvgUrl(sanitizedUrl));
  if (isSvgUrl(sanitizedUrl)) {
    console.log("in svg", sanitizedUrl);
    console.log("onLoad", onLoad);
    return (
      <SvgUri
        width={width}
        height={height}
        source={{ uri: sanitizedUrl }}
        onLoad={onLoad}
        onError={(error) => {
          console.log('🔴 Error loading SVG image:', error);
        }}
        {...props}
      />
    );
  }
  
  return (
    <Image
      source={{ uri: sanitizedUrl }}
      style={style}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={onError}
      {...props}
    />
  );
};

export default {
  isSvgUrl,
  sanitizeS3Uri,
  ConditionalImage,
}; 