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
  Divider,
  IconButton,
  Avatar,
  HStack,
  Badge,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  RepeatIcon,
  ChatIcon,
  StarIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  AttachmentIcon,
} from '@chakra-ui/icons';
import { Tweet } from './types';
import TweetCard from './TweetCard';
import TweetComposer from './TweetComposer';

interface HomeTimelineProps {
  onClose?: () => void;
  isVisible?: boolean;
}

const HomeTimeline: React.FC<HomeTimelineProps> = ({ onClose, isVisible = true }) => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const toast = useToast();

  // Function to fetch the home timeline
  const fetchHomeTimeline = useCallback(async (cursor?: string, append: boolean = false) => {
    try {
      const loadingState = append ? setIsLoadingMore : setIsLoading;
      loadingState(true);
      setError(null);

      // Build the URL with query parameters
      let url = '/api/twitter/home-timeline?count=20';
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
          errorMessage = 'Twitter API rate limit exceeded. Please try again later.';
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

    // Create a map of users for quick lookup
    const usersMap = new Map();
    if (data.includes?.users) {
      data.includes.users.forEach((user: any) => {
        usersMap.set(user.id, user);
      });
    }

    // Create a map of media for quick lookup
    const mediaMap = new Map();
    if (data.includes?.media) {
      data.includes.media.forEach((media: any) => {
        mediaMap.set(media.media_key, media);
      });
    }

    // Create a map of referenced tweets for quick lookup
    const tweetsMap = new Map();
    data.data.forEach((tweet: any) => {
      tweetsMap.set(tweet.id, tweet);
    });
    if (data.includes?.tweets) {
      data.includes.tweets.forEach((tweet: any) => {
        tweetsMap.set(tweet.id, tweet);
      });
    }

    // Process each tweet
    return data.data.map((tweet: any) => {
      // Get author information
      let author = usersMap.get(tweet.author_id) || {};
      
      // Process media attachments
      const mediaKeys = tweet.attachments?.media_keys || [];
      const media = mediaKeys
        .map((key: string) => mediaMap.get(key))
        .filter(Boolean)
        .map((m: any) => ({
          type: m.type,
          url: m.url || m.preview_image_url,
        }));
      
      // Process referenced tweets (retweets, quotes, replies)
      const referencedTweets = tweet.referenced_tweets || [];
      
      // Find retweet if present
      const retweetRef = referencedTweets.find((rt: any) => rt.type === 'retweeted');
      const retweet = retweetRef ? tweetsMap.get(retweetRef.id) : null;
      
      // Find quoted tweet if present
      const quoteRef = referencedTweets.find((rt: any) => rt.type === 'quoted');
      const quotedTweet = quoteRef ? tweetsMap.get(quoteRef.id) : null;
      
      // If this is a retweet, get the original author
      let retweetedBy = null;
      if (retweet) {
        retweetedBy = {
          id: author.id,
          name: author.name,
          username: author.username,
          profileImageUrl: author.profile_image_url,
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
        
        const quotedMediaKeys = quotedTweet.attachments?.media_keys || [];
        const quotedMedia = quotedMediaKeys
          .map((key: string) => mediaMap.get(key))
          .filter(Boolean)
          .map((m: any) => ({
            type: m.type,
            url: m.url || m.preview_image_url,
          }));
        
        quotedTweetData = {
          id: quotedTweet.id,
          text: quotedTweet.text,
          createdAt: quotedTweet.created_at,
          author: {
            id: quotedAuthor.id,
            name: quotedAuthor.name,
            username: quotedAuthor.username,
            profileImageUrl: quotedAuthor.profile_image_url,
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
        id: tweet.id,
        text: retweet ? retweet.text : tweet.text,
        createdAt: tweet.created_at,
        author: {
          id: author.id,
          name: author.name,
          username: author.username,
          profileImageUrl: author.profile_image_url,
          verified: author.verified,
        },
        retweetedBy,
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
      const response = await fetch('/api/twitter/tweet-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweet_id: tweetId,
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
          if (tweet.id === tweetId) {
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
            <Flex direction="column" justify="center" align="center" height="100%" p={4}>
              <Text color="red.400" mb={4}>{error}</Text>
              <Button colorScheme="twitter" onClick={refreshTimeline}>
                Try Again
              </Button>
            </Flex>
          ) : tweets.length === 0 ? (
            <Flex direction="column" justify="center" align="center" height="100%" p={4}>
              <Text mb={4}>No tweets found in your timeline.</Text>
              <Button colorScheme="twitter" onClick={refreshTimeline}>
                Refresh
              </Button>
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
                <Flex justify="center" p={4}>
                  <Button
                    onClick={loadMore}
                    isLoading={isLoadingMore}
                    colorScheme="twitter"
                    variant="outline"
                  >
                    Load More
                  </Button>
                </Flex>
              )}
            </VStack>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default HomeTimeline; 