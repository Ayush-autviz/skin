// newApiService.js
// API service for new authentication system with token management

import axios from "axios";
import useAuthStore from "../stores/authStore";

const BASE_URL = "http://44.198.183.94:9000/api/v1";

// Create axios instance with enhanced configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 45000, // Increased from 30000 to 45000ms (45 seconds)
  // Add retry configuration
  retry: 1,
  retryDelay: 1000,
  // Better error handling - only 2xx status codes are successful
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Only 2xx status codes are successful
  },
});

// Export apiClient for use in other services
export { apiClient };

// Request deduplication to prevent multiple simultaneous requests
const pendingRequests = new Map();

// Function to clear all pending requests (useful for cleanup)
export const clearPendingRequests = () => {
  console.log("🧹 Clearing all pending requests");
  pendingRequests.clear();
};

// Function to clear specific pending request
export const clearPendingRequest = (requestKey) => {
  if (pendingRequests.has(requestKey)) {
    console.log("🧹 Clearing pending request:", requestKey);
    pendingRequests.delete(requestKey);
  }
};

// Function to force clear all stuck requests (useful for debugging)
export const forceClearAllRequests = () => {
  console.log("🧹 Force clearing all pending requests");
  pendingRequests.clear();
};

// Function to get pending requests count (useful for debugging)
export const getPendingRequestsCount = () => {
  return pendingRequests.size;
};

const createRequestKey = (method, url, data) => {
  // Add safety checks for undefined parameters
  const safeMethod = method || 'GET';
  const safeUrl = url || '';
  const safeData = data || {};
  
  return `${safeMethod.toUpperCase()}:${safeUrl}:${JSON.stringify(safeData)}`;
};

