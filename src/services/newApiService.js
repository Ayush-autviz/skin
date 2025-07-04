// newApiService.js
// API service for new authentication system with token management

import axios from 'axios';
import useAuthStore from '../stores/authStore';

const BASE_URL = 'http://44.198.183.94:8000/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    console.log('🔵 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('🔴 Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { refreshToken } = useAuthStore.getState();
        if (refreshToken) {
          console.log('🔄 Attempting token refresh...');
          const newTokens = await refreshAccessToken(refreshToken);
          useAuthStore.getState().setTokens(newTokens.access_token, newTokens.refresh_token);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('🔴 Token refresh failed:', refreshError);
        // Logout user if refresh fails
        useAuthStore.getState().logout();
      }
    }
    
    console.error('🔴 API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Auth API Functions

/**
 * Sign up new user
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password  
 * @param {string} userData.name - User name
 * @returns {Promise<Object>} User data with tokens
 */
export const signUp = async (userData) => {
  try {
    console.log('🔵 Signing up user:', userData.email);
    
    const response = await apiClient.post('/user/', {
      email: userData.email,
      password: userData.password,
      name: userData.name
    });

    if (response.data.status === 201) {
      console.log('✅ User signed up successfully');
      return {
        success: true,
        user: {
          user_id: response.data.data.result.user_id,
          user_name: response.data.data.result.user_name,
          subject_id: response.data.data.result.subject_id,
          email: userData.email
        },
        access_token: response.data.data.result.access_token,
        refresh_token: response.data.data.result.refresh_token
      };
    } else {
      throw new Error(response.data.message || 'Signup failed');
    }
  } catch (error) {
    console.error('🔴 Signup error:', error);
    
    if (error.response?.data?.status === 400) {
      // User already exists
      throw new Error(error.response.data.message || 'User already exists. Please try to login.');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'Signup failed');
  }
};

/**
 * Sign in user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User email (sent as username to API)
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} User data with tokens
 */
export const signIn = async (credentials) => {
  try {
    console.log('🔵 Signing in user:', credentials.email);
    
    // Create form data as API expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('grant_type', '');
    formData.append('username', credentials.email); // API uses username field for email
    formData.append('password', credentials.password);

    const response = await apiClient.post('/user/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    if (response.data.status === 200) {
      console.log('✅ User signed in successfully');
      return {
        success: true,
        user: {
          user_id: response.data.result.user_id,
          user_name: response.data.result.user_name,
          subject_id: response.data.result.subject_id,
          email: credentials.email
        },
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token
      };
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error) {
    console.error('🔴 Login error:', error);
    
    if (error.response?.data?.status === 401) {
      throw new Error(error.response.data.message || 'Incorrect email or password');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'Login failed');
  }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New tokens
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    console.log('🔵 Refreshing access token...');
    
    const response = await axios.post(`${BASE_URL}/user/refresh-token`, {
      refresh_token: refreshToken
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.data.status === 200) {
      console.log('✅ Token refreshed successfully');
      return {
        access_token: response.data.data.access_token,
        refresh_token: response.data.data.refresh_token,
        token_type: response.data.data.token_type
      };
    } else {
      throw new Error(response.data.message || 'Token refresh failed');
    }
  } catch (error) {
    console.error('🔴 Token refresh error:', error);
    
    if (error.response?.data?.status === 401) {
      throw new Error('Invalid refresh token');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'Token refresh failed');
  }
};

// Profile API Functions

/**
 * Create user profile  
 * @param {Object} profileData - Profile data
 * @param {File} profileData.profile_img - Profile image file
 * @param {string} profileData.birth_date - Birth date (YYYY-MM-DD format)
 * @returns {Promise<Object>} Success response
 */
export const createProfile = async (profileData) => {
  try {
    console.log('🔵 Creating user profile...');
    
    const formData = new FormData();
    
    if (profileData.profile_img) {
      formData.append('profile_img', {
        uri: profileData.profile_img.uri,
        type: profileData.profile_img.type || 'image/jpeg',
        name: profileData.profile_img.fileName || 'profile.jpg',
      });
    }
    
    if (profileData.birth_date) {
      formData.append('birth_date', profileData.birth_date);
    }

    const response = await apiClient.post('/profile/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    if (response.data.status === 200) {
      console.log('✅ Profile created successfully');
      return { success: true };
    } else {
      throw new Error(response.data.message || 'Profile creation failed');
    }
  } catch (error) {
    console.error('🔴 Profile creation error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Profile creation failed');
  }
};

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @param {File} [profileData.profile_img] - Profile image file (optional)
 * @param {string} [profileData.birth_date] - Birth date (YYYY-MM-DD format) (optional)
 * @param {string} [profileData.user_name] - User name (optional)
 * @returns {Promise<Object>} Success response
 */
export const updateProfile = async (profileData) => {
  try {
    console.log('🔵 Updating user profile...');
    
    const formData = new FormData();
    
    if (profileData.profile_img) {
      formData.append('profile_img', {
        uri: profileData.profile_img.uri,
        type: profileData.profile_img.type || 'image/jpeg',
        name: profileData.profile_img.fileName || 'profile.jpg',
      });
    }
    
    if (profileData.birth_date) {
      formData.append('birth_date', profileData.birth_date);
    }
    
    if (profileData.user_name) {
      formData.append('user_name', profileData.user_name);
    }

    const response = await apiClient.patch('/profile/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    if (response.data.status === 200) {
      console.log('✅ Profile updated successfully');
      return { success: true };
    } else {
      throw new Error(response.data.message || 'Profile update failed');
    }
  } catch (error) {
    console.error('🔴 Profile update error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Profile update failed');
  }
};

/**
 * Get user profile
 * @returns {Promise<Object>} Profile data
 */
export const getProfile = async () => {
  try {
    console.log('🔵 Fetching user profile...');
    
    const response = await apiClient.get('/profile/');

    if (response.data.status === 200) {
      console.log('✅ Profile fetched successfully');
      return {
        success: true,
        profile: response.data.data.result
      };
    } else {
      throw new Error(response.data.message || 'Failed to fetch profile');
    }
  } catch (error) {
    console.error('🔴 Profile fetch error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch profile');
  }
};

// -----------------------------------------------------------------------------
// Haut.ai IMAGE PROCESSING FUNCTIONS (migrated from apiService.js)
// -----------------------------------------------------------------------------

/**
 * Uploads an image to Haut.ai for processing.
 * @param {string} imageUri - Local URI of the front image.
 * @param {string} [imageType='front_image'] - Field name for the image (front_image, left_image, right_image)
 * @returns {Promise<{hautBatchId: string, imageId: string}>}
 */
export const processHautImage = async (imageUri, imageType = 'front_image') => {
  try {
    console.log('🔵 [Haut.ai] Processing image', { imageType, imageUri });

    const formData = new FormData();
    formData.append(imageType, {
      uri: imageUri,
      type: 'image/jpeg',
      name: `${imageType}.jpg`,
    });

    // Add empty placeholders for the other image fields so backend accepts the request
    if (imageType !== 'left_image') formData.append('left_image', '');
    if (imageType !== 'right_image') formData.append('right_image', '');

    const response = await apiClient.post('/haut_process/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
      },
    });

    if (response.data.status === 200) {
      const { hautBatchId, imageId } = response.data.data.result;
      console.log('✅ [Haut.ai] Image accepted', { hautBatchId, imageId });
      return { hautBatchId, imageId };
    }

    throw new Error(response.data.message || 'Image processing failed');
  } catch (error) {
    console.error('🔴 [Haut.ai] processHautImage error:', error);

    if (error.response?.data?.message === 'User not found') {
      throw new Error('User not found in the system. Please login again.');
    }

    throw new Error(error.response?.data?.message || error.message || 'Image processing failed');
  }
};

