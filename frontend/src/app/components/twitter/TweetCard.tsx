'use client';

import React, { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Avatar,
  HStack,
  IconButton,
  Badge,
  Image,
  Link,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Textarea,
  Button,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  RepeatIcon,
  ChatIcon,
  StarIcon,
  ExternalLinkIcon,
  AttachmentIcon,
} from '@chakra-ui/icons';
import { Tweet } from './types';
import { formatDistanceToNow } from 'date-fns';

interface TweetCardProps {
  tweet: Tweet;
  onAction: (tweetId: string, action: string) => Promise<void>;
}

// Helper function to ensure avatar URLs are always available
const getAvatarUrl = (profileImageUrl?: string, username?: string): string => {
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

// Helper function to check if a video URL is directly playable
const isPlayableVideo = (url?: string, contentType?: string): boolean => {
  if (!url) return false;
  
  // Check if it's a direct video URL with a supported format
  const isDirectVideo = url.match(/\.(mp4|webm|ogg)(\?.*)?$/i) !== null;
  
  // Check if content type is a video type
  const isVideoType = contentType ? contentType.startsWith('video/') : false;
  
  // Check if it's not from a domain that typically blocks embedding
  const isNotBlockedDomain = !url.includes('video.twimg.com');
  
  return (isDirectVideo || isVideoType) && isNotBlockedDomain;
};

// Helper function to proxy any Twitter image URL
const getProxyImageUrl = (imageUrl?: string): string => {
  if (!imageUrl || imageUrl.trim() === '') {
    return '';
  }
  
  try {
    // Check if it's a Twitter URL
    if (imageUrl.includes('twimg.com')) {
      console.log(`Proxying Twitter media URL: ${imageUrl}`);
      
      // For video thumbnails, sometimes we need to handle special cases
      if (imageUrl.includes('ext_tw_video_thumb') || imageUrl.includes('amplify_video_thumb')) {
        // These are usually video thumbnails that might be blocked
        const encodedUrl = encodeURIComponent(imageUrl);
        const proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}&default=https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png`;
        console.log(`Using proxy URL for video thumbnail: ${proxyUrl}`);
        return proxyUrl;
      }
      
      // For other Twitter media
      const encodedUrl = encodeURIComponent(imageUrl);
      const proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}`;
      console.log(`Using proxy URL for media: ${proxyUrl}`);
      return proxyUrl;
    }
    
    // For non-Twitter URLs, still use the proxy to avoid potential CORS issues
    if (imageUrl.startsWith('http')) {
      const encodedUrl = encodeURIComponent(imageUrl);
      const proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}`;
      console.log(`Using proxy URL for non-Twitter media: ${proxyUrl}`);
      return proxyUrl;
    }
    
    // If it's a relative URL or doesn't start with http, return as is
    return imageUrl;
  } catch (error) {
    console.error('Error processing media URL:', error);
    // If there's an error processing the URL, return the original
    return imageUrl;
  }
};

const TweetCard: React.FC<TweetCardProps> = ({ tweet, onAction }) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // Format the tweet creation date
  const formattedDate = tweet.createdAt 
    ? formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true })
    : '';

  // Create a proper Twitter URL that ensures the ID is treated as a string
  const createTwitterUrl = (username: string, tweetId: string) => {
    // Ensure the ID is a string to avoid JavaScript number precision issues
    const id = String(tweetId);
    
    // Log the ID for debugging
    console.log(`Creating Twitter URL for tweet ID: ${id}`);
    
    // Check if the ID ends with '00' which seems to be problematic
    if (id.endsWith('00')) {
      console.log(`Warning: Tweet ID ${id} ends with '00', which may cause issues with Twitter's API`);
    }
    
    // Return the Twitter URL with the ID as a string
    return `https://twitter.com/${username}/status/${id}`;
  };

  // Handle like action
  const handleLike = async () => {
    const isLiked = tweet.metrics?.liked || false;
    // Ensure tweet ID is a string
    await onAction(String(tweet.id), isLiked ? 'unlike' : 'like');
  };

  // Handle retweet action
  const handleRetweet = async () => {
    const isRetweeted = tweet.metrics?.retweeted || false;
    // Ensure tweet ID is a string
    await onAction(String(tweet.id), isRetweeted ? 'unretweet' : 'retweet');
  };

  // Handle reply submission
  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      toast({
        title: 'Error',
        description: 'Reply cannot be empty',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/twitter/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweet_id: String(tweet.id), // Ensure tweet ID is a string
          text: replyText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send reply');
      }

      toast({
        title: 'Success',
        description: 'Your reply was sent successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setReplyText('');
      onClose();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send reply',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process tweet text to handle entities (mentions, hashtags, URLs)
  const renderTweetText = () => {
    if (!tweet.text) return null;
    
    const text = tweet.text;
    const entities = tweet.entities || {};
    const parts: Array<{
      type: string;
      content: string;
      username?: string;
      tag?: string;
      url?: string;
    }> = [];
    
    // Sort all entities by their indices
    const allEntities: Array<{
      type: string;
      start: number;
      end: number;
      username?: string;
      tag?: string;
      url?: string;
      expanded_url?: string;
      display_url?: string;
    }> = [];
    
    if (entities.mentions) {
      entities.mentions.forEach(mention => {
        allEntities.push({
          ...mention,
          type: 'mention',
        });
      });
    }
    
    if (entities.hashtags) {
      entities.hashtags.forEach(hashtag => {
        allEntities.push({
          ...hashtag,
          type: 'hashtag',
        });
      });
    }
    
    if (entities.urls) {
      entities.urls.forEach(url => {
        allEntities.push({
          ...url,
          type: 'url',
        });
      });
    }
    
    // Sort entities by start index
    allEntities.sort((a, b) => a.start - b.start);
    
    // Build the text parts
    let lastIndex = 0;
    
    allEntities.forEach(entity => {
      // Add text before the entity
      if (entity.start > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, entity.start),
        });
      }
      
      // Add the entity
      if (entity.type === 'mention' && entity.username) {
        parts.push({
          type: 'mention',
          content: `@${entity.username}`,
          username: entity.username,
        });
      } else if (entity.type === 'hashtag' && entity.tag) {
        parts.push({
          type: 'hashtag',
          content: `#${entity.tag}`,
          tag: entity.tag,
        });
      } else if (entity.type === 'url' && entity.url) {
        parts.push({
          type: 'url',
          content: entity.display_url || entity.url,
          url: entity.expanded_url || entity.url,
        });
      }
      
      lastIndex = entity.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }
    
    // Render the parts
    return (
      <>
        {parts.map((part, index) => {
          if (part.type === 'text') {
            return <React.Fragment key={index}>{part.content}</React.Fragment>;
          } else if (part.type === 'mention' && part.username) {
            return (
              <Link 
                key={index} 
                href={`https://twitter.com/${part.username}`} 
                color="twitter.500" 
                isExternal
              >
                {part.content}
              </Link>
            );
          } else if (part.type === 'hashtag' && part.tag) {
            return (
              <Link 
                key={index} 
                href={`https://twitter.com/hashtag/${part.tag}`} 
                color="twitter.500" 
                isExternal
              >
                {part.content}
              </Link>
            );
          } else if (part.type === 'url' && part.url) {
            return (
              <Link 
                key={index} 
                href={part.url} 
                color="twitter.500" 
                isExternal
              >
                {part.content} <ExternalLinkIcon mx="2px" />
              </Link>
            );
          }
          return null;
        })}
      </>
    );
  };

  return (
    <Box 
      borderWidth="1px" 
      borderRadius="md" 
      p={4} 
      bg="blackAlpha.400" 
      borderColor="whiteAlpha.200"
      _hover={{ bg: "blackAlpha.500" }}
      transition="background 0.2s"
    >
      {/* Retweeted by */}
      {tweet.retweetedBy && (
        <Flex align="center" mb={2} color="whiteAlpha.700" fontSize="sm">
          <RepeatIcon mr={2} />
          <Text>{tweet.retweetedBy.name} retweeted</Text>
        </Flex>
      )}
      
      {/* Tweet header */}
      <Flex mb={2}>
        <Avatar 
          src={getAvatarUrl(tweet.author.profileImageUrl, tweet.author.username)}
          name={tweet.author.name} 
          size="md" 
          mr={3} 
        />
        <Flex direction="column">
          <Flex align="center">
            <Text fontWeight="bold" mr={1}>{tweet.author.name}</Text>
            {tweet.author.verified && (
              <Badge colorScheme="twitter" variant="solid" fontSize="xs">
                ✓
              </Badge>
            )}
            <Text color="whiteAlpha.700" ml={2}>@{tweet.author.username}</Text>
            <Text color="whiteAlpha.600" ml={2} fontSize="sm">
              {formattedDate}
            </Text>
          </Flex>
          <Link 
            href={createTwitterUrl(tweet.author.username, tweet.id)} 
            isExternal 
            color="whiteAlpha.600"
            fontSize="xs"
            mt={1}
          >
            View on Twitter <ExternalLinkIcon mx="2px" />
          </Link>
        </Flex>
      </Flex>
      
      {/* Tweet content */}
      <Box mb={3} ml={12}>
        <Text mb={3}>{renderTweetText()}</Text>
        
        {/* Media attachments */}
        {tweet.media && tweet.media.length > 0 && (
          <Box mb={3} borderRadius="md" overflow="hidden">
            {tweet.media.map((item, index) => (
              <Box key={index} maxH="300px" overflow="hidden" borderRadius="md" position="relative">
                {item.type === 'photo' && item.url ? (
                  <Image 
                    src={getProxyImageUrl(item.url)} 
                    alt="Tweet media" 
                    maxH="300px" 
                    objectFit="cover" 
                    width="100%" 
                  />
                ) : item.type === 'video' ? (
                  // For videos, try to play them directly if possible
                  <Box position="relative">
                    {isPlayableVideo(item.url, item.content_type) ? (
                      <Box position="relative" width="100%" maxH="300px">
                        <video 
                          controls
                          preload="metadata"
                          {...(item.preview_image_url ? { poster: getProxyImageUrl(item.preview_image_url) } : {})}
                          style={{ maxHeight: '300px', width: '100%', objectFit: 'contain' }}
                          onClick={(e) => e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause()}
                        >
                          <source src={item.url} type={item.content_type || 'video/mp4'} />
                          Your browser does not support the video tag.
                        </video>
                        <Box 
                          position="absolute" 
                          top="50%" 
                          left="50%" 
                          transform="translate(-50%, -50%)" 
                          bg="blackAlpha.700" 
                          borderRadius="full" 
                          width="60px" 
                          height="60px" 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center"
                          opacity="0.8"
                          _hover={{ opacity: 1 }}
                          pointerEvents="none"
                          className="video-play-button"
                        >
                          <Box 
                            as="span" 
                            borderLeft="20px solid white" 
                            borderTop="12px solid transparent" 
                            borderBottom="12px solid transparent" 
                            ml={1}
                          />
                        </Box>
                      </Box>
                    ) : item.preview_image_url ? (
                      <Image 
                        src={getProxyImageUrl(item.preview_image_url)} 
                        alt="Video preview" 
                        maxH="300px" 
                        objectFit="cover" 
                        width="100%" 
                      />
                    ) : (
                      // Enhanced placeholder for videos without preview
                      <Flex
                        height="200px"
                        width="100%"
                        bg="gray.700"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                        p={4}
                        borderRadius="md"
                      >
                        <Box 
                          width="60px" 
                          height="60px" 
                          borderRadius="full" 
                          bg="blackAlpha.600" 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center"
                          mb={3}
                        >
                          <Box 
                            as="span" 
                            borderLeft="20px solid white" 
                            borderTop="12px solid transparent" 
                            borderBottom="12px solid transparent" 
                            ml={1}
                          />
                        </Box>
                        <Text color="white" fontWeight="bold" mb={1}>Video content</Text>
                        <Text color="whiteAlpha.700" fontSize="sm">Preview not available</Text>
                      </Flex>
                    )}
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="rgba(0, 0, 0, 0.6)"
                      justifyContent="center"
                      alignItems="center"
                      flexDirection="column"
                    >
                      <Text color="white" fontWeight="bold" mb={2}>Video content</Text>
                      <Link 
                        href={createTwitterUrl(tweet.author.username, tweet.id)}
                        isExternal
                        _hover={{ textDecoration: 'none' }}
                      >
                        <Button
                          leftIcon={<ExternalLinkIcon />}
                          colorScheme="twitter"
                          size="sm"
                        >
                          View on X.com
                        </Button>
                      </Link>
                    </Flex>
                  </Box>
                ) : item.type === 'animated_gif' ? (
                  // Handle GIFs - they often come as preview images too
                  <Box position="relative">
                    {item.preview_image_url ? (
                      <Image 
                        src={getProxyImageUrl(item.preview_image_url)} 
                        alt="GIF preview" 
                        maxH="300px" 
                        objectFit="cover" 
                        width="100%" 
                      />
                    ) : (
                      // Enhanced placeholder for GIFs without preview
                      <Flex
                        height="200px"
                        width="100%"
                        bg="gray.700"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                        p={4}
                        borderRadius="md"
                      >
                        <Text 
                          fontSize="2xl" 
                          fontWeight="bold" 
                          color="white" 
                          mb={2}
                          p={2}
                          border="2px solid white"
                          borderRadius="md"
                        >
                          GIF
                        </Text>
                        <Text color="whiteAlpha.700" fontSize="sm">Preview not available</Text>
                      </Flex>
                    )}
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="rgba(0, 0, 0, 0.6)"
                      justifyContent="center"
                      alignItems="center"
                      flexDirection="column"
                    >
                      <Text color="white" fontWeight="bold" mb={2}>GIF content</Text>
                      <Link 
                        href={createTwitterUrl(tweet.author.username, tweet.id)}
                        isExternal
                        _hover={{ textDecoration: 'none' }}
                      >
                        <Button
                          leftIcon={<ExternalLinkIcon />}
                          colorScheme="twitter"
                          size="sm"
                        >
                          View on X.com
                        </Button>
                      </Link>
                    </Flex>
                  </Box>
                ) : (
                  // Improved fallback for unsupported media types
                  <Box position="relative">
                    {item.preview_image_url ? (
                      <Image 
                        src={getProxyImageUrl(item.preview_image_url)} 
                        alt="Media preview" 
                        maxH="300px" 
                        objectFit="cover" 
                        width="100%" 
                      />
                    ) : (
                      // Enhanced placeholder for other media types without preview
                      <Flex
                        height="200px"
                        width="100%"
                        bg="gray.700"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                        p={4}
                        borderRadius="md"
                      >
                        <Box 
                          width="60px" 
                          height="60px" 
                          borderRadius="md" 
                          bg="blackAlpha.600" 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center"
                          mb={3}
                        >
                          <AttachmentIcon boxSize="30px" color="white" />
                        </Box>
                        <Text color="white" fontWeight="bold" mb={1}>
                          {item.type ? `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} content` : 'Media content'}
                        </Text>
                        <Text color="whiteAlpha.700" fontSize="sm">Preview not available</Text>
                      </Flex>
                    )}
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="rgba(0, 0, 0, 0.6)"
                      justifyContent="center"
                      alignItems="center"
                      flexDirection="column"
                    >
                      <Text color="white" fontWeight="bold" mb={2}>
                        {item.type ? `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} content` : 'Media content'}
                      </Text>
                      <Link 
                        href={createTwitterUrl(tweet.author.username, tweet.id)}
                        isExternal
                        _hover={{ textDecoration: 'none' }}
                      >
                        <Button
                          leftIcon={<ExternalLinkIcon />}
                          colorScheme="twitter"
                          size="sm"
                        >
                          View on X.com
                        </Button>
                      </Link>
                    </Flex>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
        
        {/* Quoted tweet */}
        {tweet.quotedTweet && (
          <Box 
            borderWidth="1px" 
            borderRadius="md" 
            p={3} 
            mb={3}
            borderColor="whiteAlpha.300"
            bg="blackAlpha.300"
          >
            <Flex mb={2}>
              <Avatar 
                src={getAvatarUrl(tweet.quotedTweet.author.profileImageUrl, tweet.quotedTweet.author.username)}
                name={tweet.quotedTweet.author.name} 
                size="sm" 
                mr={2} 
              />
              <Flex direction="column">
                <Flex align="center">
                  <Text fontWeight="bold" fontSize="sm" mr={1}>
                    {tweet.quotedTweet.author.name}
                  </Text>
                  {tweet.quotedTweet.author.verified && (
                    <Badge colorScheme="twitter" variant="solid" fontSize="xs">
                      ✓
                    </Badge>
                  )}
                  <Text color="whiteAlpha.700" ml={1} fontSize="xs">
                    @{tweet.quotedTweet.author.username}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            
            <Text fontSize="sm" mb={2}>
              {tweet.quotedTweet.text}
            </Text>
            
            {/* Quoted tweet media */}
            {tweet.quotedTweet.media && tweet.quotedTweet.media.length > 0 && (
              <Box borderRadius="md" overflow="hidden">
                {tweet.quotedTweet.media[0].type === 'photo' && tweet.quotedTweet.media[0].url ? (
                  <Image 
                    src={getProxyImageUrl(tweet.quotedTweet.media[0].url)} 
                    alt="Quoted tweet media" 
                    maxH="150px" 
                    objectFit="cover" 
                    width="100%" 
                  />
                ) : tweet.quotedTweet.media[0].type === 'video' || tweet.quotedTweet.media[0].type === 'animated_gif' ? (
                  <Box position="relative">
                    {isPlayableVideo(tweet.quotedTweet.media[0].url, tweet.quotedTweet.media[0].content_type) ? (
                      <Box position="relative" width="100%" maxH="150px">
                        <video 
                          controls
                          preload="metadata"
                          {...(tweet.quotedTweet.media[0].preview_image_url ? { poster: getProxyImageUrl(tweet.quotedTweet.media[0].preview_image_url) } : {})}
                          style={{ maxHeight: '150px', width: '100%', objectFit: 'contain' }}
                          onClick={(e) => e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause()}
                        >
                          <source src={tweet.quotedTweet.media[0].url} type={tweet.quotedTweet.media[0].content_type || 'video/mp4'} />
                          Your browser does not support the video tag.
                        </video>
                        <Box 
                          position="absolute" 
                          top="50%" 
                          left="50%" 
                          transform="translate(-50%, -50%)" 
                          bg="blackAlpha.700" 
                          borderRadius="full" 
                          width="40px" 
                          height="40px" 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center"
                          opacity="0.8"
                          _hover={{ opacity: 1 }}
                          pointerEvents="none"
                          className="video-play-button"
                        >
                          <Box 
                            as="span" 
                            borderLeft="15px solid white" 
                            borderTop="9px solid transparent" 
                            borderBottom="9px solid transparent" 
                            ml={1}
                          />
                        </Box>
                      </Box>
                    ) : tweet.quotedTweet.media[0].preview_image_url ? (
                      <Image 
                        src={getProxyImageUrl(tweet.quotedTweet.media[0].preview_image_url)} 
                        alt="Quoted tweet video preview" 
                        maxH="150px" 
                        objectFit="cover" 
                        width="100%" 
                      />
                    ) : (
                      // Enhanced placeholder for quoted tweet videos/GIFs without preview
                      <Flex
                        height="100px"
                        width="100%"
                        bg="gray.700"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                        p={2}
                        borderRadius="md"
                      >
                        <Box 
                          width="30px" 
                          height="30px" 
                          borderRadius="full" 
                          bg="blackAlpha.600" 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center"
                          mb={1}
                        >
                          {tweet.quotedTweet.media[0].type === 'video' ? (
                            <Box 
                              as="span" 
                              borderLeft="10px solid white" 
                              borderTop="6px solid transparent" 
                              borderBottom="6px solid transparent" 
                              ml={1}
                            />
                          ) : (
                            <Text fontSize="xs" fontWeight="bold" color="white">GIF</Text>
                          )}
                        </Box>
                        <Text color="white" fontSize="xs" mb={1}>
                          {tweet.quotedTweet.media[0].type === 'video' ? 'Video' : 'GIF'} content
                        </Text>
                      </Flex>
                    )}
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="rgba(0, 0, 0, 0.6)"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Link 
                        href={createTwitterUrl(tweet.quotedTweet.author.username, tweet.quotedTweet.id)}
                        isExternal
                        _hover={{ textDecoration: 'none' }}
                      >
                        <Button
                          leftIcon={<ExternalLinkIcon />}
                          colorScheme="twitter"
                          size="xs"
                        >
                          View on X.com
                        </Button>
                      </Link>
                    </Flex>
                  </Box>
                ) : (
                  // Improved fallback for unsupported media types in quoted tweets
                  <Box position="relative">
                    {tweet.quotedTweet.media[0].preview_image_url ? (
                      <Image 
                        src={getProxyImageUrl(tweet.quotedTweet.media[0].preview_image_url)} 
                        alt="Media preview" 
                        maxH="150px" 
                        objectFit="cover" 
                        width="100%" 
                      />
                    ) : (
                      // Enhanced placeholder for other media types without preview
                      <Flex
                        height="100px"
                        width="100%"
                        bg="gray.700"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                        p={2}
                        borderRadius="md"
                      >
                        <Box 
                          width="30px" 
                          height="30px" 
                          borderRadius="md" 
                          bg="blackAlpha.600" 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center"
                          mb={1}
                        >
                          <AttachmentIcon boxSize="15px" color="white" />
                        </Box>
                        <Text color="white" fontSize="xs" textAlign="center">
                          {tweet.quotedTweet.media[0].type 
                            ? `${tweet.quotedTweet.media[0].type.charAt(0).toUpperCase() + tweet.quotedTweet.media[0].type.slice(1)}` 
                            : 'Media'} content
                        </Text>
                      </Flex>
                    )}
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="rgba(0, 0, 0, 0.6)"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Link 
                        href={createTwitterUrl(tweet.quotedTweet.author.username, tweet.quotedTweet.id)}
                        isExternal
                        _hover={{ textDecoration: 'none' }}
                      >
                        <Button
                          leftIcon={<ExternalLinkIcon />}
                          colorScheme="twitter"
                          size="xs"
                        >
                          View on X.com
                        </Button>
                      </Link>
                    </Flex>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
        
        {/* Tweet actions */}
        <HStack spacing={4} mt={2}>
          <IconButton
            aria-label="Reply"
            icon={<ChatIcon />}
            variant="ghost"
            colorScheme="twitter"
            size="sm"
            onClick={onOpen}
          />
          <Flex align="center">
            <IconButton
              aria-label="Retweet"
              icon={<RepeatIcon />}
              variant="ghost"
              colorScheme={tweet.metrics?.retweeted ? "green" : "twitter"}
              size="sm"
              onClick={handleRetweet}
            />
            {tweet.metrics?.retweet_count !== undefined && tweet.metrics.retweet_count > 0 && (
              <Text ml={1} fontSize="sm" color="whiteAlpha.700">
                {tweet.metrics.retweet_count}
              </Text>
            )}
          </Flex>
          <Flex align="center">
            <IconButton
              aria-label="Like"
              icon={<StarIcon />}
              variant="ghost"
              colorScheme={tweet.metrics?.liked ? "pink" : "twitter"}
              size="sm"
              onClick={handleLike}
            />
            {tweet.metrics?.like_count !== undefined && tweet.metrics.like_count > 0 && (
              <Text ml={1} fontSize="sm" color="whiteAlpha.700">
                {tweet.metrics.like_count}
              </Text>
            )}
          </Flex>
        </HStack>
      </Box>
      
      {/* Reply modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white">
          <ModalHeader>Reply to @{tweet.author.username}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Flex>
                <Avatar 
                  src={getAvatarUrl(tweet.author.profileImageUrl, tweet.author.username)}
                  name={tweet.author.name} 
                  size="sm" 
                  mr={2} 
                />
                <Box>
                  <Text fontWeight="bold" fontSize="sm">
                    {tweet.author.name}
                    <Text as="span" fontWeight="normal" color="whiteAlpha.700" ml={1}>
                      @{tweet.author.username}
                    </Text>
                  </Text>
                  <Text fontSize="sm" mt={1}>{tweet.text}</Text>
                </Box>
              </Flex>
              
              <Textarea
                placeholder="Tweet your reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                size="md"
                resize="vertical"
                minH="100px"
                bg="gray.800"
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: "whiteAlpha.400" }}
                _focus={{ borderColor: "twitter.500" }}
              />
              
              <Flex justify="flex-end">
                <Button
                  colorScheme="twitter"
                  isLoading={isSubmitting}
                  onClick={handleReplySubmit}
                  isDisabled={!replyText.trim()}
                >
                  Reply
                </Button>
              </Flex>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TweetCard; 