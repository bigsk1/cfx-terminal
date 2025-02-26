/**
 * Utility functions for handling avatar URLs
 */

/**
 * Ensures avatar URLs are always available by processing Twitter profile image URLs
 * and providing fallbacks when needed.
 * 
 * @param profileImageUrl The profile image URL from Twitter
 * @param username The Twitter username
 * @returns A processed URL that can be used for avatars
 */
export const getAvatarUrl = (profileImageUrl?: string, username?: string): string => {
  // For debugging
  console.log(`Processing avatar URL: ${profileImageUrl} for user: ${username}`);
  
  // Check if we have a valid profile image URL
  if (profileImageUrl && profileImageUrl.trim() !== '') {
    // Twitter profile images can have various size suffixes like _normal, _400x400, etc.
    // First, check if it's a Twitter URL
    if (profileImageUrl.includes('twimg.com/profile_images/')) {
      console.log('Detected Twitter profile image URL');
      
      try {
        // For Twitter URLs, we need to handle the size suffix
        // Extract the base URL without the size suffix
        const match = profileImageUrl.match(/(.*\/profile_images\/\d+\/[^_]+)(_\w+)?(\.\w+)$/);
        if (match) {
          // Instead of returning the direct Twitter URL, use a proxy service
          // images.weserv.nl is a free image proxy service that can bypass content blocking
          const originalUrl = `${match[1]}${match[3]}`;
          console.log(`Original Twitter URL: ${originalUrl}`);
          
          // Encode the URL for the proxy
          const encodedUrl = encodeURIComponent(originalUrl);
          const proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}&default=avatar`;
          console.log(`Using proxy URL: ${proxyUrl}`);
          return proxyUrl;
        }
        
        // If the regex didn't match but it's still a Twitter URL, try a simpler approach
        const simplifiedUrl = profileImageUrl.replace(/_\w+(\.\w+)$/, '$1');
        console.log(`Simplified URL: ${simplifiedUrl}`);
        
        // Use the proxy for this URL too
        const encodedUrl = encodeURIComponent(simplifiedUrl);
        const proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}&default=avatar`;
        console.log(`Using proxy URL for simplified: ${proxyUrl}`);
        return proxyUrl;
      } catch (error) {
        console.error('Error processing Twitter profile image URL:', error);
        // If there's an error processing the URL, fall back to username-based URL
      }
    } else {
      // For non-Twitter URLs, still use the proxy to avoid CORS issues
      try {
        const encodedUrl = encodeURIComponent(profileImageUrl);
        const proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}&default=avatar`;
        console.log(`Using proxy URL for non-Twitter URL: ${proxyUrl}`);
        return proxyUrl;
      } catch (error) {
        console.error('Error processing non-Twitter profile image URL:', error);
        // If there's an error processing the URL, fall back to username-based URL
      }
    }
  }
  
  // Use username to create a fallback URL
  if (username && username.trim() !== '') {
    try {
      // Try multiple fallback services
      // First try unavatar.io which aggregates multiple avatar services
      const fallbackUrl = `https://unavatar.io/twitter/${encodeURIComponent(username)}`;
      console.log(`Using fallback URL: ${fallbackUrl}`);
      return fallbackUrl;
    } catch (error) {
      console.error('Error creating fallback URL:', error);
    }
  }
  
  // Default fallback - return empty string to let Avatar component use the name initials
  console.log('No valid URL or username, returning empty string');
  return '';
}; 