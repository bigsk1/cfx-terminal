'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  Text,
  Spinner,
  Button,
  useToast,
  Flex,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import {
  RepeatIcon,
} from '@chakra-ui/icons';
import { Tweet, TweetMedia } from './types';
import TweetCard from './TweetCard';
import TweetComposer from './TweetComposer';

interface HomeTimelineProps {
  onClose?: () => void;
  isVisible?: boolean;
}

// Add rate limit info interface
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

const HomeTimeline: React.FC<HomeTimelineProps> = ({ onClose, isVisible = true }) => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cacheInfo, setCacheInfo] = useState<{
    isCached: boolean;
    cacheTime?: number;
    warning?: string;
  } | null>(null);
  // Add rate limit state
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const toast = useToast();

  // Function to fetch the home timeline
  const fetchHomeTimeline = useCallback(async (cursor?: string, append: boolean = false) => {
    try {
      const loadingState = append ? setIsLoadingMore : setIsLoading;
      loadingState(true);
      setError(null);
      setCacheInfo(null);

      // Build the URL with query parameters
      let url = '/api/twitter/home-timeline?count=60';
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      // Add a cache-busting parameter to avoid browser caching
      url += `&_=${new Date().getTime()}`;

      const response = await fetch(url, {
        // Add cache control headers
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch timeline';
        
        // Check for rate limit errors
        if (response.status === 429) {
          try {
            // Try to parse error as JSON if possible
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || 'Twitter API rate limit exceeded. Please try again later.';
          } catch (jsonError) {
            // If JSON parsing fails, use the text content
            errorMessage = errorText || 'Twitter API rate limit exceeded. Please try again later.';
          }
        } else {
          try {
            // Try to parse error as JSON if possible
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorMessage;
          } catch (jsonError) {
            // If JSON parsing fails, use the text content
            errorMessage = errorText || errorMessage;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Parse the JSON response
      const data = await response.json();
      
      // Check if data has the expected structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      // Check for cache info and warnings
      if (data.meta) {
        if (data.meta.cached || data.meta.warning) {
          setCacheInfo({
            isCached: !!data.meta.cached,
            cacheTime: data.meta.cache_time,
            warning: data.meta.warning
          });
          
          // Show a toast for cached data
          if (data.meta.cached && !append) {
            const cacheTime = data.meta.cache_time 
              ? new Date(data.meta.cache_time * 1000).toLocaleTimeString() 
              : 'unknown time';
            
            toast({
              title: 'Using cached data',
              description: data.meta.warning || `Showing cached data from ${cacheTime}`,
              status: 'info',
              duration: 5000,
              isClosable: true,
            });
          }
        }
      }
      
      // Extract rate limit info from the response if available
      if (data.meta && data.meta.rate_limit) {
        setRateLimitInfo({
          limit: data.meta.rate_limit.limit || 0,
          remaining: data.meta.rate_limit.remaining || 0,
          resetTime: data.meta.rate_limit.reset_time || 0
        });
      }
      
      // Process the tweets
      const processedTweets = processTweets(data);
      
      // Update state
      if (append) {
        setTweets(prev => [...prev, ...processedTweets]);
      } else {
        setTweets(processedTweets);
      }
      
      // Update pagination
      setNextCursor(data.meta?.next_token || null);
      setHasMore(!!data.meta?.next_token);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch timeline',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [toast]);

  // Process the tweets from the API response
  const processTweets = (data: any): Tweet[] => {
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }
    
    const usersMap = new Map();
    if (data.includes?.users) {
      data.includes.users.forEach((user: any) => {
        usersMap.set(user.id, user);
      });
    }
    
    const mediaMap = new Map();
    if (data.includes?.media) {
      data.includes.media.forEach((media: any) => {
        mediaMap.set(media.media_key, media);
      });
    }
    
    // Create a map of referenced tweets for quick lookup
    const tweetsMap = new Map();
    data.data.forEach((tweet: any) => {
      // Ensure tweet ID is a string
      tweet.id = String(tweet.id);
      tweetsMap.set(tweet.id, tweet);
    });
    if (data.includes?.tweets) {
      data.includes.tweets.forEach((tweet: any) => {
        // Ensure tweet ID is a string
        tweet.id = String(tweet.id);
        tweetsMap.set(tweet.id, tweet);
      });
    }

    // Process each tweet
    return data.data.map((tweet: any) => {
      // Get author information
      let author = usersMap.get(tweet.author_id) || {};
      
      // Create proper profile image URL
      // Use the actual profile_image_url if available, otherwise use a fallback
      const profileImageUrl = author.profile_image_url || '';
      
      // Process media attachments
      const mediaKeys = tweet.attachments?.media_keys || [];
      const media = mediaKeys
        .map((key: string) => mediaMap.get(key))
        .filter(Boolean)
        .map((m: any) => {
          // Enhanced media processing
          const mediaItem: TweetMedia = {
            type: m.type,
            url: m.url || m.preview_image_url,
            preview_image_url: m.preview_image_url,
            media_key: m.media_key,
            alt_text: m.alt_text,
            duration_ms: m.duration_ms,
            height: m.height,
            width: m.width,
            variants: m.variants || []
          };
          
          // For videos, try to get the actual video URL if available
          if (m.type === 'video' && m.variants && m.variants.length > 0) {
            // Sort variants by bitrate (highest first) and prefer mp4
            const sortedVariants = [...m.variants].sort((a, b) => {
              // Prefer mp4 format
              if (a.content_type === 'video/mp4' && b.content_type !== 'video/mp4') return -1;
              if (a.content_type !== 'video/mp4' && b.content_type === 'video/mp4') return 1;
              // Then sort by bitrate (highest first)
              return (b.bit_rate || 0) - (a.bit_rate || 0);
            });
            
            // Use the best variant URL if available
            if (sortedVariants.length > 0 && sortedVariants[0].url) {
              mediaItem.url = sortedVariants[0].url;
              // Ensure mediaItem has content_type property before assigning
              if (sortedVariants[0].content_type) {
                mediaItem.content_type = sortedVariants[0].content_type;
              }
            }
          }
          
          // Ensure we always have a URL, even if it's just for linking
          if (!mediaItem.url && !mediaItem.preview_image_url) {
            // If we have no URL at all, create a placeholder URL to the tweet
            const tweetId = String(tweet.id);
            const authorUsername = author.username || '';
            mediaItem.url = `https://twitter.com/${authorUsername}/status/${tweetId}`;
          }
          
          return mediaItem;
        });
      
      // Process referenced tweets (retweets, quotes, replies)
      const referencedTweets = tweet.referenced_tweets || [];
      
      // Find retweet if present
      const retweetRef = referencedTweets.find((rt: any) => rt.type === 'retweeted');
      const retweet = retweetRef ? tweetsMap.get(String(retweetRef.id)) : null;
      
      // Find quoted tweet if present
      const quoteRef = referencedTweets.find((rt: any) => rt.type === 'quoted');
      const quotedTweet = quoteRef ? tweetsMap.get(String(quoteRef.id)) : null;
      
      // If this is a retweet, get the original author
      let retweetedBy = null;
      if (retweet) {
        retweetedBy = {
          id: String(author.id),
          name: author.name,
          username: author.username,
          // Ensure retweeted by user has a profile image
          profileImageUrl: author.profile_image_url || (author.username ? `https://x.com/${author.username}/photo` : ''),
        };
        
        // Update the author to the original tweet's author
        const retweetAuthorId = retweet.author_id;
        if (retweetAuthorId && usersMap.has(retweetAuthorId)) {
          author = usersMap.get(retweetAuthorId);
        }
      }
      
      // Process quoted tweet if present
      let quotedTweetData = null;
      if (quotedTweet) {
        const quotedAuthorId = quotedTweet.author_id;
        const quotedAuthor = quotedAuthorId ? usersMap.get(quotedAuthorId) || {} : {};
        
        // Create fallback profile image URL for quoted tweet author
        const quotedAuthorUsername = quotedAuthor.username || '';
        // Use a more reliable fallback URL format
        const quotedProfileImageUrl = quotedAuthor.profile_image_url || (quotedAuthorUsername ? `https://x.com/${quotedAuthorUsername}/photo` : '');

        const quotedMediaKeys = quotedTweet.attachments?.media_keys || [];
        const quotedMedia = quotedMediaKeys
          .map((key: string) => mediaMap.get(key))
          .filter(Boolean)
          .map((m: any) => {
            // Enhanced media processing for quoted tweets
            const mediaItem: TweetMedia = {
              type: m.type,
              url: m.url || m.preview_image_url,
              preview_image_url: m.preview_image_url,
              media_key: m.media_key,
              alt_text: m.alt_text,
              duration_ms: m.duration_ms,
              height: m.height,
              width: m.width,
              variants: m.variants || []
            };
            
            // For videos, try to get the actual video URL if available
            if (m.type === 'video' && m.variants && m.variants.length > 0) {
              // Sort variants by bitrate (highest first) and prefer mp4
              const sortedVariants = [...m.variants].sort((a, b) => {
                // Prefer mp4 format
                if (a.content_type === 'video/mp4' && b.content_type !== 'video/mp4') return -1;
                if (a.content_type !== 'video/mp4' && b.content_type === 'video/mp4') return 1;
                // Then sort by bitrate (highest first)
                return (b.bit_rate || 0) - (a.bit_rate || 0);
              });
              
              // Use the best variant URL if available
              if (sortedVariants.length > 0 && sortedVariants[0].url) {
                mediaItem.url = sortedVariants[0].url;
                // Ensure mediaItem has content_type property before assigning
                if (sortedVariants[0].content_type) {
                  mediaItem.content_type = sortedVariants[0].content_type;
                }
              }
            }
            
            // Ensure we always have a URL, even if it's just for linking
            if (!mediaItem.url && !mediaItem.preview_image_url) {
              // If we have no URL at all, create a placeholder URL to the tweet
              const quotedTweetId = String(quotedTweet.id);
              const quotedAuthorUsername = quotedAuthor.username || '';
              mediaItem.url = `https://twitter.com/${quotedAuthorUsername}/status/${quotedTweetId}`;
            }
            
            return mediaItem;
          });
        
        quotedTweetData = {
          id: String(quotedTweet.id),
          text: quotedTweet.text,
          createdAt: quotedTweet.created_at,
          author: {
            id: String(quotedAuthor.id),
            name: quotedAuthor.name,
            username: quotedAuthor.username,
            profileImageUrl: quotedProfileImageUrl,
            verified: quotedAuthor.verified,
          },
          media: quotedMedia,
          metrics: quotedTweet.public_metrics || {},
        };
      }
      
      // Extract metrics and add liked/retweeted status
      const metrics = {
        ...(retweet ? retweet.public_metrics : tweet.public_metrics || {}),
        liked: false,  // Default values, should be updated from API if available
        retweeted: false
      };
      
      // Return the processed tweet
      return {
        id: String(tweet.id),
        text: retweet ? retweet.text : tweet.text,
        createdAt: tweet.created_at,
        author: {
          id: String(author.id),
          name: author.name,
          username: author.username,
          // Ensure we always have a profile image URL
          profileImageUrl: profileImageUrl || (author.username ? `https://x.com/${author.username}/photo` : ''),
          verified: author.verified,
        },
        retweetedBy: retweetedBy ? {
          id: String(retweetedBy.id),
          name: retweetedBy.name,
          username: retweetedBy.username,
          // Ensure retweeted by user has a profile image
          profileImageUrl: retweetedBy.profileImageUrl || (retweetedBy.username ? `https://x.com/${retweetedBy.username}/photo` : ''),
        } : null,
        quotedTweet: quotedTweetData,
        media,
        metrics,
        entities: retweet ? retweet.entities : tweet.entities,
      };
    });
  };

  // Load more tweets
  const loadMore = () => {
    if (nextCursor && !isLoadingMore) {
      fetchHomeTimeline(nextCursor, true);
    }
  };

  // Refresh the timeline
  const refreshTimeline = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Handle tweet actions (like, retweet, etc.)
  const handleTweetAction = async (tweetId: string, action: string) => {
    try {
      // Ensure tweetId is a string
      const id = String(tweetId);
      
      // Log the action for debugging
      console.log(`Performing ${action} on tweet ID: ${id}`);
      
      const response = await fetch('/api/twitter/tweet-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweet_id: id,
          action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${action} tweet`);
      }

      // Update the UI optimistically
      setTweets(prev => {
        return prev.map(tweet => {
          if (tweet.id === id) {
            const metrics = { ...tweet.metrics };
            
            if (action === 'like') {
              metrics.like_count = (metrics.like_count || 0) + 1;
            } else if (action === 'unlike') {
              metrics.like_count = Math.max(0, (metrics.like_count || 0) - 1);
            } else if (action === 'retweet') {
              metrics.retweet_count = (metrics.retweet_count || 0) + 1;
            } else if (action === 'unretweet') {
              metrics.retweet_count = Math.max(0, (metrics.retweet_count || 0) - 1);
            }
            
            return { ...tweet, metrics };
          }
          return tweet;
        });
      });

      toast({
        title: 'Success',
        description: `Tweet ${action}d successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error(`Error ${action}ing tweet:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} tweet`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle tweet posting
  const handleTweetPosted = () => {
    // Refresh the timeline after posting a tweet
    refreshTimeline();
    toast({
      title: 'Success',
      description: 'Your tweet was posted successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Only fetch timeline when the component is visible
  useEffect(() => {
    if (isVisible) {
      fetchHomeTimeline();
    }
  }, [fetchHomeTimeline, refreshKey, isVisible]);

  // Format cache time for display
  const formatCacheTime = (timestamp?: number) => {
    if (!timestamp) return 'unknown time';
    
    const cacheDate = new Date(timestamp * 1000);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - cacheDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes === 1) {
      return '1 minute ago';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else {
      return cacheDate.toLocaleTimeString();
    }
  };

  // Add a function to format the reset time
  const formatRateLimitReset = () => {
    if (!rateLimitInfo || !rateLimitInfo.resetTime) return 'Unknown';
    
    const now = Math.floor(Date.now() / 1000);
    const secondsUntilReset = Math.max(0, rateLimitInfo.resetTime - now);
    
    if (secondsUntilReset < 60) {
      return `${secondsUntilReset} seconds`;
    } else {
      const minutesUntilReset = Math.ceil(secondsUntilReset / 60);
      return `${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}`;
    }
  };

  return (
    <Box 
      width="100%" 
      height="100%" 
      bg="blackAlpha.900" 
      color="white"
      borderRadius="md"
      overflow="hidden"
    >
      <Flex direction="column" height="100%">
        {/* Header */}
        <Flex 
          p={4} 
          borderBottomWidth="1px" 
          borderColor="whiteAlpha.200" 
          justify="space-between" 
          align="center"
          bg="blackAlpha.400"
        >
          <Text fontSize="xl" fontWeight="bold">Home Timeline</Text>
          <HStack>
            <IconButton
              aria-label="Refresh timeline"
              icon={<RepeatIcon />}
              size="sm"
              colorScheme="twitter"
              onClick={refreshTimeline}
              isLoading={isLoading}
            />
            {onClose && (
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </HStack>
        </Flex>

        {/* Cache Info Banner */}
        {cacheInfo && (
          <Box 
            p={2} 
            bg="blackAlpha.400" 
            borderBottomWidth="1px" 
            borderColor="whiteAlpha.200"
          >
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" color="yellow.300">
                {cacheInfo.warning || `Showing cached data from ${formatCacheTime(cacheInfo.cacheTime)}`}
              </Text>
              <Button 
                size="xs" 
                leftIcon={<RepeatIcon />} 
                onClick={refreshTimeline}
                variant="outline"
                colorScheme="yellow"
              >
                Refresh
              </Button>
            </Flex>
          </Box>
        )}

        {/* Tweet Composer */}
        <Box p={4} borderBottomWidth="1px" borderColor="whiteAlpha.200">
          <TweetComposer onTweetPosted={handleTweetPosted} />
        </Box>

        {/* Timeline */}
        <Box flex="1" overflowY="auto" p={4}>
          {isLoading ? (
            <Flex justify="center" align="center" height="100%">
              <Spinner size="xl" color="twitter.500" />
            </Flex>
          ) : error ? (
            <Flex direction="column" justify="center" align="center" height="100%" textAlign="center">
              <Box 
                p={6} 
                borderRadius="md" 
                bg="blackAlpha.400" 
                maxW="600px"
                borderWidth="1px"
                borderColor="red.500"
              >
                <Text fontSize="lg" mb={4} color="red.300">
                  {error}
                </Text>
                
                {error.includes('rate limit') && (
                  <>
                    <Text fontSize="md" mb={4}>
                      Twitter API has rate limits of 15 requests per 15 minutes for the home timeline.
                    </Text>
                    <Text fontSize="sm" mb={4} color="whiteAlpha.700">
                      You can continue using other features of the application while waiting.
                    </Text>
                  </>
                )}
                
                <Button 
                  onClick={refreshTimeline} 
                  colorScheme="twitter" 
                  mt={2}
                  isDisabled={error.includes('rate limit')}
                >
                  {error.includes('rate limit') ? 'Please wait before retrying' : 'Try Again'}
                </Button>
              </Box>
            </Flex>
          ) : tweets.length === 0 ? (
            <Flex justify="center" align="center" height="100%">
              <Text>No tweets found in your timeline</Text>
            </Flex>
          ) : (
            <VStack spacing={4} align="stretch">
              {tweets.map(tweet => (
                <TweetCard 
                  key={tweet.id} 
                  tweet={tweet} 
                  onAction={handleTweetAction} 
                />
              ))}
              
              {hasMore && (
                <Button 
                  onClick={loadMore} 
                  isLoading={isLoadingMore}
                  width="100%"
                  variant="outline"
                  colorScheme="twitter"
                >
                  Load More
                </Button>
              )}
            </VStack>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default HomeTimeline; 