// Enhanced request interceptor with deduplication
apiClient.interceptors.request.use(
  (config) => {
    // Safety check - ensure config exists
    if (!config) {
      console.error("🔴 Request interceptor: config is undefined");
      return Promise.reject(new Error('Invalid request configuration'));
    }
    
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Create unique key for this request
    const requestKey = createRequestKey(config.method, config.url, config.data);
    
    // Check if there's already a pending request for this operation
    if (pendingRequests.has(requestKey)) {
      const pending = pendingRequests.get(requestKey);
      const timeSinceRequest = Date.now() - pending.timestamp;
      
      // If the request is very recent (less than 100ms), reject as duplicate
      if (timeSinceRequest < 100) {
        console.log("🔄 Request deduplication: rejecting very recent duplicate request for", requestKey);
        return Promise.reject(new Error('DUPLICATE_REQUEST'));
      }
      
      // If the request is older, allow it (might be a legitimate retry)
      console.log("🔄 Request deduplication: allowing older request for", requestKey, "after", timeSinceRequest, "ms");
      // Remove the old pending request and continue with this one
      pendingRequests.delete(requestKey);
    }
    
    // Store this request as pending with timestamp
    pendingRequests.set(requestKey, {
      timestamp: Date.now(),
      config: config
    });
    
    // Add cleanup function to remove from pending requests
    config.metadata = { requestKey };
    
    // Set a timeout to clean up stale pending requests (5 seconds)
    setTimeout(() => {
      if (pendingRequests.has(requestKey)) {
        const pending = pendingRequests.get(requestKey);
        if (Date.now() - pending.timestamp > 5000) {
          console.log("🧹 Cleaning up stale pending request:", requestKey);
          pendingRequests.delete(requestKey);
        }
      }
    }, 5000);
    
    // Also set a shorter timeout for the request itself (30 seconds)
    setTimeout(() => {
      if (pendingRequests.has(requestKey)) {
        console.log("⏰ Request timeout cleanup:", requestKey);
        pendingRequests.delete(requestKey);
      }
    }, 30000);
    
    console.log("🔵 API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("🔴 Request Error:", error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    // Safety check - ensure response and config exist
    if (!response || !response.config) {
      console.error("🔴 Response interceptor: response or config is undefined");
      return response;
    }
    
    // Clean up pending request
    if (response.config.metadata?.requestKey) {
      pendingRequests.delete(response.config.metadata.requestKey);
    }
    
    console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.log("🔴 Response interceptor error triggered:", {
      message: error?.message,
      status: error?.response?.status,
      url: error?.config?.url,
      method: error?.config?.method,
      hasConfig: !!error?.config,
      hasResponse: !!error?.response,
      hasRequest: !!error?.request
    });
    
    // Clean up pending request on error (with safety check)
    if (error?.config?.metadata?.requestKey) {
      pendingRequests.delete(error.config.metadata.requestKey);
    }
    
    // Handle duplicate request errors - instead of rejecting, wait for the existing request
    if (error.message === 'DUPLICATE_REQUEST') {
      console.log("🔄 Duplicate request detected - waiting for existing request to complete");
      
      // Only proceed if we have config data
      if (error?.config) {
        // Try to get the existing request result
        const requestKey = createRequestKey(error.config.method, error.config.url, error.config.data);
        const pending = pendingRequests.get(requestKey);
        
        if (pending) {
          // Wait a bit for the existing request to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // If it's still pending, wait a bit more and then reject
          if (pendingRequests.has(requestKey)) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // If still pending after additional wait, reject
            if (pendingRequests.has(requestKey)) {
              console.log("⏰ Request still pending after wait, rejecting with REQUEST_IN_PROGRESS");
              return Promise.reject(new Error('REQUEST_IN_PROGRESS'));
            }
          }
          
          // If we get here, the request completed, so we should retry the original request
          console.log("✅ Original request completed, retrying...");
          return apiClient(error.config);
        }
      }
      
      // If no pending request found, reject with a generic error
      return Promise.reject(new Error('REQUEST_IN_PROGRESS'));
    }

    const originalRequest = error?.config;

    // Enhanced error logging with null checks
    if (error?.code === 'ECONNABORTED') {
      console.error("🔴 Request timeout:", error?.config?.url || 'unknown URL', "after", error?.config?.timeout || 'unknown timeout', "ms");
    } else if (error?.message === 'Network Error') {
      console.error("🔴 Network error:", error?.config?.url || 'unknown URL', "- check internet connection");
    } else if (error?.code === 'ECONNRESET') {
      console.error("🔴 Connection reset:", error?.config?.url || 'unknown URL');
    } else if (error?.code === 'ENOTFOUND') {
      console.error("🔴 Server not found:", error?.config?.url || 'unknown URL');
    } else if (error?.response) {
      console.error("🔴 Server error:", error.response.status, error.response.statusText, error?.config?.url || 'unknown URL');
    } else if (error?.request) {
      console.error("🔴 No response received:", error?.config?.url || 'unknown URL', "- server might be down");
    }

    // Handle token refresh for 401 errors (only if we have config)
    console.log("🔍 Checking 401 error handling conditions:", {
      hasError: !!error,
      hasResponse: !!error?.response,
      status: error?.response?.status,
      hasOriginalRequest: !!originalRequest,
      hasRetry: !!originalRequest?._retry,
      errorKeys: error ? Object.keys(error) : 'no error object',
      responseKeys: error?.response ? Object.keys(error.response) : 'no response object'
    });
    
    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry) {
      console.log("🔄 401 Unauthorized detected - starting token refresh process...");
      console.log("🔍 Original request details:", {
        url: originalRequest.url,
        method: originalRequest.method,
        hasHeaders: !!originalRequest.headers,
        hasRetry: !!originalRequest._retry
      });
      
      originalRequest._retry = true;

      try {
        const authState = useAuthStore.getState();
        console.log("🔍 Auth store state:", {
          hasUser: !!authState.user,
          hasAccessToken: !!authState.accessToken,
          hasRefreshToken: !!authState.refreshToken,
          storeKeys: authState ? Object.keys(authState) : 'no store state'
        });
        
        const { refreshToken } = authState;
        console.log("🔍 Refresh token available:", !!refreshToken);
        
        if (refreshToken) {
          console.log("🔄 Attempting token refresh...");
          const newTokens = await refreshAccessToken(refreshToken);
          console.log("✅ Token refresh successful, updating store...");
          
          useAuthStore
            .getState()
            .setTokens(newTokens.access_token, newTokens.refresh_token);

          // Retry original request with new token
          console.log("🔄 Retrying original request with new token...");
          
          // Ensure headers exist
          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          console.log("🔍 Retry request headers:", originalRequest.headers);
          
          const retryResponse = await apiClient(originalRequest);
          console.log("✅ Retry successful:", retryResponse.status);
          return retryResponse;
        } else {
          console.log("🔴 No refresh token available, logging out user");
          useAuthStore.getState().logout();
        }
      } catch (refreshError) {
        console.error("🔴 Token refresh failed:", refreshError);
        console.log("🔍 Refresh error details:", {
          message: refreshError.message,
          response: refreshError.response?.status,
          data: refreshError.response?.data
        });
        
        // Logout user if refresh fails
        useAuthStore.getState().logout();
      }
    } else if (error?.response?.status === 401) {
      console.log("🔴 401 error but not handling refresh:", {
        hasOriginalRequest: !!originalRequest,
        hasRetry: !!originalRequest?._retry,
        status: error.response.status
      });
    }

    // Enhanced error logging with more context and null checks
    console.error(
      "🔴 API Error Details:",
      {
        url: error?.config?.url || 'unknown',
        method: error?.config?.method?.toUpperCase() || 'unknown',
        status: error?.response?.status || 'unknown',
        statusText: error?.response?.statusText || 'unknown',
        message: error?.message || 'unknown',
        code: error?.code || 'unknown',
        responseData: error?.response?.data || 'none',
        hasConfig: !!error?.config,
        hasResponse: !!error?.response,
        hasRequest: !!error?.request
      }
    );
    
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
 * @returns {Promise<Object>} User data without tokens (OTP will be sent)
 */
export const signUp = async (userData) => {
  try {
    console.log("🔵 Signing up user:", userData.email);

    const response = await apiClient.post("/user/", {
      email: userData.email,
      password: userData.password,
      name: userData.name,
    });

    if (response.data.status === 201) {
      console.log("✅ User signed up successfully, OTP sent to email");
      return {
        success: true,
        message: response.data.message,
        user: {
          user_id: response.data.data.result.user_id,
          user_name: response.data.data.result.user_name,
          subject_id: response.data.data.result.subject_id,
          email: userData.email,
          profile_status: response.data.data.result.profile_status,
        },
      };
    } else {
      throw new Error(response.data.message || "Signup failed");
    }
  } catch (error) {
    console.error("🔴 Signup error:", error);

    if (error.response?.data?.status === 400) {
      // User already exists
      throw new Error(
        error.response.data.message ||
          "User already exists. Please try to login."
      );
    }

    throw new Error(
      error.response?.data?.message || error.message || "Signup failed"
    );
  }
};

/**
 * Verify OTP for signup or forgot password
 * @param {Object} otpData - OTP verification data
 * @param {boolean} otpData.signup - true for signup, false for forgot password
 * @param {string} otpData.email - User email
 * @param {string} otpData.otp - OTP code
 * @returns {Promise<Object>} Verification result
 */
export const verifyOtp = async (otpData) => {
  try {
    console.log("🔵 Verifying OTP for:", otpData.email);

    const response = await apiClient.post("/user/verify-otp", {
      signup: otpData.signup,
      email: otpData.email,
      otp: otpData.otp,
    });

    if (response.data.status === 200) {
      console.log("✅ OTP verified successfully");
      return {
        success: true,
        message: response.data.message,
        reset_token: response.data.data.reset_token, // Only present for forgot password flow
      };
    } else {
      throw new Error(response.data.message || "OTP verification failed");
    }
  } catch (error) {
    console.error("🔴 OTP verification error:", error);

    if (error.response?.data?.status === 400) {
      throw new Error(error.response.data.message || "Invalid OTP.");
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "OTP verification failed"
    );
  }
};

/**
 * Send forgot password OTP
 * @param {string} email - User email
 * @returns {Promise<Object>} Success response
 */
export const forgotPassword = async (email) => {
  try {
    console.log("🔵 Sending forgot password OTP to:", email);

    const response = await apiClient.post("/user/forgot-password", {
      email: email,
    });

    if (response.data.status === 200) {
      console.log("✅ Forgot password OTP sent successfully");
      return {
        success: true,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Failed to send reset OTP");
    }
  } catch (error) {
    console.error("🔴 Forgot password error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to send reset OTP"
    );
  }
};

/**
 * Set new password using reset token
 * @param {Object} passwordData - New password data
 * @param {string} passwordData.email - User email
 * @param {string} passwordData.password - New password
 * @param {string} passwordData.reset_token - Reset token from OTP verification
 * @returns {Promise<Object>} Success response
 */
export const newPassword = async (passwordData) => {
  try {
    console.log("🔵 Setting new password for:", passwordData.email);

    const response = await apiClient.post("/user/new-password", {
      email: passwordData.email,
      password: passwordData.password,
      reset_token: passwordData.reset_token,
    });

    if (response.data.status === 200) {
      console.log("✅ Password changed successfully");
      return {
        success: true,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Failed to change password");
    }
  } catch (error) {
    console.error("🔴 New password error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to change password"
    );
  }
};

/**
 * Resend OTP during signup
 * @param {string} email - User email
 * @returns {Promise<Object>} Success response
 */
export const resendOtp = async (email) => {
  try {
    console.log("🔵 Resending signup OTP to:", email);

    const response = await apiClient.post("/user/resend-otp", {
      email: email,
    });

    if (response.data.status === 200) {
      console.log("✅ Signup OTP resent successfully");
      return {
        success: true,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Failed to resend OTP");
    }
  } catch (error) {
    console.error("🔴 Resend OTP error:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Failed to resend OTP"
    );
  }
};

/**
 * Resend OTP during forgot password
 * @param {string} email - User email
 * @returns {Promise<Object>} Success response
 */
export const resendOtpForgotPassword = async (email) => {
  try {
    console.log("🔵 Resending forgot password OTP to:", email);

    const response = await apiClient.post("/user/resend-otp-forgot-password", {
      email: email,
    });

    if (response.data.status === 200) {
      console.log("✅ Forgot password OTP resent successfully");
      return {
        success: true,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Failed to resend OTP");
    }
  } catch (error) {
    console.error("🔴 Resend forgot password OTP error:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Failed to resend OTP"
    );
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
    console.log("🔵 Signing in user:", credentials.email);

    // Create form data as API expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("grant_type", "");
    formData.append("username", credentials.email); // API uses username field for email
    formData.append("password", credentials.password);

    const response = await apiClient.post("/user/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.data.status === 200) {
      console.log("✅ User signed in successfully");
      return {
        success: true,
        user: {
          user_id: response.data.result.user_id,
          user_name: response.data.result.user_name,
          subject_id: response.data.result.subject_id,
          email: credentials.email,
        },
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        profile_status: response.data.profile_status,
      };
    } else {
      throw new Error(response.data.message || "Login failed");
    }
  } catch (error) {
    console.error("🔴 Login error:", error);

    if (error.response?.data?.status === 401) {
      throw new Error(
        error.response.data.message || "Incorrect email or password"
      );
    }

    throw new Error(
      error.response?.data?.message || error.message || "Login failed"
    );
  }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New tokens
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    console.log("🔵 Refreshing access token...");

    const response = await axios.post(
      `${BASE_URL}/user/refresh-token`,
      {
        refresh_token: refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.status === 200) {
      console.log("✅ Token refreshed successfully");
      return {
        access_token: response.data.data.access_token,
        refresh_token: response.data.data.refresh_token,
        token_type: response.data.data.token_type,
      };
    } else {
      throw new Error(response.data.message || "Token refresh failed");
    }
  } catch (error) {
    console.error("🔴 Token refresh error:", error);

    if (error.response?.data?.status === 401) {
      throw new Error("Invalid refresh token");
    }

    throw new Error(
      error.response?.data?.message || error.message || "Token refresh failed"
    );
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
    console.log("🔵 Creating user profile...");

    const formData = new FormData();

    if (profileData.profile_img) {
      formData.append("profile_img", {
        uri: profileData.profile_img.uri,
        type: profileData.profile_img.type || "image/jpeg",
        name: profileData.profile_img.fileName || "profile.jpg",
      });
    }

    if (profileData.birth_date) {
      formData.append("birth_date", profileData.birth_date);
    }

    const response = await apiClient.post("/profile/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.status === 200) {
      console.log("✅ Profile created successfully");
      return { success: true };
    } else {
      throw new Error(response.data.message || "Profile creation failed");
    }
  } catch (error) {
    console.error("🔴 Profile creation error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Profile creation failed"
    );
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
    console.log("🔵 Updating user profile...");

    const formData = new FormData();

    if (profileData.profile_img) {
      formData.append("profile_img", {
        uri: profileData.profile_img.uri,
        type: profileData.profile_img.type || "image/jpeg",
        name: profileData.profile_img.fileName || "profile.jpg",
      });
    }

    if (profileData.birth_date) {
      formData.append("birth_date", profileData.birth_date);
    }

    if (profileData.user_name) {
      formData.append("user_name", profileData.user_name);
    }

    const response = await apiClient.patch("/profile/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.status === 200) {
      console.log("✅ Profile updated successfully");
      return { success: true };
    } else {
      throw new Error(response.data.message || "Profile update failed");
    }
  } catch (error) {
    console.error("🔴 Profile update error:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Profile update failed"
    );
  }
};

/**
 * Get user profile
 * @returns {Promise<Object>} Profile data
 */
export const getProfile = async () => {
  try {
    console.log("🔵 Fetching user profile...");

    const response = await apiClient.get("/profile/");

    if (response.data.status === 200) {
      console.log("✅ Profile fetched successfully");
      return {
        success: true,
        profile: response.data.data.result,
      };
    } else {
      throw new Error(response.data.message || "Failed to fetch profile");
    }
  } catch (error) {
    console.error("🔴 Profile fetch error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch profile"
    );
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
export const processHautImage = async (imageUri, imageType = "front_image") => {
  try {
    console.log("🔵 [Haut.ai] Processing image", { imageType, imageUri });

    const formData = new FormData();
    formData.append(imageType, {
      uri: imageUri,
      type: "image/jpeg",
      name: `${imageType}.jpg`,
    });

    // Add empty placeholders for the other image fields so backend accepts the request
    if (imageType !== "left_image") formData.append("left_image", "");
    if (imageType !== "right_image") formData.append("right_image", "");

    const response = await apiClient.post("/haut_process/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        accept: "application/json",
      },
    });

    if (response.data.status === 200) {
      const { hautBatchId, imageId } = response.data.data.result;
      console.log("✅ [Haut.ai] Image accepted", { hautBatchId, imageId });
      return { hautBatchId, imageId };
    }

    throw new Error(response.data.message || "Image processing failed");
  } catch (error) {
    console.error("🔴 [Haut.ai] processHautImage error:", error);

    if (error.response?.data?.message === "User not found") {
      throw new Error("User not found in the system. Please login again.");
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Image processing failed"
    );
  }
};

/**
 * Retrieves analysis results for a given image ID.
 * @param {string} imageId - Image ID returned by processHautImage
 * @returns {Promise<Array>} Raw results array
 */
export const getHautAnalysisResults = async (imageId) => {
  try {
    console.log("🔵 [Haut.ai] Fetching analysis results", { imageId });
    const response = await apiClient.get(`/haut_process/?image_id=${imageId}`);
    console.log("🔵 response image processing:", response.data);

    if (response.data.status === 200) {
      return response.data.data.result;
    }

    throw new Error(
      response.data.message || "Failed to fetch analysis results"
    );
  } catch (error) {
    console.error("🔴 [Haut.ai] getHautAnalysisResults error:", error);

    if (error.response?.data?.message === "image metric is not found") {
      throw new Error("Analysis not ready yet");
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch analysis results"
    );
  }
};

/**
 * Retrieves mask metric values for an image.
 * @param {string} imageId - Image ID
 */
export const getHautMaskResults = async (imageId) => {
  try {
    console.log("�� [Haut.ai] Fetching mask results", { imageId });

    const formData = new URLSearchParams();
    formData.append("image_id", imageId);

    const response = await apiClient.post("/haut_mask/", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    console.log("🔵 response mask results:", response.data);

    if (response.data.status === 201 || response.data.status === 200) {
      return response.data.data.result.mask_result;
    }

    throw new Error(response.data.message || "Failed to fetch mask results");
  } catch (error) {
    console.error("🔴 [Haut.ai] getHautMaskResults error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch mask results"
    );
  }
};

/**
 * Retrieves public S3 URLs for mask images.
 * @param {string} imageId - Image ID
 */
export const getHautMaskImages = async (imageId) => {
  try {
    const response = await apiClient.get(`/haut_mask/?image_id=${imageId}`);
    console.log("🔵 response mask images:", response.data);
    if (response.data.status === 200) {
      return response.data.data.result;
    }
    throw new Error(response.data.message || "Failed to fetch mask images");
  } catch (error) {
    console.error("🔴 [Haut.ai] getHautMaskImages error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch mask images"
    );
  }
};

/**
 * Converts Haut.ai raw results array into the metrics object expected by the UI.
 * @param {Array} hautResults - Raw array from API
 */
export const transformHautResults = (hautResults) => {
  try {
    if (!Array.isArray(hautResults) || hautResults.length === 0) {
      throw new Error("Empty Haut.ai results");
    }

    const KEY_MAP = {
      redness_score: "rednessScore",
      uniformness_score: "uniformnessScore",
      pores_score: "poresScore",
      perceived_age: "perceivedAge",
      eye_age: "eyeAge",
      eye_area_condition: "eyeAreaCondition",
      skintone_class: "skinTone",
      face_skin_type_class: "skinType",
      hydration_score: "hydrationScore",
      pigmentation_score: "pigmentationScore",
      translucency_score: "translucencyScore",
      lines_score: "linesScore",
      acne_score: "acneScore",
      image_quality_score: "imageQualityOverall",
    };

    const metrics = { imageQuality: { overall: 0, focus: 0, lighting: 0 } };

    console.log("hautResults", hautResults);

    const flat = hautResults[0]?.results ?? hautResults; // Support both wrapped and flat formats

    console.log("flat", flat);

    flat.forEach((item) => {
      if (!item) return;
      const tech = (item.tech_name || "").toLowerCase();
      const area = (item.area_name || "").toLowerCase();
      const value = item.value;

      if (tech === "image_quality_score") {
        metrics.imageQuality.overall = value;
        (item.sub_metrics || []).forEach((sub) => {
          const subTech = sub.tech_name?.toLowerCase();
          if (subTech === "focus_score" || subTech === "raw_sharpness") {
            metrics.imageQuality.focus = sub.value;
          }
          if (subTech === "lightness_score" || subTech === "intensity") {
            metrics.imageQuality.lighting = sub.value;
          }
        });
        return;
      }

      const key = KEY_MAP[tech];
      if (key) {
        if (area === "face" || metrics[key] === undefined) {
          metrics[key] = value;
        }
      }
    });

    return metrics;
  } catch (error) {
    console.error("🔴 transformHautResults error:", error);
    return {};
  }
};

/**
 * Fetches all photos of the authenticated user.
 * User ID is inferred from access token; no params required.
 */
export const getUserPhotos = async (page = 1, limit = 10, retryCount = 0) => {
  const MAX_RETRIES = 3;
  
  try {
    // Check if user is authenticated before making API call
    const authStore = require('../stores/authStore').default;
    const { user, isAuthenticated } = authStore.getState();
    
    if (!isAuthenticated || !user?.user_id) {
      console.log("🔴 getUserPhotos: User not authenticated, skipping API call");
      throw new Error('User not authenticated');
    }
    
    console.log("🔵 Fetching user photos - page:", page, "limit:", limit, "retry:", retryCount, "user:", user.user_id);
    const response = await apiClient.get(`/haut_process/?page=${page}&limit=${limit}`);

    if (response.data.status === 200) {
      const apiData = response.data.data;
      if (
        !apiData ||
        !Array.isArray(apiData.result) ||
        apiData.result.length === 0
      ) {
        console.log("ℹ️ No photos found for user");
        return {
          photos: [],
          pagination: {
            total: 0,
            page: page,
            limit: limit,
            pages: 0,
            has_next: false,
            has_prev: false
          }
        };
      }

      const photos = apiData.result.map((photo) => ({
        id: photo.image_id,
        storageUrl: photo.front_image,
        timestamp: new Date(photo.created_at),
        analyzed: true,
        analyzing: false,
        metrics: {},
        hautUploadData: { imageId: photo.image_id },
        apiData: { ...photo },
      }));

      return {
        photos,
        pagination: apiData.pagination || {
          total: photos.length,
          page: page,
          limit: limit,
          pages: 1,
          has_next: false,
          has_prev: false
        }
      };
    }

    throw new Error(response.data.message || "Failed to fetch photos");
  } catch (error) {
    console.error("🔴 getUserPhotos error:", error);
    
    // Handle specific error types with retry limit
    if ((error.message === 'DUPLICATE_REQUEST' || error.message === 'REQUEST_IN_PROGRESS') && retryCount < MAX_RETRIES) {
      console.log(`🔄 getUserPhotos: Request in progress, retrying after delay... (${retryCount + 1}/${MAX_RETRIES})`);
      
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear any stuck pending requests
      clearPendingRequests();
      
      // Retry the request with incremented retry count
      return getUserPhotos(page, limit, retryCount + 1);
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please check your connection');
    }
    
    if (error.message === 'Network Error') {
      throw new Error('Network error - please check your internet connection');
    }
    
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch photos"
    );
  }
};

/**
 * Deletes a photo by image ID
 * @param {string} imageId - Image ID to delete
 * @returns {Promise<Object>} Success response
 */
export const deletePhoto = async (imageId) => {
  try {
    console.log("🔵 Deleting photo with ID:", imageId);

    const response = await apiClient.delete(
      `/haut_process/?image_id=${imageId}`
    );

    if (response.data.status === 200) {
      console.log("✅ Photo deleted successfully");
      return {
        success: true,
        message: response.data.message || "Photo deleted successfully",
      };
    } else {
      throw new Error(response.data.message || "Failed to delete photo");
    }
  } catch (error) {
    console.error("🔴 deletePhoto error:", error);
    throw new Error(
      error.response?.data?.message || error.message || "Failed to delete photo"
    );
  }
};
// -----------------------------------------------------------------------------
// END Haut.ai helpers
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// COMPARISON/PROGRESS API FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Fetches comparison data for the progress screen
 * @param {string} dateFilter - Date filter (default: 'older_than_6_months')
 * @returns {Promise<Object>} Comparison data with processed photo metrics
 */
export const getComparison = async (dateFilter = "older_than_6_months") => {
  try {
    console.log("🔵 Fetching comparison data with filter:", dateFilter);

    const response = await apiClient.get(
      `/comparison/?date_filter=${dateFilter}`
    );

    console.log("🔵 response of getComparison: in apiService", response.data);

    if (response.data.status === 200) {
      console.log("✅ Comparison data fetched successfully");
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(
        response.data.message || "Failed to fetch comparison data"
      );
    }
  } catch (error) {
    console.error("🔴 getComparison error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch comparison data"
    );
  }
};

/**
 * Transforms comparison API response into photo format expected by MetricsSeries
 * @param {Object} comparisonData - Raw comparison data from API
 * @returns {Array} Array of photo objects with metrics for MetricsSeries
 */
export const transformComparisonData = (comparisonData) => {
  console.log("🔵 comparisonData:", comparisonData);
  try {
    if (!comparisonData?.result?.score_img_data) {
      console.log("ℹ️ No score image data found in comparison response");
      return [];
    }

    const { score_img_data } = comparisonData.result;

    // Transform each photo entry into MetricsSeries expected format
    const transformedPhotos = Object.keys(score_img_data).map(
      (photoId, index) => {
        const photoData = score_img_data[photoId];
        const { image, conditions } = photoData;

        // Create metrics object from conditions array
        const metrics = {};

        // Map API condition names to MetricsSeries expected metric keys
        const conditionMapping = {
          acne: "acneScore",
          age: "perceivedAge",
          eyes_age: "eyeAge",
          eye_bags: "eyeAreaCondition",
          hydration: "hydrationScore",
          lines: "linesScore",
          pigmentation: "pigmentationScore",
          pores: "poresScore",
          redness: "rednessScore",
          translucency: "translucencyScore",
          uniformness: "uniformnessScore",
          skin_type: "skinType",
        };

        console.log(conditions,'conditions from transformComparisonData');
        console.log(photoData,'photoData from transformComparisonData');

        // Convert conditions array to metrics object
        conditions.forEach((condition) => {
          const metricKey = conditionMapping[condition.skin_condition_name];
          if (metricKey) {
            // For skin_type, store the skin_condition_type instead of score
            if (metricKey === "skinType") {
              console.log("skin type in progress");
              metrics[metricKey] = condition.skin_condition_type;
            } else {
              metrics[metricKey] = condition.skin_condition_score;
            }
          }
        });

        console.log(metrics,'metrics from transformComparisonData');

        // Use the actual created_at field from the API response
        const createdDate = new Date(image.created_at);
        
        // Create photo object in expected format
        return {
          id: photoId,
          storageUrl: image.front_image,
          timestamp: createdDate,
          created_at: image.created_at, // Keep the original created_at field
          analyzed: true,
          analyzing: false,
          metrics: metrics,
          hautUploadData: {
            imageId: image.image_id,
          },
          apiData: photoData,
        };
      }
    );

    console.log(
      `✅ Transformed ${transformedPhotos.length} photos from comparison data`
    );
    return transformedPhotos;
  } catch (error) {
    console.error("🔴 transformComparisonData error:", error);
    return [];
  }
};

/**
 * Fetch skin trend scores for a specific condition
 * @param {Object} params
 * @param {string} params.skin_condition_name - One of ['hydration', 'uniformness', 'redness', 'translucency', 'lines', 'eye_bags', 'pores', 'skin_tone', 'pigmentation', 'acne', 'eyes_age', 'age']
 * @param {string} params.sort_order - Sort order ('asc' or 'desc'), defaults to 'desc'
 * @returns {Promise<Object>} Skin trend scores data
 */
export const getSkinTrendScores = async ({ skin_condition_name, sort_order = 'desc' }) => {
  const allowedConditions = [
    'hydration', 'uniformness', 'redness', 'translucency', 'lines', 
    'eye_bags', 'pores', 'skin_tone', 'pigmentation', 'acne', 
    'eyes_age', 'age', 'skin_type'
  ];
  
  if (!allowedConditions.includes(skin_condition_name)) {
    throw new Error(
      `Invalid skin_condition_name: ${skin_condition_name}. Must be one of ${allowedConditions.join(", ")}`
    );
  }
  
  if (!['asc', 'desc'].includes(sort_order)) {
    throw new Error("sort_order must be 'asc' or 'desc'");
  }
  
  try {
    console.log("🔵 Fetching skin trend scores:", { skin_condition_name, sort_order });
    const response = await apiClient.get("/haut_mask/skin-trend-scores", {
      params: { skin_condition_name, sort_order },
    });

    console.log('🔵 response of getSkinTrendScores: in apiService', response.status);
    
    if (response.status === 200) {
      console.log("✅ Skin trend scores fetched successfully");
      return {
        success: true,
        data: response.data,
      };
    } else {
      console.log("in else block of getSkinTrendScores");
      
      throw new Error(response.data.message || "Failed to fetch skin trend scores");
    }
  } catch (error) {
    console.error("🔴 getSkinTrendScores error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch skin trend scores"
    );
  }
};

/**
 * Fetch chat history or response for a given image and type
 * @param {Object} params
 * @param {string} params.type - One of ['motivational', 'routine_check', 'snapshot_feedback', 'product_recommendation', 'weather_alert']
 * @param {string} params.image_id - Image ID to get the history for
 * @returns {Promise<Object>} Chat response
 */
export const getChatHistory = async ({ type, image_id }) => {
  const allowedTypes = [
    "motivational",
    "routine_check",
    "snapshot_feedback",
    "product_recommendation",
    "weather_alert",
  ];
  if (!allowedTypes.includes(type)) {
    throw new Error(
      `Invalid type: ${type}. Must be one of ${allowedTypes.join(", ")}`
    );
  }
  if (!image_id) {
    throw new Error("image_id is required");
  }
  try {
    console.log("🔵 Fetching chat history:", { type, image_id });
    const response = await apiClient.get("/chat/", {
      params: { type, image_id },
    });
    if (response.data.status === 200) {
      return response.data;
    }
    throw new Error(response.data.message || "Failed to fetch chat history");
  } catch (error) {
    console.error("🔴 getChatHistory error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch chat history"
    );
  }
};

/**
 * Post a chat message or request to /chat/
 * @param {Object} body - The request body
 * @param {string} body.type - One of ['motivational', 'routine_check', 'snapshot_feedback', 'product_recommendation', 'weather_alert']
 * @param {string} body.image_id - Image ID
 * @param {string} body.firstName - User's first name
 * @param {string} body.skinType - User's skin type
 * @param {Array} body.skinConcerns - Array of skin concerns
 * @param {Object} body.metrics - Metrics object
 * @param {Array} body.excludedMetrics - Array of excluded metrics
 * @returns {Promise<Object>} Chat response
 */
export const postChatMessage = async (body) => {
  const allowedTypes = [
    "motivational",
    "routine_check",
    "snapshot_feedback",
    "product_recommendation",
    "weather_alert",
  ];
  if (!allowedTypes.includes(body.type)) {
    throw new Error(
      `Invalid type: ${body.type}. Must be one of ${allowedTypes.join(", ")}`
    );
  }
  if (!body.image_id) {
    throw new Error("image_id is required");
  }
  try {
    console.log("🔵 Posting chat message:", body);
    const response = await apiClient.post("/chat/", body);
    if (response.data.status === 200) {
      return response.data;
    }
    throw new Error(response.data.message || "Failed to post chat message");
  } catch (error) {
    console.error("🔴 postChatMessage error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to post chat message"
    );
  }
};
// -----------------------------------------------------------------------------
// END COMPARISON/PROGRESS API FUNCTIONS
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// THREAD-BASED CHAT API FUNCTIONS
// -----------------------------------------------------------------------------

// Enhanced createThread function with retry logic and better error handling
export const createThread = async (messageData, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  
  try {
    console.log("🔵 Creating new thread:", messageData, `(attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    // For snapshot_feedback type, include image_id if provided
    const requestData = { ...messageData };
    if (messageData.thread_type === 'snapshot_feedback' && messageData.image_id) {
      requestData.image_id = messageData.image_id;
    }
    
    const response = await apiClient.post("/thread/message", requestData);
    
    if (response.data.status === 200) {
      console.log("✅ Thread created successfully");
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || "Failed to create thread");
    }
  } catch (error) {
    console.error("🔴 createThread error:", error);
    
    // Enhanced error logging
    if (error.code === 'ECONNABORTED') {
      console.error("🔴 Request timeout - server took too long to respond");
    } else if (error.message === 'Network Error') {
      console.error("🔴 Network error - check internet connection or server availability");
    } else if (error.response) {
      console.error("🔴 Server error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("🔴 No response received - server might be down");
    }
    
    // Retry logic for network-related errors
    if (retryCount < MAX_RETRIES && shouldRetry(error)) {
      console.log(`🔄 Retrying createThread in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Exponential backoff for subsequent retries
      const nextRetryDelay = RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, nextRetryDelay));
      
      // Recursive retry
      return createThread(messageData, retryCount + 1);
    }
    
    // If we've exhausted retries or it's not a retryable error, throw a user-friendly error
    const userFriendlyMessage = getUserFriendlyErrorMessage(error);
    throw new Error(userFriendlyMessage);
  }
};

// Helper function to determine if an error should be retried
const shouldRetry = (error) => {
  // Retry on network errors, timeouts, and 5xx server errors
  return (
    error.message === 'Network Error' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ENOTFOUND' ||
    (error.response && error.response.status >= 500 && error.response.status < 600)
  );
};

// Helper function to provide user-friendly error messages
const getUserFriendlyErrorMessage = (error) => {
  if (error.message === 'Network Error') {
    return 'Network connection issue. Please check your internet connection and try again.';
  } else if (error.code === 'ECONNABORTED') {
    return 'Request timed out. The server is taking longer than expected. Please try again.';
  } else if (error.code === 'ECONNRESET') {
    return 'Connection was reset. Please try again.';
  } else if (error.code === 'ENOTFOUND') {
    return 'Unable to reach the server. Please check your connection and try again.';
  } else if (error.response?.status === 500) {
    return 'Server error. Please try again in a few moments.';
  } else if (error.response?.status === 503) {
    return 'Service temporarily unavailable. Please try again later.';
  } else if (error.response?.data?.message) {
    return error.response.data.message;
  } else {
    return 'Failed to create thread. Please try again.';
  }
};

// Enhanced sendThreadMessage function with retry logic and better error handling
export const sendThreadMessage = async (threadId, messageData, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  
  try {
    console.log("🔵 Sending thread message:", { threadId, messageData }, `(attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    console.log("🔵 threadId:", threadId);
    console.log("🔵 messageData:", messageData);
    
    // For snapshot_feedback type, include image_id if provided
    const requestData = { ...messageData };
    if (messageData.thread_type === 'snapshot_feedback' && messageData.image_id) {
      requestData.image_id = messageData.image_id;
    }
    
    const response = await apiClient.post(`/thread/message/${threadId}`, requestData);
    console.log("🔵 response of sendThreadMessage: in apiService", response);
    
    if (response.data.status === 200) {
      console.log("✅ Thread message sent successfully");
      console.log("🔵 response of sendThreadMessage: in apiService", response.data);
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || "Failed to send thread message");
    }
  } catch (error) {
    console.error("🔴 sendThreadMessage error:", error);
    
    // Enhanced error logging
    if (error.code === 'ECONNABORTED') {
      console.error("🔴 Request timeout - server took too long to respond");
    } else if (error.message === 'Network Error') {
      console.error("🔴 Network error - check internet connection or server availability");
    } else if (error.response) {
      console.error("🔴 Server error:", error.response.status, error.response.data);
    } else if (error.request) {
      console.error("🔴 No response received - server might be down");
    }
    
    // Retry logic for network-related errors
    if (retryCount < MAX_RETRIES && shouldRetry(error)) {
      console.log(`🔄 Retrying sendThreadMessage in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Exponential backoff for subsequent retries
      const nextRetryDelay = RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, nextRetryDelay));
      
      // Recursive retry
      return sendThreadMessage(threadId, messageData, retryCount + 1);
    }
    
    // If we've exhausted retries or it's not a retryable error, throw a user-friendly error
    const userFriendlyMessage = getUserFriendlyErrorMessage(error);
    throw new Error(userFriendlyMessage);
  }
};

/**
 * Confirm pending item in thread
 * @param {string} threadId - Thread ID
 * @param {Object} item - Item to confirm
 * @returns {Promise<Object>} Confirmation response
 */
export const confirmThreadItem = async (threadId, item, bool) => {
  try {
    console.log("🔵 Confirming thread item:", { threadId, item });
    
    const response = await apiClient.post(`/thread/thread/${threadId}/confirm-item?user_decline=${bool}`, {
      item
    });
    
    if (response.data.status === 200) {
      console.log("✅ Thread item confirmed successfully");
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || "Failed to confirm thread item");
    }
  } catch (error) {
    console.error("🔴 confirmThreadItem error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to confirm thread item"
    );
  }
};

