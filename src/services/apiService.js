// apiService.js
// Service for external API calls using axios

import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: 'http://44.198.183.94:8000/api/v1',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'accept': 'application/json'
  }
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log('🔵 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('🔴 API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('🔴 API Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });
    return Promise.reject(error);
  }
);

/**
 * Creates a user subject in the external API system
 * @param {string} userId - Firebase user ID
 * @param {string} userName - User's display name or email
 * @returns {Promise<{subjectId: string}>} The created subject ID
 */
export const createUserSubject = async (userId, userName) => {
  try {
    console.log('🔵 Creating user subject:', { userId, userName });
    
    const response = await apiClient.post('/user/', {
      user_id: userId,
      user_name: userName
    });

    if (response.data.status === 200) {
      const subjectId = response.data.data.result.subject_id;
      console.log('✅ User subject created successfully:', subjectId);
      return { subjectId };
    } else {
      throw new Error(`API returned status ${response.data.status}: ${response.data.message}`);
    }
  } catch (error) {
    console.error('🔴 Error creating user subject:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      throw new Error(`Server error: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to reach the server');
    } else {
      // Other error
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Updates user profile with subject ID
 * @param {string} userId - Firebase user ID
 * @param {string} subjectId - Subject ID from external API
 */
export const updateUserWithSubjectId = async (userId, subjectId) => {
  try {
    console.log('🔵 Updating user with subject ID:', { userId, subjectId });
    
    // Import here to avoid circular dependencies
    const { updateProfile } = await import('./FirebaseUserService');
    
    await updateProfile(userId, {
      subjectId: subjectId
    });
    
    console.log('✅ User profile updated with subject ID');
  } catch (error) {
    console.error('🔴 Error updating user with subject ID:', error);
    throw error;
  }
};

/**
 * Processes image through Haut.ai API
 * @param {string} userId - Firebase user ID
 * @param {string} imageUri - Local image URI
 * @param {string} imageType - Type of image (front_image, left_image, right_image)
 * @returns {Promise<{hautBatchId: string, imageId: string}>} The batch and image IDs
 */
export const processHautImage = async (userId, imageUri, imageType = 'front_image') => {
  try {
    console.log('🔵 Processing image through Haut.ai:', { userId, imageType });
    
    // Create form data
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append(imageType, {
      uri: imageUri,
      type: 'image/jpeg',
      name: `${imageType}.jpg`
    });
    
    // Add empty fields for other image types if not provided
    if (imageType !== 'left_image') formData.append('left_image', '');
    if (imageType !== 'right_image') formData.append('right_image', '');
    
    const response = await apiClient.post('/haut_process/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'accept': 'application/json'
      }
    });

    if (response.data.status === 200) {
      const { hautBatchId, imageId } = response.data.data.result;
      console.log('✅ Image processed successfully:', { hautBatchId, imageId });
      return { hautBatchId, imageId };
    } else {
      throw new Error(`API returned status ${response.data.status}: ${response.data.message}`);
    }
  } catch (error) {
    console.error('🔴 Error processing image:', error);
    
    if (error.response?.data?.message === 'User not found') {
      throw new Error('User not found in the system. Please try registering again.');
    }
    
    // Handle different types of errors
    if (error.response) {
      throw new Error(`Server error: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to reach the server');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Gets analysis results from Haut.ai API
 * @param {string} imageId - Image ID from processHautImage
 * @returns {Promise<Object>} The analysis results
 */
export const getHautAnalysisResults = async (imageId) => {
  try {
    console.log('🔵 Getting analysis results:', { imageId });
    
    const response = await apiClient.get(`/haut_process/?image_id=${imageId}`);

    if (response.data.status === 200) {
      const results = response.data.data.result;
      console.log('✅ Analysis results retrieved successfully');
      return results;
    } else {
      throw new Error(`API returned status ${response.data.status}: ${response.data.message}`);
    }
  } catch (error) {
    console.error('🔴 Error getting analysis results:', error);
    
    if (error.response?.data?.message === 'image metric is not found') {
      throw new Error('Analysis results not ready yet. Please wait a moment and try again.');
    }
    
    // Handle different types of errors
    if (error.response) {
      throw new Error(`Server error: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to reach the server');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Gets mask results from Haut.ai API
 * @param {string} imageId - Image ID from processHautImage
 * @returns {Promise<Object>} The mask results
 */
export const getHautMaskResults = async (imageId) => {
  try {
    console.log('🔵 Getting mask results:', { imageId });
    
    const response = await apiClient.post('/haut_mask/', `image_id=${imageId}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
      }
    });

    if (response.data.status === 200) {
      const results = response.data.data?.result || response.data;
      console.log('✅ Mask results retrieved successfully');
      return results;
    } else {
      throw new Error(`API returned status ${response.data.status}: ${response.data.message}`);
    }
  } catch (error) {
    console.error('🔴 Error getting mask results:', error);
    
    if (error.response?.data?.message === 'mask data is not found') {
      throw new Error('Mask results not ready yet. Please wait a moment and try again.');
    }
    
    // Handle different types of errors
    if (error.response) {
      throw new Error(`Server error: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to reach the server');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Gets mask images from Haut.ai API for each skin condition
 * @param {string} imageId - Image ID from processHautImage
 * @returns {Promise<Array>} Array of mask image objects with URLs and condition data
 */
export const getHautMaskImages = async (imageId) => {
  try {
    console.log('🔵 Getting mask images:', { imageId });
    
    const response = await apiClient.get(`/haut_mask/get-mask?image_id=${imageId}`);

    if (response.data.status === 200) {
      const maskImages = response.data.data?.result || [];
      console.log('✅ Mask images retrieved successfully:', maskImages.length, 'images');
      
      // Transform the mask images data for easier consumption
      const transformedMaskImages = maskImages.reduce((acc, maskItem) => {
        acc[maskItem.skin_condition_name] = {
          id: maskItem.id,
          maskImageUrl: maskItem.mask_img_url,
          conditionName: maskItem.skin_condition_name,
          conditionScore: maskItem.skin_condition_score,
          createdAt: maskItem.created_at,
          updatedAt: maskItem.updated_at
        };
        return acc;
      }, {});

      console.log('🔵 Mask images:', transformedMaskImages);
      
      console.log('✅ Mask images transformed:', Object.keys(transformedMaskImages));
      return transformedMaskImages;
    } else {
      throw new Error(`API returned status ${response.data.status}: ${response.data.message}`);
    }
  } catch (error) {
    console.error('🔴 Error getting mask images:', error);
    
    if (error.response?.data?.message === 'mask images not found') {
      throw new Error('Mask images not ready yet. Please wait a moment and try again.');
    }
    
    // Handle different types of errors
    if (error.response) {
      throw new Error(`Server error: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to reach the server');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Transforms Haut.ai analysis results to match current app structure
 * @param {Object} hautResults - Raw results from Haut.ai API
 * @returns {Object} Transformed metrics object
 */
export const transformHautResults = (hautResults) => {
  try {
    console.log('🔵 Transforming Haut.ai results');
    
    if (!hautResults || !hautResults.length || !hautResults[0]?.results) {
      throw new Error('Invalid Haut.ai results structure');
    }
    
    // Initialize metrics object with default values
    const metrics = {
      imageQuality: { overall: 0, focus: 0, lighting: 0 }
    };
    
    // Get all algorithm results from the first result item
    const allResults = hautResults[0].results || [];
    
    // Process each algorithm result
    allResults.forEach(algorithmResult => {
      const algorithmName = algorithmResult.result?.algorithm_tech_name;
      const areaResults = algorithmResult.result?.area_results || [];
      
      console.log(`🔵 Processing algorithm: ${algorithmName}`);
      
      switch (algorithmName) {
        case 'redness':
          // Extract face-level redness score (primary metric)
          const faceRedness = areaResults.find(area => area.area_name === 'face');
          if (faceRedness?.main_metric?.value) {
            metrics.rednessScore = faceRedness.main_metric.value;
          }
          break;
          
        case 'uniformness':
          const faceUniformness = areaResults.find(area => area.area_name === 'face');
          if (faceUniformness?.main_metric?.value) {
            metrics.uniformnessScore = faceUniformness.main_metric.value;
          }
          break;
          
        case 'pores':
          const facePores = areaResults.find(area => area.area_name === 'face');
          if (facePores?.main_metric?.value) {
            metrics.poresScore = facePores.main_metric.value;
          }
          break;
          
        case 'age':
          // Extract perceived age
          const faceAge = areaResults.find(area => area.area_name === 'face');
          if (faceAge?.main_metric?.tech_name === 'perceived_age') {
            metrics.perceivedAge = faceAge.main_metric.value;
          }
          break;
          
        case 'eyes_age':
          // Extract eye age if available
          const eyeAge = areaResults.find(area => area.area_name === 'eyes' || area.area_name === 'face');
          if (eyeAge?.main_metric?.value) {
            metrics.eyeAge = eyeAge.main_metric.value;
          }
          break;
          
        case 'quality':
          // Extract quality metrics
          const qualityArea = areaResults.find(area => area.area_name === 'face' || area.area_name === 'image');
          if (qualityArea?.main_metric?.value) {
            metrics.imageQuality.overall = qualityArea.main_metric.value;
          }
          // Extract sub-metrics for quality
          if (qualityArea?.sub_metrics) {
            qualityArea.sub_metrics.forEach(subMetric => {
              switch (subMetric.tech_name) {
                case 'focus':
                case 'sharpness':
                  metrics.imageQuality.focus = subMetric.value;
                  break;
                case 'lighting':
                case 'brightness':
                  metrics.imageQuality.lighting = subMetric.value;
                  break;
              }
            });
          }
          break;
          
        case 'skintone_classification':
          // Extract skin tone classification
          const skinToneArea = areaResults.find(area => area.area_name === 'face');
          if (skinToneArea?.main_metric?.value) {
            metrics.skinTone = skinToneArea.main_metric.value;
          }
          break;
          
        case 'skin_type':
          // Extract skin type classification
          const skinTypeArea = areaResults.find(area => area.area_name === 'face');
          if (skinTypeArea?.main_metric?.value) {
            metrics.skinType = skinTypeArea.main_metric.value;
          }
          break;
          
        case 'hydration':
          // Extract hydration score
          const faceHydration = areaResults.find(area => area.area_name === 'face');
          if (faceHydration?.main_metric?.value) {
            metrics.hydrationScore = faceHydration.main_metric.value;
          }
          break;
          
        case 'pigmentation':
          // Extract pigmentation score
          const facePigmentation = areaResults.find(area => area.area_name === 'face');
          if (facePigmentation?.main_metric?.value) {
            metrics.pigmentationScore = facePigmentation.main_metric.value;
          }
          break;
          
        case 'translucency':
          // Extract translucency score
          const faceTranslucency = areaResults.find(area => area.area_name === 'face');
          if (faceTranslucency?.main_metric?.value) {
            metrics.translucencyScore = faceTranslucency.main_metric.value;
          }
          break;
          
        case 'lines':
        case 'wrinkles':
          // Extract lines/wrinkles score
          const faceLines = areaResults.find(area => area.area_name === 'face');
          if (faceLines?.main_metric?.value) {
            metrics.linesScore = faceLines.main_metric.value;
          }
          break;
          
        case 'acne':
          // Extract acne score
          const faceAcne = areaResults.find(area => area.area_name === 'face');
          if (faceAcne?.main_metric?.value) {
            metrics.acneScore = faceAcne.main_metric.value;
          }
          break;
          
        case 'front_face_areas':
          // This algorithm typically contains mask data rather than metric scores
          // but we can log it for debugging
          console.log('🔵 Front face areas algorithm processed (mask data)');
          break;
          
        case 'facial_landmarks':
          // This algorithm contains landmark coordinates, not needed for metrics display
          console.log('🔵 Facial landmarks algorithm processed (coordinate data)');
          break;
          
        // Add more algorithm mappings as needed
        default:
          console.log(`🟡 Unhandled algorithm: ${algorithmName}`);
          break;
      }
    });
    
    // Ensure we have at least some meaningful data
    const hasAnyScoreMetrics = Object.keys(metrics).some(key => 
      key.endsWith('Score') && typeof metrics[key] === 'number'
    );
    
    const hasAnyAgeMetrics = metrics.perceivedAge || metrics.eyeAge;
    const hasQualityData = metrics.imageQuality?.overall > 0;
    
    // If we don't have any meaningful metrics, add some defaults to prevent empty state
    if (!hasAnyScoreMetrics && !hasAnyAgeMetrics && !hasQualityData) {
      console.log('⚠️ No meaningful metrics extracted, adding defaults');
      metrics.imageQuality.overall = 75; // Default quality score
    }
    
    console.log('✅ Haut.ai results transformed successfully:', {
      totalAlgorithms: allResults.length,
      extractedMetrics: Object.keys(metrics).filter(key => 
        key !== 'imageQuality' && (typeof metrics[key] === 'number' || typeof metrics[key] === 'string')
      ).length,
      hasScoreMetrics: hasAnyScoreMetrics,
      hasAgeMetrics: hasAnyAgeMetrics,
      hasQualityData: hasQualityData,
      sampleMetrics: Object.fromEntries(
        Object.entries(metrics).filter(([key, value]) => 
          key !== 'imageQuality' && value !== undefined && value !== null
        ).slice(0, 5)
      )
    });
    
    return metrics;
  } catch (error) {
    console.error('🔴 Error transforming Haut.ai results:', error);
    throw error;
  }
};

/**
 * Gets all photos for a user from the new API endpoint
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Array>} Array of photo objects
 */
export const getUserPhotos = async (userId) => {
  try {
    console.log('🔵 Getting user photos from API:', { userId });
    
    const response = await apiClient.get(`/haut_process/?user_id=${userId}`);

    if (response.data.status === 200) {
      const photos = response.data.data.result;
      console.log('✅ User photos retrieved successfully:', photos.length);
      
      // Transform the API response to match the expected format
      const transformedPhotos = photos.map(photo => ({
        id: photo.image_id, // Use image_id as the photo ID
        storageUrl: photo.front_image, // Use front_image as the storage URL
        timestamp: new Date(photo.created_at), // Convert created_at to Date object
        analyzed: true, // Assume all photos from API are analyzed
        analyzing: false,
        metrics: {}, // Add empty metrics object for compatibility
        hautUploadData: {
          imageId: photo.image_id
        },
        // Add original API data for reference
        apiData: {
          id: photo.id,
          image_id: photo.image_id,
          front_image: photo.front_image,
          left_image: photo.left_image,
          right_image: photo.right_image,
          created_at: photo.created_at,
          updated_at: photo.updated_at
        }
      }));
      
      return transformedPhotos;
    } else {
      throw new Error(`API returned status ${response.data.status}: ${response.data.message}`);
    }
  } catch (error) {
    console.error('🔴 Error getting user photos:', error);
    
    // Handle different types of errors
    if (error.response) {
      throw new Error(`Server error: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to reach the server');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Test function to verify API connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export const testApiConnection = async () => {
  try {
    console.log('🔵 Testing API connection...');
    
    // Simple GET request to test connectivity
    const response = await apiClient.get('/');
    
    console.log('✅ API connection test successful');
    return true;
  } catch (error) {
    console.error('🔴 API connection test failed:', error);
    return false;
  }
};

// Export the axios instance for other uses
export { apiClient };

// Export all functions as a service object
export const apiService = {
  createUserSubject,
  updateUserWithSubjectId,
  processHautImage,
  getHautAnalysisResults,
  getHautMaskResults,
  getHautMaskImages,
  transformHautResults,
  getUserPhotos,
  testApiConnection,
  apiClient
}; 