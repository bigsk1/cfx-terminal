'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Flex,
  Textarea,
  Button,
  Avatar,
  Text,
  IconButton,
  useToast,
  Progress,
  Image,
  CloseButton,
} from '@chakra-ui/react';
import { AttachmentIcon } from '@chakra-ui/icons';

interface TweetComposerProps {
  onTweetPosted: () => void;
  initialText?: string;
  replyToTweetId?: string;
}

const MAX_TWEET_LENGTH = 280;

const TweetComposer: React.FC<TweetComposerProps> = ({
  onTweetPosted,
  initialText = '',
  replyToTweetId,
}) => {
  const [tweetText, setTweetText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Calculate remaining characters
  const remainingChars = MAX_TWEET_LENGTH - tweetText.length;
  const isOverLimit = remainingChars < 0;
  
  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTweetText(e.target.value);
  };

  // Handle media file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Only image files are supported',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 5MB',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      setMediaFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle media removal
  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle tweet submission
  const handleSubmit = async () => {
    if (!tweetText.trim() && !mediaFile) {
      toast({
        title: 'Empty tweet',
        description: 'Please enter some text or add media to your tweet',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (isOverLimit) {
      toast({
        title: 'Tweet too long',
        description: `Your tweet exceeds the ${MAX_TWEET_LENGTH} character limit`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create form data for the request
      const formData = new FormData();
      formData.append('text', tweetText);
      
      if (replyToTweetId) {
        formData.append('reply_to_tweet_id', replyToTweetId);
      }
      
      if (mediaFile) {
        formData.append('media', mediaFile);
      }
      
      // Send the request
      const response = await fetch('/api/twitter/post-tweet', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to post tweet');
      }
      
      // Reset form
      setTweetText('');
      handleRemoveMedia();
      
      // Notify parent component
      onTweetPosted();
    } catch (error) {
      console.error('Error posting tweet:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to post tweet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Flex mb={4}>
        <Avatar 
          size="md" 
          mr={3}
          name="You"
          src="https://images.weserv.nl/?url=https%3A%2F%2Funavatar.io%2Fyou&default=avatar"
          bg="twitter.500"
          color="white"
          fontWeight="bold"
        />
        <Box flex="1">
          <Textarea
            placeholder="What's happening?"
            value={tweetText}
            onChange={handleTextChange}
            size="md"
            resize="vertical"
            minH="100px"
            bg="transparent"
            border="none"
            _focus={{ border: 'none', boxShadow: 'none' }}
            color="white"
            fontSize="lg"
          />
          
          {/* Media preview */}
          {mediaPreview && (
            <Box 
              position="relative" 
              mt={2} 
              borderRadius="md" 
              overflow="hidden"
              maxW="100%"
              maxH="300px"
            >
              <Image 
                src={mediaPreview} 
                alt="Tweet media" 
                maxH="300px"
                objectFit="contain"
              />
              <CloseButton
                position="absolute"
                top={2}
                right={2}
                bg="blackAlpha.700"
                color="white"
                onClick={handleRemoveMedia}
                _hover={{ bg: "blackAlpha.800" }}
              />
            </Box>
          )}
          
          {/* Character count and progress */}
          <Flex justify="flex-end" mt={2} align="center">
            <Box width="50px" mr={2}>
              <Progress
                value={(tweetText.length / MAX_TWEET_LENGTH) * 100}
                size="xs"
                colorScheme={
                  remainingChars > 50 
                    ? "twitter" 
                    : remainingChars > 20 
                      ? "yellow" 
                      : "red"
                }
                borderRadius="full"
              />
            </Box>
            <Text 
              fontSize="sm" 
              color={
                remainingChars > 50 
                  ? "whiteAlpha.700" 
                  : remainingChars > 20 
                    ? "yellow.500" 
                    : "red.500"
              }
              mr={4}
            >
              {remainingChars}
            </Text>
          </Flex>
        </Box>
      </Flex>
      
      <Flex justify="space-between" align="center" borderTopWidth="1px" pt={3} borderColor="whiteAlpha.200">
        <Box>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <IconButton
            aria-label="Attach media"
            icon={<AttachmentIcon />}
            size="sm"
            variant="ghost"
            colorScheme="twitter"
            onClick={() => fileInputRef.current?.click()}
            isDisabled={isSubmitting || !!mediaFile}
          />
        </Box>
        
        <Button
          colorScheme="twitter"
          isLoading={isSubmitting}
          onClick={handleSubmit}
          isDisabled={isSubmitting || (tweetText.trim() === '' && !mediaFile) || isOverLimit}
        >
          Tweet
        </Button>
      </Flex>
    </Box>
  );
};

export default TweetComposer; 