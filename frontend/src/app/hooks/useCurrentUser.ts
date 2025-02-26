import { useState, useEffect } from 'react';

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  verified?: boolean;
}

export function useCurrentUser() {
  const [user, setUser] = useState<TwitterUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Try to get from localStorage first to avoid unnecessary API calls
        const cachedUser = localStorage.getItem('twitter-current-user');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            // Check if the cached data is recent (less than 1 hour old)
            const cacheTime = localStorage.getItem('twitter-current-user-time');
            if (cacheTime) {
              const cacheAge = Date.now() - parseInt(cacheTime, 10);
              // If cache is less than 1 hour old, use it
              if (cacheAge < 60 * 60 * 1000) {
                setUser(parsedUser);
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            // If there's an error parsing the cached user, ignore it and fetch from API
            console.error('Error parsing cached user:', e);
          }
        }
        
        // Fetch from API
        const response = await fetch('/api/twitter/user/me');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.data) {
          throw new Error('Invalid response format');
        }
        
        const userData = data.data;
        setUser(userData);
        
        // Cache the user data
        localStorage.setItem('twitter-current-user', JSON.stringify(userData));
        localStorage.setItem('twitter-current-user-time', Date.now().toString());
        
      } catch (err) {
        console.error('Error fetching current user:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return { user, isLoading, error };
} 