/**
 * Get chat history by image_id for snapshot_feedback type
 * @param {string} imageId - Image ID
 * @returns {Promise<Object>} Chat history data
 */
export const getChatHistoryByImageId = async (imageId) => {
  try {
    console.log("🔵 Fetching chat history for image_id:", imageId);
    
    const response = await apiClient.get(`/thread/get-latest-chat?image_id=${imageId}`);
    
    if (response.data.status === 200) {
      console.log("🔵 response of getChatHistoryByImageId: in apiService", response.data);
      console.log("✅ Chat history fetched successfully");
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || "Failed to fetch chat history");
    }
  } catch (error) {
    console.error("🔴 getChatHistoryByImageId error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch chat history"
    );
  }
};

/**
 * Send first chat message for snapshot feedback
 * @param {Object} chatData - Chat data for snapshot feedback
 * @param {string} chatData.imageId - Image ID
 * @param {string} chatData.firstName - User's first name
 * @param {number} chatData.age - User's age
 * @param {string} chatData.skinType - User's skin type
 * @param {Array} chatData.skinConcerns - Array of skin concerns
 * @param {Array} chatData.excludedMetrics - Array of excluded metrics
 * @param {Object} chatData.metrics - Metrics object
 * @returns {Promise<Object>} Chat response
 */
