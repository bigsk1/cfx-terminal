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
} from '@chakra-ui/icons';
import { Tweet } from './types';
import { formatDistanceToNow } from 'date-fns';

interface TweetCardProps {
  tweet: Tweet;
  onAction: (tweetId: string, action: string) => Promise<void>;
}

const TweetCard: React.FC<TweetCardProps> = ({ tweet, onAction }) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Format the tweet creation date
  const formattedDate = tweet.createdAt 
    ? formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true })
    : '';

  // Handle like action
  const handleLike = async () => {
    const isLiked = tweet.metrics?.liked || false;
    await onAction(tweet.id, isLiked ? 'unlike' : 'like');
  };

  // Handle retweet action
  const handleRetweet = async () => {
    const isRetweeted = tweet.metrics?.retweeted || false;
    await onAction(tweet.id, isRetweeted ? 'unretweet' : 'retweet');
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
          tweet_id: tweet.id,
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
    
    let text = tweet.text;
    const entities = tweet.entities || {};
    const parts = [];
    
    // Sort all entities by their indices
    const allEntities = [];
    
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
      if (entity.type === 'mention') {
        parts.push({
          type: 'mention',
          content: `@${entity.username}`,
          username: entity.username,
        });
      } else if (entity.type === 'hashtag') {
        parts.push({
          type: 'hashtag',
          content: `#${entity.tag}`,
          tag: entity.tag,
        });
      } else if (entity.type === 'url') {
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
          } else if (part.type === 'mention') {
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
          } else if (part.type === 'hashtag') {
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
          } else if (part.type === 'url') {
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
          src={tweet.author.profileImageUrl} 
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
            href={`https://twitter.com/${tweet.author.username}/status/${tweet.id}`} 
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
                {item.type === 'photo' ? (
                  <Image 
                    src={item.url} 
                    alt="Tweet media" 
                    maxH="300px" 
                    objectFit="cover" 
                    width="100%" 
                  />
                ) : item.type === 'video' ? (
                  // Check if we have a valid video URL or just a preview image
                  item.url && item.url.includes('video') ? (
                    <Box 
                      as="video" 
                      controls 
                      src={item.url} 
                      maxH="300px" 
                      width="100%" 
                      objectFit="cover"
                    />
                  ) : (
                    // For pic.x.com links that are likely videos but we only have preview image
                    <Box position="relative">
                      <Image 
                        src={item.url} 
                        alt="Video preview" 
                        maxH="300px" 
                        objectFit="cover" 
                        width="100%" 
                      />
                      <Flex
                        position="absolute"
                        top="0"
                        left="0"
                        right="0"
                        bottom="0"
                        bg="blackAlpha.600"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                      >
                        <Text color="white" fontWeight="bold" mb={2}>Video content</Text>
                        <Link 
                          href={`https://twitter.com/${tweet.author.username}/status/${tweet.id}`}
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
                  )
                ) : item.type === 'animated_gif' ? (
                  // Handle GIFs - they often come as preview images too
                  <Box position="relative">
                    <Image 
                      src={item.url} 
                      alt="GIF preview" 
                      maxH="300px" 
                      objectFit="cover" 
                      width="100%" 
                    />
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="blackAlpha.600"
                      justifyContent="center"
                      alignItems="center"
                      flexDirection="column"
                    >
                      <Text color="white" fontWeight="bold" mb={2}>GIF content</Text>
                      <Link 
                        href={`https://twitter.com/${tweet.author.username}/status/${tweet.id}`}
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
                  // Fallback for other media types
                  <Box position="relative">
                    <Image 
                      src={item.url} 
                      alt="Tweet media" 
                      maxH="300px" 
                      objectFit="cover" 
                      width="100%" 
                    />
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="blackAlpha.600"
                      justifyContent="center"
                      alignItems="center"
                      flexDirection="column"
                    >
                      <Text color="white" fontWeight="bold" mb={2}>Media content</Text>
                      <Link 
                        href={`https://twitter.com/${tweet.author.username}/status/${tweet.id}`}
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
                src={tweet.quotedTweet.author.profileImageUrl} 
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
            
            {tweet.quotedTweet.media && tweet.quotedTweet.media.length > 0 && (
              <Box borderRadius="md" overflow="hidden">
                {tweet.quotedTweet.media[0].type === 'photo' ? (
                  <Image 
                    src={tweet.quotedTweet.media[0].url} 
                    alt="Quoted tweet media" 
                    maxH="150px" 
                    objectFit="cover" 
                    width="100%" 
                  />
                ) : tweet.quotedTweet.media[0].type === 'video' || tweet.quotedTweet.media[0].type === 'animated_gif' ? (
                  <Box position="relative">
                    <Image 
                      src={tweet.quotedTweet.media[0].url} 
                      alt="Quoted tweet video preview" 
                      maxH="150px" 
                      objectFit="cover" 
                      width="100%" 
                    />
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      bg="blackAlpha.600"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Link 
                        href={`https://twitter.com/${tweet.quotedTweet.author.username}/status/${tweet.quotedTweet.id}`}
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
                  <Image 
                    src={tweet.quotedTweet.media[0].url} 
                    alt="Quoted tweet media" 
                    maxH="150px" 
                    objectFit="cover" 
                    width="100%" 
                  />
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
            {(tweet.metrics?.retweet_count > 0) && (
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
            {(tweet.metrics?.like_count > 0) && (
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
                  src={tweet.author.profileImageUrl} 
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