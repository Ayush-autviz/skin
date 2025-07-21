// chatApiService.js
// API service for AI chat functionality

import { apiClient } from './newApiService';

/**
 * Chat types for different contexts
 */
export const CHAT_TYPES = {
  ROUTINE_CHECK: 'routine_check',
  SNAPSHOT_FEEDBACK: 'snapshot_feedback',
  MOTIVATIONAL: 'motivational'
};

/**
 * Send a message to the AI chat
 * @param {Object} messageData - Message data
 * @param {string} messageData.type - Chat type (routine_check, snapshot_feedback)
 * @param {string} messageData.image_id - Image ID for snapshot feedback
 * @param {string} messageData.firstName - User's first name
 * @param {string} messageData.skinType - User's skin type
 * @param {Array} messageData.skinConcerns - Array of skin concerns
 * @param {Object} messageData.metrics - Metrics object for snapshot feedback
 * @param {Array} messageData.excludedMetrics - Array of excluded metrics
 * @param {string} messageData.query - User's message/query
 * @returns {Promise<Object>} API response
 */
export const sendChatMessage = async (messageData) => {
  try {
    console.log('🔵 Sending chat message:', messageData.type);
    
    const payload = {
      type: messageData.type,
      ...(messageData.image_id && { image_id: messageData.image_id }),
      ...(messageData.firstName && { firstName: messageData.firstName }),
      ...(messageData.skinType && { skinType: messageData.skinType }),
      ...(messageData.skinConcerns && { skinConcerns: messageData.skinConcerns }),
      ...(messageData.metrics && { metrics: messageData.metrics }),
      ...(messageData.excludedMetrics && { excludedMetrics: messageData.excludedMetrics }),
      ...(messageData.query && { query: messageData.query })
    };

    const response = await apiClient.post('/chat/', payload);

    if (response.data.status === 201) {
      console.log('✅ Chat message sent successfully');
      return {
        success: true,
        message: response.data.data.result,
        data: response.data
      };
    } else {
      throw new Error(response.data.message || 'Failed to send message');
    }
  } catch (error) {
    console.error('🔴 Error sending chat message:', error);
    throw error;
  }
};

/**
 * Get chat history for a specific image
 * @param {string} type - Chat type (motivational, snapshot_feedback)
 * @param {string} image_id - Image ID
 * @returns {Promise<Array>} Chat history array
 */
export const getChatHistory = async (type, image_id) => {
  try {
    console.log('🔵 Fetching chat history:', { type, image_id });
    
    const response = await apiClient.get(`/chat/?type=${type}&image_id=${image_id}`);

    if (response.data.status === 200) {
      console.log('✅ Chat history fetched successfully');
      return {
        success: true,
        messages: response.data.data.result || [],
        data: response.data
      };
    } else {
      throw new Error(response.data.message || 'Failed to fetch chat history');
    }
  } catch (error) {
    console.error('🔴 Error fetching chat history:', error);
    throw error;
  }
};

/**
 * Send initial message for routine recommendations
 * @param {string} firstName - User's first name
 * @param {string} skinType - User's skin type
 * @param {Array} skinConcerns - Array of skin concerns
 * @returns {Promise<Object>} API response
 */
export const sendRoutineInitialMessage = async (firstName, skinType, skinConcerns) => {
  return sendChatMessage({
    type: CHAT_TYPES.ROUTINE_CHECK,
    firstName,
    skinType,
    skinConcerns,
    query: 'recommendations'
  });
};

/**
 * Send initial message for my routine
 * @param {string} firstName - User's first name
 * @param {string} skinType - User's skin type
 * @param {Array} skinConcerns - Array of skin concerns
 * @returns {Promise<Object>} API response
 */
export const sendMyRoutineInitialMessage = async (firstName, skinType, skinConcerns) => {
  return sendChatMessage({
    type: CHAT_TYPES.ROUTINE_CHECK,
    firstName,
    skinType,
    skinConcerns,
    query: 'my routine'
  });
};

/**
 * Send snapshot feedback message
 * @param {string} image_id - Image ID
 * @param {string} firstName - User's first name
 * @param {string} skinType - User's skin type
 * @param {Array} skinConcerns - Array of skin concerns
 * @param {Object} metrics - Metrics object
 * @param {Array} excludedMetrics - Array of excluded metrics
 * @param {string} query - User's query (optional)
 * @returns {Promise<Object>} API response
 */
export const sendSnapshotFeedback = async (image_id, firstName, skinType, skinConcerns, metrics, excludedMetrics = [], query = '') => {
  return sendChatMessage({
    type: CHAT_TYPES.SNAPSHOT_FEEDBACK,
    image_id,
    firstName,
    skinType,
    skinConcerns,
    metrics,
    excludedMetrics,
    ...(query && { query })
  });
};

/**
 * Transform API chat message to app format
 * @param {Object} apiMessage - Message from API
 * @returns {Object} Formatted message
 */
export const transformApiMessage = (apiMessage) => {
  return {
    id: apiMessage.id,
    content: apiMessage.response,
    role: 'assistant',
    timestamp: new Date(apiMessage.created_at),
    query: apiMessage.query,
    chat_type: apiMessage.chat_type,
    skin_result_id: apiMessage.skin_result_id
  };
};

/**
 * Transform user query to app format
 * @param {string} query - User query
 * @param {string} id - Message ID
 * @returns {Object} Formatted message
 */
export const transformUserMessage = (query, id = null) => {
  return {
    id: id || `user-${Date.now()}`,
    content: query,
    role: 'user',
    timestamp: new Date()
  };
};