export const sendSnapshotFirstChat = async (chatData) => {
  try {
    console.log("🔵 Sending snapshot first chat:", chatData);
    
    const response = await apiClient.post("/thread/snapshot-first-chat", {
      imageId: chatData.imageId,
      firstName: chatData.firstName,
      age: chatData.age,
      skinType: chatData.skinType,
      skinConcerns: chatData.skinConcerns || [],
      excludedMetrics: chatData.excludedMetrics || [],
      metrics: chatData.metrics || {},
    });
    
    if (response.data.status === 200) {
      console.log("✅ Snapshot first chat sent successfully");
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || "Failed to send snapshot first chat");
    }
  } catch (error) {
    console.error("🔴 sendSnapshotFirstChat error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to send snapshot first chat"
    );
  }
};

// -----------------------------------------------------------------------------
// ROUTINE API FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get user's routine items
 * @returns {Promise<Object>} Routine items data
 */
export const getRoutineItems = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  
  try {
    console.log("🔵 Fetching routine items... (retry:", retryCount, ")");

    const response = await apiClient.get("/routine/");

    if (response.data.status === 200) {
      console.log("✅ Routine items fetched successfully");
      return {
        success: true,
        data: response.data.data || [],
      };
    } else {
      throw new Error(response.data.message || "Failed to fetch routine items");
    }
  } catch (error) {
    console.error("🔴 getRoutineItems error:", error);
    
    // Handle specific error types with retry limit
    if ((error.message === 'DUPLICATE_REQUEST' || error.message === 'REQUEST_IN_PROGRESS') && retryCount < MAX_RETRIES) {
      console.log(`🔄 getRoutineItems: Request in progress, retrying after delay... (${retryCount + 1}/${MAX_RETRIES})`);
      
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear any stuck pending requests
      clearPendingRequests();
      
      // Retry the request with incremented retry count
      return getRoutineItems(retryCount + 1);
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please check your connection');
    }
    
    if (error.message === 'Network Error') {
      throw new Error('Network error - please check your internet connection');
    }
    
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch routine items"
    );
  }
};