/**
 * Retrieves analysis results for a given image ID.
 * @param {string} imageId - Image ID returned by processHautImage
 * @returns {Promise<Array>} Raw results array
 */
export const getHautAnalysisResults = async (imageId) => {
  try {
    console.log('🔵 [Haut.ai] Fetching analysis results', { imageId });
    const response = await apiClient.get(`/haut_process/?image_id=${imageId}`);
    console.log('🔵 response image processing:', response.data);

    if (response.data.status === 200) {
      return response.data.data.result;
    }

    throw new Error(response.data.message || 'Failed to fetch analysis results');
  } catch (error) {
    console.error('🔴 [Haut.ai] getHautAnalysisResults error:', error);

    if (error.response?.data?.message === 'image metric is not found') {
      throw new Error('Analysis not ready yet');
    }

    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch analysis results');
  }
};

/**
 * Retrieves mask metric values for an image.
 * @param {string} imageId - Image ID
 */
export const getHautMaskResults = async (imageId) => {
  try {
    console.log('�� [Haut.ai] Fetching mask results', { imageId });

    const formData = new URLSearchParams();
    formData.append('image_id', imageId);

    const response = await apiClient.post('/haut_mask/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('🔵 response mask results:', response.data);

    if (response.data.status === 201) {
      return response.data.data.result;
    }

    throw new Error(response.data.message || 'Failed to fetch mask results');
  } catch (error) {
    console.error('🔴 [Haut.ai] getHautMaskResults error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch mask results');
  }
};

/**
 * Retrieves public S3 URLs for mask images.
 * @param {string} imageId - Image ID
 */
export const getHautMaskImages = async (imageId) => {
  try {
    const response = await apiClient.get(`/haut_mask/?image_id=${imageId}`);
    console.log('🔵 response mask images:', response.data);
    if (response.data.status === 200) {
      return response.data.data.result;
    }
    throw new Error(response.data.message || 'Failed to fetch mask images');
  } catch (error) {
    console.error('🔴 [Haut.ai] getHautMaskImages error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch mask images');
  }
};

/**
 * Converts Haut.ai raw results array into the metrics object expected by the UI.
 * @param {Array} hautResults - Raw array from API
 */
export const transformHautResults = (hautResults) => {
  try {
    if (!Array.isArray(hautResults) || hautResults.length === 0) {
      throw new Error('Empty Haut.ai results');
    }

    const KEY_MAP = {
      redness_score: 'rednessScore',
      uniformness_score: 'uniformnessScore',
      pores_score: 'poresScore',
      perceived_age: 'perceivedAge',
      eye_age: 'eyeAge',
      skintone_class: 'skinTone',
      face_skin_type_class: 'skinType',
      hydration_score: 'hydrationScore',
      pigmentation_score: 'pigmentationScore',
      translucency_score: 'translucencyScore',
      lines_score: 'linesScore',
      acne_score: 'acneScore',
      image_quality_score: 'imageQualityOverall',
    };

    const metrics = { imageQuality: { overall: 0, focus: 0, lighting: 0 } };

    const flat = hautResults[0]?.results ?? hautResults; // Support both wrapped and flat formats

    flat.forEach((item) => {
      if (!item) return;
      const tech = (item.tech_name || '').toLowerCase();
      const area = (item.area_name || '').toLowerCase();
      const value = item.value;

      if (tech === 'image_quality_score') {
        metrics.imageQuality.overall = value;
        (item.sub_metrics || []).forEach((sub) => {
          const subTech = sub.tech_name?.toLowerCase();
          if (subTech === 'focus_score' || subTech === 'raw_sharpness') {
            metrics.imageQuality.focus = sub.value;
          }
          if (subTech === 'lightness_score' || subTech === 'intensity') {
            metrics.imageQuality.lighting = sub.value;
          }
        });
        return;
      }

      const key = KEY_MAP[tech];
      if (key) {
        if (area === 'face' || metrics[key] === undefined) {
          metrics[key] = value;
        }
      }
    });

    return metrics;
  } catch (error) {
    console.error('🔴 transformHautResults error:', error);
    return {};
  }
};

/**
 * Fetches all photos of the authenticated user.
 * User ID is inferred from access token; no params required.
 */
export const getUserPhotos = async () => {
  try {
    console.log('🔵 Fetching user photos');
    const response = await apiClient.get('/haut_process/');

    if (response.data.status === 200) {
      const apiData = response.data.data;
      if (!apiData || !Array.isArray(apiData.result) || apiData.result.length === 0) {
        console.log('ℹ️ No photos found for user');
        return [];
      }

      return apiData.result.map((photo) => ({
        id: photo.image_id,
        storageUrl: photo.front_image,
        timestamp: new Date(photo.created_at),
        analyzed: true,
        analyzing: false,
        metrics: {},
        hautUploadData: { imageId: photo.image_id },
        apiData: { ...photo },
      }));
    }

    throw new Error(response.data.message || 'Failed to fetch photos');
  } catch (error) {
    console.error('🔴 getUserPhotos error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch photos');
  }
};
// -----------------------------------------------------------------------------
// END Haut.ai helpers
// -----------------------------------------------------------------------------

export default apiClient; 