/**
 * Create a new routine item
 * @param {Object} itemData - Routine item data
 * @param {string} itemData.name - Item name
 * @param {string} itemData.type - Item type (product, activity, nutrition)
 * @param {string} [itemData.usage] - Usage time (am, pm, both) - optional for treatment types
 * @param {string} [itemData.frequency] - Frequency (daily, weekly, as_needed) - optional for treatment types
 * @param {Object} [itemData.extra] - Additional data (optional)
 * @returns {Promise<Object>} Created item response
 */
export const createRoutineItem = async (itemData) => {
  try {
    console.log("🔵 Creating routine item:", itemData);

    // Create form data as API expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("name", itemData.name);
    formData.append("type", itemData.type?.toLowerCase() || '');
    
    // Only add usage and frequency for non-treatment types
    if (itemData.usage) {
      formData.append("usage", itemData.usage.toLowerCase());
    }
    if (itemData.frequency) {
      formData.append("frequency", itemData.frequency.toLowerCase().replace(" ", "_"));
    }
    
    // Add new fields for updated API
    if (itemData.concern && Array.isArray(itemData.concern)) {
      formData.append("concern", JSON.stringify(itemData.concern));
    }
    
    // Handle treatment types differently - use treatment_date instead of start_date/end_date
    const isTreatmentType = itemData.type && (
      itemData.type.includes('treatment_facial') || 
      itemData.type.includes('treatment_injection') || 
      itemData.type.includes('treatment_other')
    );
    
    if (isTreatmentType) {
      if (itemData.treatment_date) {
        formData.append("treatment_date", itemData.treatment_date);
      }
    } else {
      if (itemData.start_date) {
        formData.append("start_date", itemData.start_date);
      }
      if (itemData.end_date) {
        formData.append("end_date", itemData.end_date);
      }
    }
    
    formData.append("extra", JSON.stringify(itemData.extra || {}));

    const response = await apiClient.post("/routine/", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.data.status === 201 || response.data.status === 200) {
      console.log("✅ Routine item created successfully");
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || "Failed to create routine item");
    }
  } catch (error) {
    console.error("🔴 createRoutineItem error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to create routine item"
    );
  }
};

/**
 * Update a routine item
 * @param {string} itemId - Item ID
 * @param {Object} itemData - Updated item data
 * @param {string} itemData.name - Item name
 * @param {string} itemData.type - Item type (product, activity, nutrition)
 * @param {string} [itemData.usage] - Usage time (am, pm, both) - optional for treatment types
 * @param {string} [itemData.frequency] - Frequency (daily, weekly, as_needed) - optional for treatment types
 * @param {Object} [itemData.extra] - Additional data (optional)
 * @returns {Promise<Object>} Updated item response
 */
export const updateRoutineItem = async (itemId, itemData) => {
  try {
    console.log("🔵 Updating routine item:", itemId, itemData);

    // Create form data as API expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("name", itemData.name);
    formData.append("type", itemData.type?.toLowerCase() || '');

    // Only add usage and frequency if they exist (for non-treatment types)
    if (itemData.usage) {
      formData.append("usage", itemData.usage.toLowerCase());
    }
    if (itemData.frequency) {
      formData.append("frequency", itemData.frequency.toLowerCase().replace(" ", "_"));
    }
    
    // Add new fields for updated API
    if (itemData.concern && Array.isArray(itemData.concern)) {
      formData.append("concern", JSON.stringify(itemData.concern));
    }
    
    // Handle treatment types differently - use treatment_date instead of start_date/end_date
    const isTreatmentType = itemData.type && (
      itemData.type.includes('treatment_facial') || 
      itemData.type.includes('treatment_injection') || 
      itemData.type.includes('treatment_other')
    );
    
    if (isTreatmentType) {
      if (itemData.treatment_date) {
        formData.append("treatment_date", itemData.treatment_date);
      }
    } else {
      if (itemData.start_date) {
        formData.append("start_date", itemData.start_date);
      }
      if (itemData.end_date) {
        formData.append("end_date", itemData.end_date);
      }
    }
    
    formData.append("extra", JSON.stringify(itemData.extra || {}));

    const response = await apiClient.patch(`/routine/${itemId}`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.data.status === 200) {
      console.log("✅ Routine item updated successfully");
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.message || "Failed to update routine item");
    }
  } catch (error) {
    console.error("🔴 updateRoutineItem error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to update routine item"
    );
  }
};

/**
 * Delete a routine item
 * @param {string} itemId - Item ID to delete
 * @returns {Promise<Object>} Delete response
 */
export const deleteRoutineItem = async (itemId) => {
  try {
    console.log("🔵 Deleting routine item:", itemId);

    const response = await apiClient.delete(`/routine/${itemId}`);

    if (response.data.status === 200) {
      console.log("✅ Routine item deleted successfully");
      return {
        success: true,
        message: response.data.message || "Item deleted successfully",
      };
    } else {
      throw new Error(response.data.message || "Failed to delete routine item");
    }
  } catch (error) {
    console.error("🔴 deleteRoutineItem error:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to delete routine item"
    );
  }
};

// -----------------------------------------------------------------------------
// END ROUTINE API FUNCTIONS
// -----------------------------------------------------------------------------

export default apiClient;
