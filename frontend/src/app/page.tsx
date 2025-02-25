'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, Container, Text, Input, Button, Textarea, 
  VStack, HStack, Image, Divider, useToast, 
  Switch, FormControl, FormLabel, Badge, Flex,
  IconButton, Spinner, useColorModeValue,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Code, Tooltip, Select, Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import { 
  ChatIcon, EditIcon, CheckIcon, CloseIcon, 
  AttachmentIcon, RepeatIcon, ExternalLinkIcon,
  CopyIcon, ArrowForwardIcon, AddIcon, ViewIcon,
  ArrowUpIcon, ArrowDownIcon, DeleteIcon, ChevronDownIcon, StarIcon
} from '@chakra-ui/icons';

// CloudflareImageCard component for better performance
const CloudflareImageCard = ({ 
  image, 
  isSelected, 
  primaryColor, 
  onSelect,
  onSelectForThread
}: { 
  image: { id: string; url: string; uploaded: string; }; 
  isSelected: boolean; 
  primaryColor: string;
  onSelect: (url: string) => void;
  onSelectForThread?: (url: string) => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageTitle, setImageTitle] = useState(`Image ${image.id.substring(0, 8)}...`);
  const [showOptions, setShowOptions] = useState(false);

  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Attempt to load the image on mount
  useEffect(() => {
    // Create image element with proper typing
    const img = new (window.Image || Image)();
    img.onload = () => {
      if (isMounted.current) {
        setIsLoading(false);
        setHasError(false);
      }
    };
    img.onerror = () => {
      if (isMounted.current) {
        setIsLoading(false);
        setHasError(true);
        console.warn(`Failed to load image: ${image.url}`);
      }
    };
    img.src = image.url;
    
    // Format a nicer title from the image ID
    const formattedId = image.id.split('-')[0];
    setImageTitle(`Image ${formattedId}`);
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [image.url, image.id]);

  return (
    <Box 
      position="relative" 
      borderRadius="md" 
      overflow="hidden"
      width="150px"
      height="150px"
      cursor="pointer"
      onClick={() => {
        if (onSelectForThread) {
          setShowOptions(!showOptions);
        } else {
          onSelect(image.url);
        }
      }}
      border={isSelected ? "2px solid" : "1px solid"}
      borderColor={isSelected ? primaryColor : "whiteAlpha.300"}
      bg="blackAlpha.400"
      onMouseLeave={() => setShowOptions(false)}
    >
      {/* Loading spinner */}
      {isLoading && (
        <Box 
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blackAlpha.300"
          zIndex="1"
        >
          <Spinner size="sm" color={primaryColor} />
        </Box>
      )}
      
      {/* Image */}
      <Box
        width="100%"
        height="100%"
        position="relative"
        zIndex="2"
      >
        {!hasError ? (
          <Image 
            src={image.url} 
            alt={`Image ${image.id}`}
            width="100%"
            height="100%"
            objectFit="cover"
            loading="lazy"
            crossOrigin="anonymous"
            onError={() => setHasError(true)}
            onLoad={() => setIsLoading(false)}
            style={{ opacity: isLoading ? 0 : 1 }}
            transition="opacity 0.3s ease"
          />
        ) : (
          <Box
            width="100%"
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="gray.700"
            color="whiteAlpha.700"
            fontSize="xs"
            textAlign="center"
            p={2}
          >
            <VStack spacing={1}>
              <Text>Image not available</Text>
              <Text fontSize="9px" opacity={0.7}>{image.id}</Text>
            </VStack>
          </Box>
        )}
      </Box>
      
      {/* Date overlay */}
      <Box 
        position="absolute" 
        bottom={0} 
        left={0} 
        right={0}
        bg="blackAlpha.700"
        p={1}
        fontSize="xs"
        zIndex="3"
      >
        <Text noOfLines={1}>
          {new Date(image.uploaded).toLocaleDateString()}
        </Text>
      </Box>
      
      {/* Selected indicator */}
      {isSelected && (
        <Box 
          position="absolute" 
          top={2} 
          right={2}
          bg={primaryColor}
          borderRadius="full"
          p={1}
          zIndex="3"
        >
          <CheckIcon boxSize={3} />
        </Box>
      )}

      {/* Thread selection options */}
      {showOptions && onSelectForThread && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.800"
          zIndex={10}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          p={2}
        >
          <VStack spacing={2}>
            <Button 
              size="xs" 
              colorScheme="blue" 
              width="100%" 
              onClick={(e) => {
                e.stopPropagation();
                onSelect(image.url);
                setShowOptions(false);
              }}
            >
              Main Tweet
            </Button>
            <Button 
              size="xs" 
              colorScheme="green" 
              width="100%" 
              onClick={(e) => {
                e.stopPropagation();
                onSelectForThread(image.url);
                setShowOptions(false);
              }}
            >
              Thread Tweet
            </Button>
            <Button 
              size="xs" 
              colorScheme="gray" 
              width="100%" 
              onClick={(e) => {
                e.stopPropagation();
                setShowOptions(false);
              }}
            >
              Cancel
            </Button>
          </VStack>
        </Box>
      )}
    </Box>
  );
};

// TweetPreviewImage component
const TweetPreviewImage = ({ 
  url, 
  onRemove 
}: { 
  url: string;
  onRemove: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <>
      {isLoading && (
        <Box 
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blackAlpha.300"
          zIndex="1"
          borderRadius="md"
        >
          <Spinner size="md" color="#2cb67d" />
        </Box>
      )}
      <Image 
        src={url} 
        alt="Tweet image" 
        borderRadius="md"
        maxH="200px"
        objectFit="cover"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        fallbackSrc={hasError ? 
          "https://via.placeholder.com/400x200?text=Error+Loading+Image" : 
          "https://via.placeholder.com/400x200?text=Loading..."
        }
        zIndex="2"
        position="relative"
      />
      <HStack position="absolute" top={2} right={2} zIndex="3">
        <Tooltip label="Remove image">
          <IconButton
            aria-label="Remove image"
            size="sm"
            icon={<CloseIcon />}
            colorScheme="red"
            onClick={onRemove}
          />
        </Tooltip>
      </HStack>
    </>
  );
};

export default function Home() {
  // State
  const [messages, setMessages] = useState<Array<any>>([
    { role: 'system', content: 'Welcome to CFX-Terminal. How can I help craft your tweet today?' }
  ]);
  const [input, setInput] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [threads, setThreads] = useState<string[]>([]);
  const [threadImages, setThreadImages] = useState<(string | null)[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isWideImage, setIsWideImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingTweet, setIsGeneratingTweet] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [textModel, setTextModel] = useState('Loading...');
  const [imageModel, setImageModel] = useState('Loading...');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedImageModel, setSelectedImageModel] = useState<string>('');
  const [isChatMode, setIsChatMode] = useState(false);
  const [postedTweets, setPostedTweets] = useState<Array<{id: string, text: string, timestamp: string, threadIds: string[]}>>([]);
  const [cloudflareImages, setCloudflareImages] = useState<Array<{id: string, url: string, uploaded: string}>>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isLoadingMoreImages, setIsLoadingMoreImages] = useState(false);
  const [cloudflareImagesPagination, setCloudflareImagesPagination] = useState({
    total: 0,
    page: 1,
    limit: 40,
    has_more: false
  });
  const [userName, setUserName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [selectedThreadIndex, setSelectedThreadIndex] = useState<number | null>(null);
  const [cloudflareExpiration, setCloudflareExpiration] = useState('never');
  const [videoPreview, setVideoPreview] = useState<{ tweetIndex: number; url: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; timestamp: string; model?: string }>>([]); // Add model field
  const [xaiAvailable, setXaiAvailable] = useState<boolean>(false);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('cfx-chat-messages');
    const savedUserName = localStorage.getItem('cfx-user-name');
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
      }
    }
    
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cfx-chat-messages', JSON.stringify(messages));
  }, [messages]);

  // Save username to localStorage whenever it changes
  useEffect(() => {
    if (userName) {
      localStorage.setItem('cfx-user-name', userName);
    }
  }, [userName]);

  // Fetch model information on component mount
  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        const response = await fetch('/api/model-info');
        if (response.ok) {
          const data = await response.json();
          setTextModel(data.text_model);
          setImageModel(data.image_model);
          setAvailableModels(data.available_models || []);
          setXaiAvailable(data.xai_available || false);
          
          // Use the default model from the API if available
          if (data.default_model) {
            setSelectedModel(data.default_model);
          } else {
            setSelectedModel(data.text_model); // Fallback to text_model
          }
          
          // Set default image model
          setSelectedImageModel(data.image_model);
          
          // Log available models for debugging
          console.log('Available models:', data.available_models);
          console.log('xAI available:', data.xai_available);
        }
      } catch (error) {
        console.error('Error fetching model info:', error);
      }
    };
    
    fetchModelInfo();
  }, []);

  // Update character count
  useEffect(() => {
    setCharacterCount(tweetText.length);
  }, [tweetText]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear chat history
  const handleClearChat = () => {
    // Keep only the welcome message
    const welcomeMessage = { role: 'system', content: 'Welcome to CFX-Terminal. How can I help craft your tweet today?' };
    setMessages([welcomeMessage]);
    
    toast({
      title: 'Chat cleared',
      description: 'Your chat history has been cleared',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Extract user name from messages
  useEffect(() => {
    // Look for messages where the user introduces themselves
    const nameIntroRegex = /(?:my name is|i am|i'm|call me) (\w+)/i;
    
    for (const message of messages) {
      if (message.role === 'user') {
        const match = message.content.match(nameIntroRegex);
        if (match && match[1]) {
          // Extract the name and capitalize first letter
          const extractedName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
          setUserName(extractedName);
          break;
        }
      }
    }
  }, [messages]);

  // Send message to AI
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Show thinking state
    setIsGeneratingTweet(true);
    
    try {
      if (isChatMode) {
        // Call backend for regular chat
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            userName: userName, // Include user name if available
            model: selectedModel, // Include selected model
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to get response');
        }

        const data = await response.json();
        
        // Add AI response to chat
        const aiMessage = { 
          role: 'assistant', 
          content: data.response
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Call backend to generate tweet
        const response = await fetch('/api/craft-tweet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: input,
            include_image: false,
            userName: userName, // Include user name if available
            model: selectedModel, // Include selected model
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to generate tweet');
        }

        const data = await response.json();
        
        // Add AI response to chat
        const aiMessage = { 
          role: 'assistant', 
          content: 'Here\'s a tweet based on your request:',
          tweetData: {
            text: data.text,
            threads: data.threads || []
          }
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Update tweet preview
        setTweetText(data.text);
        
        // Initialize thread images array with nulls for each thread
        const threadImagesArray = Array(data.threads?.length || 0).fill(null);
        
        // Update threads and thread images
        setThreads(data.threads || []);
        setThreadImages(threadImagesArray);
        
        // Log for debugging
        console.log("Received threads:", data.threads);
        console.log("Updated threads state:", data.threads || []);
      }
    } catch (error: any) {
      // Add error message to chat
      const errorMessage = { 
        role: 'assistant', 
        content: `Error: ${error.message}. Please try again.` 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGeneratingTweet(false);
    }
  };

  // Handle image generation
  const handleGenerateImage = async () => {
    if (!imagePrompt) {
      toast({
        title: 'Image prompt required',
        description: 'Please enter a prompt for the image generation',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsGeneratingImage(true);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          wide: isWideImage,
          // Remove model selection - always use DALL-E
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setImageUrl(data.url);
      
      // Log which model was used
      console.log(`Image generated using model: ${data.model}`);
      
      toast({
        title: 'Image generated',
        description: 'Successfully generated image using DALL-E',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Add to generated images history
      setGeneratedImages(prev => [
        { 
          url: data.url, 
          timestamp: new Date().toISOString(),
          model: data.model
        }, 
        ...prev
      ]);
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: 'Error generating image',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Upload to Cloudflare
  const handleCloudflareUpload = async () => {
    if (!imageUrl) return;
    
    try {
      const uploadMessage = { 
        role: 'user', 
        content: `Upload this image to Cloudflare with expiration: ${cloudflareExpiration}` 
      };
      setMessages(prev => [...prev, uploadMessage]);
      
      // Show loading state
      toast({
        title: 'Uploading...',
        description: `Uploading image to Cloudflare (${cloudflareExpiration === 'never' ? 'No expiration' : `Expires in ${cloudflareExpiration}`})`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      
      const response = await fetch('/api/upload-to-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_url: imageUrl,
          expiration: cloudflareExpiration
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload to Cloudflare');
      }
      
      const data = await response.json();
      
      // Update the image URL to the Cloudflare URL
      setImageUrl(data.cloudflare_url);
      
      const successMessage = { 
        role: 'assistant', 
        content: 'Image successfully uploaded to Cloudflare:',
        imageUrl: data.cloudflare_url
      };
      setMessages(prev => [...prev, successMessage]);
      
      toast({
        title: 'Success',
        description: 'Image uploaded to Cloudflare',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh the Cloudflare gallery
      await fetchCloudflareImages(1, false);
      
      // Switch to the Cloudflare Gallery tab
      const galleryTabIndex = 4; // Index of the Cloudflare Gallery tab
      const tabsElement = document.querySelector('.chakra-tabs__tablist');
      if (tabsElement) {
        const tabs = tabsElement.querySelectorAll('button[role="tab"]');
        if (tabs && tabs.length > galleryTabIndex) {
          (tabs[galleryTabIndex] as HTMLElement).click();
        }
      }
    } catch (error: any) {
      const errorMessage = { 
        role: 'assistant', 
        content: `Error uploading to Cloudflare: ${error.message}` 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Add a new tweet to the thread
  const addThreadTweet = () => {
    setThreads([...threads, '']);
    setThreadImages([...threadImages, null]);
  };

  // Remove a tweet from the thread
  const removeThreadTweet = (index: number) => {
    const newThreads = [...threads];
    newThreads.splice(index, 1);
    setThreads(newThreads);
    
    const newThreadImages = [...threadImages];
    newThreadImages.splice(index, 1);
    setThreadImages(newThreadImages);
  };

  // Update a thread tweet text
  const updateThreadTweet = (index: number, text: string) => {
    const newThreads = [...threads];
    newThreads[index] = text;
    setThreads(newThreads);
    
    // Check if the text contains a YouTube URL
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.*\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = text.match(youtubeRegex);
    
    if (match && match[1]) {
      // Set video preview for this tweet
      setVideoPreview({ tweetIndex: index, url: getEmbedUrl(text) });
    } else if (videoPreview && videoPreview.tweetIndex === index) {
      // Clear video preview if no longer contains YouTube URL
      setVideoPreview(null);
    }
  };

  // Set image for a specific thread tweet
  const setThreadImage = (index: number, url: string | null) => {
    const newThreadImages = [...threadImages];
    newThreadImages[index] = url;
    setThreadImages(newThreadImages);
  };

  // Move a thread tweet up
  const moveThreadTweetUp = (index: number) => {
    if (index <= 0) return;
    
    const newThreads = [...threads];
    const newThreadImages = [...threadImages];
    
    // Swap with previous item
    [newThreads[index], newThreads[index - 1]] = [newThreads[index - 1], newThreads[index]];
    [newThreadImages[index], newThreadImages[index - 1]] = [newThreadImages[index - 1], newThreadImages[index]];
    
    setThreads(newThreads);
    setThreadImages(newThreadImages);
  };

  // Move a thread tweet down
  const moveThreadTweetDown = (index: number) => {
    if (index >= threads.length - 1) return;
    
    const newThreads = [...threads];
    const newThreadImages = [...threadImages];
    
    // Swap with next item
    [newThreads[index], newThreads[index + 1]] = [newThreads[index + 1], newThreads[index]];
    [newThreadImages[index], newThreadImages[index + 1]] = [newThreadImages[index + 1], newThreadImages[index]];
    
    setThreads(newThreads);
    setThreadImages(newThreadImages);
  };

  // Post tweet
  const handlePostTweet = async () => {
    if (!tweetText) {
      toast({
        title: 'Tweet required',
        description: 'Please generate or enter a tweet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsPosting(true);
    
    try {
      const postMessage = { 
        role: 'user', 
        content: 'Post this tweet to Twitter' 
      };
      setMessages(prev => [...prev, postMessage]);
      
      // Prepare thread data with images
      const threadData = threads.map((text, index) => ({
        text,
        image_url: threadImages[index]
      }));
      
      const response = await fetch('/api/post-tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetText,
          threads,
          thread_images: threadImages,
          image_url: imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to post tweet');
      }

      const data = await response.json();
      
      // Store the posted tweet ID for potential deletion later
      const tweetIds = data.tweet_ids || [data.tweet_id];
      const mainTweetId = tweetIds[0];
      
      // Store all tweet IDs in the thread
      setPostedTweets(prev => [...prev, { 
        id: mainTweetId, 
        text: tweetText.substring(0, 50) + (tweetText.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString(),
        threadIds: tweetIds
      }]);
      
      const successMessage = { 
        role: 'assistant', 
        content: `Tweet successfully posted! Tweet ID: ${mainTweetId}${tweetIds.length > 1 ? ` (Thread with ${tweetIds.length} tweets)` : ''}`,
        tweetId: mainTweetId,
        threadIds: tweetIds
      };
      setMessages(prev => [...prev, successMessage]);
      
      toast({
        title: 'Success',
        description: tweetIds.length > 1 ? 'Your thread has been posted' : 'Your tweet has been posted',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset tweet data but keep the chat history
      setTweetText('');
      setThreads([]);
      setThreadImages([]);
      setImageUrl(null);
      setImagePrompt('');
      
    } catch (error: any) {
      const errorMessage = { 
        role: 'assistant', 
        content: `Error posting tweet: ${error.message}` 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Delete tweet
  const handleDeleteTweet = async (tweetId: string) => {
    if (!tweetId) return;
    
    setIsDeleting(true);
    
    try {
      // Find the posted tweet to get all thread IDs
      const postedTweet = postedTweets.find(tweet => tweet.id === tweetId);
      const threadIds = postedTweet?.threadIds || [tweetId];
      
      // Delete each tweet in the thread
      for (const id of threadIds) {
        const deleteMessage = { 
          role: 'user', 
          content: `Delete tweet with ID: ${id}` 
        };
        setMessages(prev => [...prev, deleteMessage]);
        
        const response = await fetch('/api/delete-tweet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tweet_id: id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to delete tweet ${id}`);
        }
        
        await response.json();
      }
      
      // Remove the tweet from the posted tweets list
      setPostedTweets(prev => prev.filter(tweet => tweet.id !== tweetId));
      
      const successMessage = { 
        role: 'assistant', 
        content: threadIds.length > 1 
          ? `Thread with ${threadIds.length} tweets successfully deleted!` 
          : `Tweet ${tweetId} successfully deleted!` 
      };
      setMessages(prev => [...prev, successMessage]);
      
      toast({
        title: 'Success',
        description: threadIds.length > 1 ? 'Your thread has been deleted' : 'Your tweet has been deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      const errorMessage = { 
        role: 'assistant', 
        content: `Error deleting tweet: ${error.message}` 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch Cloudflare images
  const fetchCloudflareImages = async (page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setIsLoadingImages(true);
    } else {
      setIsLoadingMoreImages(true);
    }
    
    try {
      console.log(`Fetching Cloudflare images, page ${page}, append: ${append}`);
      
      const response = await fetch(`/api/cloudflare-images?limit=40&page=${page}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch Cloudflare images');
      }
      
      const data = await response.json();
      console.log('Cloudflare images response:', data);
      
      // Filter out any images that might not be valid
      const validImages = data.images || [];
      
      // Log image details for debugging
      if (validImages.length > 0) {
        console.log('First image details:', validImages[0]);
        console.log('Image URL format example:', validImages[0].url);
      } else {
        console.warn('No images returned from Cloudflare');
      }
      
      // Update pagination info
      setCloudflareImagesPagination(data.pagination || {
        total: validImages.length,
        page: page,
        limit: 40,
        has_more: false
      });
      
      // Either append to existing images or replace them
      if (append) {
        setCloudflareImages(prev => [...prev, ...validImages]);
      } else {
        setCloudflareImages(validImages);
      }
      
      toast({
        title: 'Success',
        description: `Loaded ${validImages.length} images from Cloudflare`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Pre-validate the first few images
      if (validImages.length > 0) {
        // Validate the first 5 images in the background
        const imagesToValidate = validImages.slice(0, 5);
        console.log(`Pre-validating ${imagesToValidate.length} images`);
        
        // Don't await this, let it run in the background
        Promise.all(
          imagesToValidate.map((image: {id: string; url: string; uploaded: string}) => checkImageUrl(image.url))
        ).then(results => {
          const validCount = results.filter(Boolean).length;
          console.log(`Pre-validation complete: ${validCount}/${imagesToValidate.length} images are valid`);
        });
      }
    } catch (error: any) {
      console.error('Error fetching Cloudflare images:', error);
      
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      if (page === 1) {
        setIsLoadingImages(false);
      } else {
        setIsLoadingMoreImages(false);
      }
    }
  };

  // Load more Cloudflare images
  const loadMoreCloudflareImages = () => {
    if (cloudflareImagesPagination.has_more) {
      const nextPage = cloudflareImagesPagination.page + 1;
      fetchCloudflareImages(nextPage, true);
    }
  };

  // Check if an image URL is valid with caching
  const imageValidationCache = new Map<string, boolean>();
  
  const checkImageUrl = async (url: string): Promise<boolean> => {
    // Check cache first
    if (imageValidationCache.has(url)) {
      return imageValidationCache.get(url) || false;
    }
    
    try {
      console.log(`Validating image URL: ${url}`);
      
      // Simple check for obviously invalid URLs
      if (!url || !url.startsWith('http')) {
        console.warn(`Invalid URL format: ${url}`);
        imageValidationCache.set(url, false);
        return false;
      }
      
      // Use the backend check
      const response = await fetch('/api/check-cloudflare-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_url: url }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Image validation response:', data);
        
        const isValid = data.exists && data.is_image;
        
        // Cache the result
        imageValidationCache.set(url, isValid);
        
        if (!isValid && data.reason) {
          console.warn(`Image validation failed: ${data.reason}`);
        }
        
        return isValid;
      }
      
      console.error('Image validation request failed');
      return false;
    } catch (error) {
      console.error('Error checking image URL:', error);
      return false;
    }
  };

  // Preload image with timeout and caching
  const imagePreloadCache = new Map<string, boolean>();
  
  const preloadImage = (url: string): Promise<boolean> => {
    // Check cache first
    if (imagePreloadCache.has(url)) {
      return Promise.resolve(imagePreloadCache.get(url) || false);
    }
    
    return new Promise<boolean>((resolve) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log('Image preload timed out:', url);
        imagePreloadCache.set(url, false);
        resolve(false);
      }, 5000);
      
      // Create image element with proper typing
      const img = new (window.Image || Image)();
      img.onload = () => {
        clearTimeout(timeout);
        imagePreloadCache.set(url, true);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        imagePreloadCache.set(url, false);
        resolve(false);
      };
      img.src = url;
    });
  };

  // Set image URL with validation
  const setValidatedImageUrl = async (url: string) => {
    // If the image is already selected, unselect it
    if (imageUrl === url) {
      setImageUrl(null);
      toast({
        title: 'Image unselected',
        description: 'Image removed from your tweet',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    
    // Show loading state
    const loadingToast = toast({
      title: 'Loading',
      description: 'Verifying image...',
      status: 'info',
      duration: null, // Keep it open until we're done
      isClosable: false,
    });
    
    try {
      // Check if the image is valid
      const isValid = await checkImageUrl(url);
      
      if (isValid) {
        // Try to preload the image
        const preloaded = await preloadImage(url);
        
        if (preloaded) {
          // Close the loading toast
          toast.close(loadingToast);
          
          // Set the image URL
          setImageUrl(url);
          
          // Show success message
          toast({
            title: 'Success',
            description: 'Image selected for your tweet',
            status: 'success',
            duration: 2000,
            isClosable: true,
          });
        } else {
          // Close the loading toast
          toast.close(loadingToast);
          
          toast({
            title: 'Error',
            description: 'Could not load the selected image',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        // Close the loading toast
        toast.close(loadingToast);
        
        toast({
          title: 'Error',
          description: 'The selected image is not accessible or invalid',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      // Close the loading toast
      toast.close(loadingToast);
      
      toast({
        title: 'Error',
        description: 'An error occurred while validating the image',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // UI color scheme (cyberpunk inspired)
  const colors = {
    bg: '#0f0e17',
    primary: '#7f5af0',
    secondary: '#2cb67d',
    accent: '#ff8906',
    text: '#fffffe',
    dark: '#16161a',
    card: '#242629',
    danger: '#e53170',
    warning: '#f9c846'
  };

  // Render message content
  const renderMessageContent = (message: any) => {
    if (message.tweetData) {
      return (
        <VStack align="stretch" spacing={2}>
          <Text>{message.content}</Text>
          <Box 
            border="1px solid" 
            borderColor="whiteAlpha.300" 
            borderRadius="md" 
            p={3}
            bg="blackAlpha.400"
          >
            <Text fontWeight="medium">{message.tweetData.text}</Text>
            <Text fontSize="xs" color="whiteAlpha.700" textAlign="right">
              {message.tweetData.text.length}/280
            </Text>
          </Box>
          {message.tweetData.threads && message.tweetData.threads.length > 0 && (
            <Text fontSize="sm" color="whiteAlpha.700">
              + {message.tweetData.threads.length} more tweets in thread
            </Text>
          )}
        </VStack>
      );
    } else if (message.imageUrl) {
      return (
        <VStack align="stretch" spacing={2}>
          <Text>{message.content}</Text>
          <Image 
            src={message.imageUrl} 
            alt="Generated image" 
            borderRadius="md"
            maxH="200px"
            objectFit="cover"
          />
        </VStack>
      );
    } else if (message.tweetId) {
      return (
        <VStack align="stretch" spacing={2}>
          <Text>{message.content}</Text>
          <HStack>
            <Button 
              size="xs" 
              colorScheme="red" 
              leftIcon={<CloseIcon />}
              onClick={() => handleDeleteTweet(message.tweetId)}
              isLoading={isDeleting}
            >
              Delete Tweet
            </Button>
          </HStack>
        </VStack>
      );
    } else {
      return <Text>{message.content}</Text>;
    }
  };

  // Handle selecting a thread image
  const handleSelectThreadImage = (index: number, url: string) => {
    setThreadImage(index, url);
    setSelectedThreadIndex(null);
  };

  // Get YouTube embed URL
  const getEmbedUrl = (url: string): string => {
    // Extract video ID from YouTube URL
    const videoId = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.*\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoId && videoId.length > 1) {
      return `https://www.youtube.com/embed/${videoId[1]}`;
    }
    return url;
  };

  // Style for YouTube iframe
  const iframeStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: "none"
  };

  // Improved function to split text into tweet-sized chunks
  const splitIntoThreads = (text: string, limit: number = 280): string[] => {
    // If text is already short enough, return it as a single tweet
    if (text.length <= limit) {
      return [text];
    }
    
    // Split by paragraphs first (double newlines)
    const paragraphs = text.split(/\n\s*\n/);
    const threads: string[] = [];
    let currentThread = '';
    
    for (const paragraph of paragraphs) {
      // If paragraph fits in current thread, add it
      if (currentThread.length + paragraph.length + (currentThread ? 2 : 0) <= limit) {
        currentThread = currentThread ? `${currentThread}\n\n${paragraph}` : paragraph;
      } 
      // If paragraph alone is too long, split by sentences
      else if (paragraph.length > limit) {
        // If we have content in the current thread, push it
        if (currentThread) {
          threads.push(currentThread);
          currentThread = '';
        }
        
        // Split by sentences
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let currentSentenceGroup = '';
        
        for (const sentence of sentences) {
          // If sentence fits in current group, add it
          if (currentSentenceGroup.length + sentence.length <= limit) {
            currentSentenceGroup += sentence;
          } 
          // If sentence alone is too long, split by words
          else if (sentence.length > limit) {
            // If we have content in the current group, push it
            if (currentSentenceGroup) {
              threads.push(currentSentenceGroup);
              currentSentenceGroup = '';
            }
            
            // Split by words
            const words = sentence.split(/\s+/);
            let currentWordGroup = '';
            
            for (const word of words) {
              if (currentWordGroup.length + word.length + (currentWordGroup ? 1 : 0) <= limit) {
                currentWordGroup = currentWordGroup ? `${currentWordGroup} ${word}` : word;
              } else {
                threads.push(currentWordGroup);
                currentWordGroup = word;
              }
            }
            
            // Add any remaining words
            if (currentWordGroup) {
              currentSentenceGroup = currentWordGroup;
            }
          } 
          // Start a new sentence group
          else {
            threads.push(currentSentenceGroup);
            currentSentenceGroup = sentence;
          }
        }
        
        // Add any remaining sentences
        if (currentSentenceGroup) {
          currentThread = currentSentenceGroup;
        }
      } 
      // Start a new thread with this paragraph
      else {
        threads.push(currentThread);
        currentThread = paragraph;
      }
    }
    
    // Add the last thread if there is one
    if (currentThread) {
      threads.push(currentThread);
    }
    
    return threads;
  };

  return (
    <Box bg={colors.bg} minH="100vh" color={colors.text}>
      <Container maxW="container.xl" py={4}>
        <VStack spacing={4} align="stretch" h="calc(100vh - 2rem)">
          <HStack justify="space-between" pb={2} borderBottom="1px solid" borderColor="whiteAlpha.200">
            <Text 
              fontSize="2xl" 
              fontWeight="bold" 
              bgGradient={`linear(to-r, ${colors.primary}, ${colors.secondary})`} 
              bgClip="text"
            >
              CFX-Terminal
            </Text>
            <HStack>
              {userName && (
                <Badge colorScheme="green" variant="solid">
                  User: {userName}
                </Badge>
              )}
              <Badge colorScheme="purple" variant="solid">v1.0</Badge>
              <Badge colorScheme="green" variant="outline">CONNECTED</Badge>
            </HStack>
          </HStack>

          <Flex flex="1" gap={4}>
            {/* Left panel - Chat */}
            <Box 
              w="50%" 
              bg={colors.card} 
              borderRadius="lg" 
              p={4}
              display="flex"
              flexDirection="column"
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="lg" fontWeight="semibold">Command Interface</Text>
                <HStack>
                  <FormControl display="flex" alignItems="center" width="auto">
                    <FormLabel htmlFor="chat-mode" mb="0" fontSize="xs">
                      Chat Mode
                    </FormLabel>
                    <Switch 
                      id="chat-mode" 
                      size="sm" 
                      colorScheme="purple"
                      isChecked={isChatMode}
                      onChange={(e) => setIsChatMode(e.target.checked)}
                    />
                  </FormControl>
                  
                  <Menu>
                    <MenuButton as={Button} size="xs" rightIcon={<ChevronDownIcon />}>
                      Options
                    </MenuButton>
                    <MenuList bg={colors.dark} borderColor="whiteAlpha.300" color={colors.text} boxShadow="md">
                      <MenuItem _hover={{ bg: 'whiteAlpha.200' }} color={colors.text} onClick={handleClearChat}>Clear Chat History</MenuItem>
                      {availableModels.length > 0 && (
                        <>
                          <Divider my={2} borderColor="whiteAlpha.300" />
                          <Box px={3} py={1}>
                            <Text fontSize="xs" mb={1} color="whiteAlpha.700">Select AI Model:</Text>
                            <Select 
                              size="xs" 
                              value={selectedModel} 
                              onChange={(e) => setSelectedModel(e.target.value)}
                              bg={colors.dark}
                              color={colors.text}
                              borderColor="whiteAlpha.300"
                            >
                              {/* Group OpenAI models */}
                              <optgroup label="OpenAI Models" style={{backgroundColor: colors.dark, color: "gray"}}>
                                {availableModels
                                  .filter(model => !model.startsWith('grok'))
                                  .map((model) => (
                                    <option key={model} value={model} style={{backgroundColor: colors.dark, color: colors.text}}>
                                      {model}
                                    </option>
                                  ))
                                }
                              </optgroup>
                              
                              {/* Group xAI models if available */}
                              {availableModels.some(model => model.startsWith('grok')) && (
                                <optgroup label="xAI Models" style={{backgroundColor: colors.dark, color: "gray"}}>
                                  {availableModels
                                    .filter(model => model.startsWith('grok'))
                                    .map((model) => (
                                      <option key={model} value={model} style={{backgroundColor: colors.dark, color: colors.text}}>
                                        {model === 'grok-2-1212' ? 'Grok-2' : model}
                                      </option>
                                    ))
                                  }
                                </optgroup>
                              )}
                            </Select>
                          </Box>
                        </>
                      )}
                    </MenuList>
                  </Menu>
                </HStack>
              </HStack>
              
              {/* Messages container */}
              <Box 
                flex="1" 
                overflowY="auto" 
                mb={4}
                css={{
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: colors.primary,
                    borderRadius: '24px',
                  },
                }}
              >
                <VStack spacing={4} align="stretch">
                  {messages.map((message, index) => (
                    <Box 
                      key={index}
                      alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
                      maxW="90%"
                      bg={message.role === 'user' ? colors.primary : colors.dark}
                      color={colors.text}
                      p={3}
                      borderRadius="lg"
                      borderTopRightRadius={message.role === 'user' ? 0 : 'lg'}
                      borderTopLeftRadius={message.role === 'user' ? 'lg' : 0}
                    >
                      {renderMessageContent(message)}
                    </Box>
                  ))}
                  {isGeneratingTweet && (
                    <Box 
                      alignSelf="flex-start"
                      maxW="90%"
                      bg={colors.dark}
                      color={colors.text}
                      p={3}
                      borderRadius="lg"
                      borderTopLeftRadius={0}
                    >
                      <HStack>
                        <Spinner size="sm" color={colors.secondary} />
                        <Text>Crafting your {isChatMode ? 'response' : 'tweet'}...</Text>
                      </HStack>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </VStack>
              </Box>
              
              {/* Input area */}
              <HStack>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isChatMode ? "Chat with AI..." : "Describe your tweet idea..."}
                  bg="whiteAlpha.100"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  _focus={{
                    borderColor: colors.primary,
                    boxShadow: `0 0 0 1px ${colors.primary}`
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <IconButton
                  aria-label="Send message"
                  icon={<ArrowForwardIcon />}
                  onClick={handleSendMessage}
                  isLoading={isGeneratingTweet}
                  colorScheme="purple"
                />
              </HStack>
            </Box>
            
            {/* Right panel - Tweet Preview & Controls */}
            <Box 
              w="50%" 
              bg={colors.card} 
              borderRadius="lg" 
              p={4}
              display="flex"
              flexDirection="column"
            >
              <Tabs variant="soft-rounded" colorScheme="purple" size="sm">
                <TabList>
                  <Tab>Tweet Preview</Tab>
                  <Tab>Image Generator</Tab>
                  <Tab>Thread View</Tab>
                  <Tab>Tweet History</Tab>
                  <Tab>Cloudflare Gallery</Tab>
                </TabList>
                
                <TabPanels flex="1">
                  {/* Tweet Preview Tab */}
                  <TabPanel h="100%">
                    <VStack spacing={4} align="stretch" h="100%">
                      <HStack justify="space-between">
                        <Text fontSize="lg" fontWeight="semibold">Tweet Preview</Text>
                        <Badge 
                          colorScheme={
                            characterCount > 260 ? "red" : 
                            characterCount > 200 ? "yellow" : 
                            "green"
                          }
                          variant="solid"
                        >
                          {characterCount}/280
                        </Badge>
                      </HStack>
                      
                      <Box 
                        flex="1"
                        border="1px solid" 
                        borderColor="whiteAlpha.300" 
                        borderRadius="md" 
                        p={4}
                        bg="blackAlpha.400"
                        display="flex"
                        flexDirection="column"
                        overflowY="auto"
                        maxH="calc(100vh - 250px)"
                      >
                        <Textarea
                          value={tweetText}
                          onChange={(e) => setTweetText(e.target.value)}
                          placeholder="Your tweet will appear here..."
                          size="md"
                          resize="none"
                          border="none"
                          bg="transparent"
                          _focus={{ border: "none" }}
                          flex="1"
                          mb={2}
                          minH="100px"
                        />
                        
                        {imageUrl && (
                          <Box position="relative" mt={2}>
                            <TweetPreviewImage 
                              url={imageUrl} 
                              onRemove={() => setImageUrl(null)} 
                            />
                          </Box>
                        )}
                      </Box>
                      
                      <HStack>
                        <Button
                          leftIcon={<EditIcon />}
                          colorScheme="twitter"
                          onClick={handlePostTweet}
                          isLoading={isPosting}
                          loadingText="Posting..."
                          flex="1"
                        >
                          Post to X
                        </Button>
                        <IconButton
                          aria-label="Clear tweet"
                          icon={<RepeatIcon />}
                          onClick={() => {
                            setTweetText('');
                            setImageUrl(null);
                            setThreads([]);
                          }}
                          colorScheme="gray"
                        />
                      </HStack>
                    </VStack>
                  </TabPanel>
                  
                  {/* Image Generation Tab */}
                  <TabPanel>
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>Image Prompt</FormLabel>
                        <Textarea 
                          placeholder="Describe the image you want to generate..."
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          size="md"
                          resize="vertical"
                          minH="100px"
                        />
                      </FormControl>
                      
                      <HStack>
                        <FormControl display="flex" alignItems="center">
                          <FormLabel htmlFor="wide-image" mb="0">
                            Wide Image
                          </FormLabel>
                          <Switch 
                            id="wide-image" 
                            isChecked={isWideImage}
                            onChange={(e) => setIsWideImage(e.target.checked)}
                            colorScheme="purple"
                          />
                        </FormControl>
                        
                        {/* Image Model Selector */}
                        <FormControl>
                          <FormLabel>Image Model</FormLabel>
                          <Select
                            value={imageModel}
                            size="sm"
                            bg={colors.dark}
                            color={colors.text}
                            borderColor="whiteAlpha.300"
                            isDisabled={true}
                          >
                            <option value={imageModel} style={{backgroundColor: colors.dark, color: colors.text}}>
                              {imageModel} (DALL-E)
                            </option>
                          </Select>
                        </FormControl>
                      </HStack>
                      
                      <Button
                        onClick={handleGenerateImage}
                        isLoading={isGeneratingImage}
                        loadingText="Generating..."
                        colorScheme="purple"
                        leftIcon={<StarIcon />}
                      >
                        Generate Image
                      </Button>
                      
                      {/* Display current image if available */}
                      {imageUrl && (
                        <Box 
                          mt={4} 
                          borderRadius="md" 
                          overflow="hidden"
                          borderWidth="1px"
                          borderColor="whiteAlpha.300"
                        >
                          <Image 
                            src={imageUrl} 
                            alt="Generated image" 
                            width="100%" 
                            height="auto"
                          />
                          
                          <HStack justify="space-between" p={2} bg="blackAlpha.300">
                            <Button
                              size="sm"
                              leftIcon={<CheckIcon />}
                              onClick={() => {
                                // Add to generated images
                                setGeneratedImages([
                                  ...generatedImages,
                                  { url: imageUrl, timestamp: new Date().toISOString(), model: imageModel }
                                ]);
                                
                                // Set the image for the tweet
                                setImageUrl(imageUrl);
                                
                                toast({
                                  title: 'Image added to tweet',
                                  status: 'success',
                                  duration: 2000,
                                  isClosable: true,
                                });
                              }}
                            >
                              Use in Tweet
                            </Button>
                            
                            <HStack>
                              <Select
                                size="sm"
                                value={cloudflareExpiration}
                                onChange={(e) => setCloudflareExpiration(e.target.value)}
                                width="120px"
                                mr={2}
                              >
                                <option value="never">Never expire</option>
                                <option value="24h">24 hours</option>
                                <option value="30d">30 days</option>
                              </Select>
                              
                              <Button
                                size="sm"
                                leftIcon={<AttachmentIcon />}
                                colorScheme="blue"
                                onClick={handleCloudflareUpload}
                              >
                                Save to Cloudflare
                              </Button>
                              
                              <Button
                                size="sm"
                                leftIcon={<CloseIcon />}
                                variant="outline"
                                onClick={() => setImageUrl(null)}
                              >
                                Remove
                              </Button>
                            </HStack>
                          </HStack>
                        </Box>
                      )}
                      
                      {/* Previously generated images */}
                      {generatedImages.length > 0 && (
                        <Box mt={4}>
                          <Text fontSize="sm" mb={2}>Previously Generated Images:</Text>
                          <Flex wrap="wrap" gap={4}>
                            {generatedImages.map((image, index) => (
                              <Box 
                                key={index}
                                position="relative" 
                                borderRadius="md" 
                                overflow="hidden"
                                width="150px"
                                height="150px"
                                border="1px solid"
                                borderColor="whiteAlpha.300"
                              >
                                <Image 
                                  src={image.url} 
                                  alt={`Generated image ${index}`}
                                  width="100%"
                                  height="100%"
                                  objectFit="cover"
                                />
                                
                                <HStack 
                                  position="absolute" 
                                  top={1} 
                                  right={1}
                                  zIndex={3}
                                >
                                  <Tooltip label="Use this image">
                                    <IconButton
                                      aria-label="Use this image"
                                      icon={<CheckIcon />}
                                      size="xs"
                                      colorScheme="green"
                                      onClick={() => {
                                        setImageUrl(image.url);
                                        toast({
                                          title: 'Image selected',
                                          description: 'Image set as current image',
                                          status: 'success',
                                          duration: 2000,
                                          isClosable: true,
                                        });
                                      }}
                                    />
                                  </Tooltip>
                                  
                                  <Tooltip label="Remove">
                                    <IconButton
                                      aria-label="Remove image"
                                      icon={<CloseIcon />}
                                      size="xs"
                                      colorScheme="red"
                                      onClick={() => {
                                        // Remove from generated images
                                        const newGeneratedImages = [...generatedImages];
                                        newGeneratedImages.splice(index, 1);
                                        setGeneratedImages(newGeneratedImages);
                                      }}
                                    />
                                  </Tooltip>
                                </HStack>
                                
                                <Box
                                  position="absolute" 
                                  bottom={0} 
                                  left={0} 
                                  right={0}
                                  bg="blackAlpha.700"
                                  p={1}
                                >
                                  <Text fontSize="xs">
                                    {new Date(image.timestamp).toLocaleTimeString()}
                                  </Text>
                                  {image.model && (
                                    <Text fontSize="xs" color="whiteAlpha.700">
                                      {image.model.startsWith('grok') ? 'Grok' : 'DALL-E'}
                                    </Text>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Flex>
                        </Box>
                      )}
                    </VStack>
                  </TabPanel>
                  
                  {/* Thread View Tab */}
                  <TabPanel>
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between">
                        <Text fontSize="lg" fontWeight="semibold">Thread View</Text>
                        <HStack>
                          <Button 
                            size="xs" 
                            leftIcon={<AddIcon />} 
                            onClick={addThreadTweet}
                            colorScheme="green"
                          >
                            Add Tweet
                          </Button>
                        </HStack>
                      </HStack>
                      
                      {/* Main Tweet (First Tweet) */}
                      <Box 
                        border="1px solid" 
                        borderColor="whiteAlpha.300" 
                        borderRadius="md" 
                        p={4}
                        bg="blackAlpha.400"
                        position="relative"
                      >
                        <HStack justify="space-between" mb={2}>
                          <Badge colorScheme="blue">Main Tweet</Badge>
                        </HStack>
                        
                        <Textarea
                          value={tweetText}
                          onChange={(e) => {
                            setTweetText(e.target.value);
                            
                            // Check if the text contains a YouTube URL
                            const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.*\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
                            const match = e.target.value.match(youtubeRegex);
                            
                            if (match && match[1]) {
                              // Set video preview for main tweet
                              setVideoPreview({ tweetIndex: -1, url: getEmbedUrl(e.target.value) });
                            } else if (videoPreview && videoPreview.tweetIndex === -1) {
                              // Clear video preview if no longer contains YouTube URL
                              setVideoPreview(null);
                            }
                          }}
                          placeholder="Main tweet..."
                          size="sm"
                          resize="vertical"
                          minH="80px"
                        />
                        
                        <Text fontSize="xs" textAlign="right" mt={1}>
                          {tweetText.length}/280
                        </Text>
                        
                        {/* YouTube preview for main tweet */}
                        {videoPreview && videoPreview.tweetIndex === -1 && (
                          <Box mt={2} position="relative" paddingTop="56.25%" width="100%">
                            <iframe 
                              src={videoPreview.url} 
                              title="YouTube video player" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                              style={iframeStyle}
                            />
                          </Box>
                        )}
                        
                        {/* Main tweet image */}
                        {imageUrl && (
                          <Box mt={2} position="relative">
                            <TweetPreviewImage 
                              url={imageUrl} 
                              onRemove={() => setImageUrl(null)} 
                            />
                          </Box>
                        )}
                        
                        {/* Add image button for main tweet */}
                        {!imageUrl && (
                          <HStack mt={2} spacing={2}>
                            <Button
                              size="xs"
                              leftIcon={<AttachmentIcon />}
                              onClick={() => {
                                // Switch to Image Generator tab
                                const tabsElement = document.querySelector('.chakra-tabs__tablist');
                                if (tabsElement) {
                                  const tabs = tabsElement.querySelectorAll('button[role="tab"]');
                                  if (tabs && tabs.length > 1) {
                                    (tabs[1] as HTMLElement).click();
                                  }
                                }
                              }}
                            >
                              Generate Image
                            </Button>
                            <Button
                              size="xs"
                              leftIcon={<ViewIcon />}
                              colorScheme="blue"
                              onClick={() => {
                                // Set selectedThreadIndex to -1 to indicate main tweet
                                setSelectedThreadIndex(-1);
                              }}
                            >
                              Select from Gallery
                            </Button>
                          </HStack>
                        )}
                      </Box>
                      
                      {/* Thread Tweets */}
                      {threads.length === 0 ? (
                        <Box 
                          p={4} 
                          borderRadius="md" 
                          bg="blackAlpha.400" 
                          textAlign="center"
                        >
                          <Text>No thread tweets yet. Add tweets to create a thread.</Text>
                        </Box>
                      ) : (
                        <VStack spacing={4} align="stretch">
                          {threads.map((thread, index) => (
                            <Box 
                              key={index}
                              border="1px solid" 
                              borderColor="whiteAlpha.300" 
                              borderRadius="md" 
                              p={4}
                              bg="blackAlpha.400"
                              position="relative"
                            >
                              <HStack justify="space-between" mb={2}>
                                <Badge colorScheme="purple">Tweet {index + 2}</Badge>
                                <HStack>
                                  <IconButton
                                    aria-label="Move up"
                                    icon={<ArrowUpIcon />}
                                    size="xs"
                                    isDisabled={index === 0}
                                    onClick={() => moveThreadTweetUp(index)}
                                  />
                                  <IconButton
                                    aria-label="Move down"
                                    icon={<ArrowDownIcon />}
                                    size="xs"
                                    isDisabled={index === threads.length - 1}
                                    onClick={() => moveThreadTweetDown(index)}
                                  />
                                  <IconButton
                                    aria-label="Remove thread tweet"
                                    icon={<DeleteIcon />}
                                    size="xs"
                                    colorScheme="red"
                                    onClick={() => removeThreadTweet(index)}
                                  />
                                </HStack>
                              </HStack>
                              
                              <Textarea
                                value={thread}
                                onChange={(e) => {
                                  updateThreadTweet(index, e.target.value);
                                }}
                                placeholder={`Thread tweet ${index + 2}...`}
                                size="sm"
                                resize="vertical"
                                minH="80px"
                              />
                              
                              <Text fontSize="xs" textAlign="right" mt={1}>
                                {thread.length}/280
                              </Text>
                              
                              {/* YouTube preview */}
                              {videoPreview && videoPreview.tweetIndex === index && (
                                <Box mt={2} position="relative" paddingTop="56.25%" width="100%">
                                  <iframe 
                                    src={videoPreview.url} 
                                    title="YouTube video player" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    style={iframeStyle}
                                  />
                                </Box>
                              )}
                              
                              {/* Thread image */}
                              {threadImages[index] && (
                                <Box mt={2} position="relative">
                                  <TweetPreviewImage 
                                    url={threadImages[index] as string} 
                                    onRemove={() => setThreadImage(index, null)} 
                                  />
                                </Box>
                              )}
                              
                              {/* Add image button */}
                              {!threadImages[index] && (
                                <Button
                                  size="xs"
                                  leftIcon={<AttachmentIcon />}
                                  mt={2}
                                  onClick={() => setSelectedThreadIndex(index)}
                                >
                                  Add Image
                                </Button>
                              )}
                              
                              {/* Thread image selection modal */}
                              {selectedThreadIndex === index && (
                                <Box
                                  position="absolute"
                                  top="0"
                                  left="0"
                                  right="0"
                                  bottom="0"
                                  bg="blackAlpha.900"
                                  zIndex="10"
                                  p={4}
                                  borderRadius="md"
                                >
                                  <VStack spacing={4} align="stretch">
                                    <HStack justify="space-between">
                                      <Text>Select an image for this tweet</Text>
                                      <IconButton
                                        aria-label="Close"
                                        icon={<CloseIcon />}
                                        size="xs"
                                        onClick={() => setSelectedThreadIndex(null)}
                                      />
                                    </HStack>
                                    
                                    <Flex wrap="wrap" gap={2} maxHeight="400px" overflowY="auto">
                                      {generatedImages.map((image, imgIndex) => (
                                        <Box 
                                          key={imgIndex}
                                          borderRadius="md" 
                                          overflow="hidden"
                                          width="100px"
                                          height="100px"
                                          cursor="pointer"
                                          onClick={() => handleSelectThreadImage(index, image.url)}
                                          border="1px solid"
                                          borderColor="whiteAlpha.300"
                                        >
                                          <Image 
                                            src={image.url} 
                                            alt={`Generated image ${imgIndex}`}
                                            width="100%"
                                            height="100%"
                                            objectFit="cover"
                                          />
                                        </Box>
                                      ))}
                                      
                                      {cloudflareImages.map((image) => (
                                        <Box 
                                          key={image.id}
                                          borderRadius="md" 
                                          overflow="hidden"
                                          width="100px"
                                          height="100px"
                                          cursor="pointer"
                                          onClick={() => handleSelectThreadImage(index, image.url)}
                                          border="1px solid"
                                          borderColor="whiteAlpha.300"
                                        >
                                          <Image 
                                            src={image.url} 
                                            alt={`Cloudflare image ${image.id}`}
                                            width="100%"
                                            height="100%"
                                            objectFit="cover"
                                          />
                                        </Box>
                                      ))}
                                    </Flex>
                                  </VStack>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                    
                    {/* Add Thread Tweet Button */}
                    <Button
                      leftIcon={<AddIcon />}
                      onClick={addThreadTweet}
                      mt={4}
                      mb={4}
                      width="full"
                    >
                      Add Thread Tweet
                    </Button>
                    
                    {/* Post to X Button at bottom of Thread View */}
                    <Box 
                      borderWidth="1px" 
                      borderRadius="lg" 
                      p={4} 
                      mb={4}
                      bg="blackAlpha.400"
                    >
                      <VStack spacing={4} align="stretch">
                        <Text fontWeight="bold" fontSize="lg">Ready to post your thread?</Text>
                        
                        <Button
                          leftIcon={<ExternalLinkIcon />}
                          colorScheme="twitter"
                          size="lg"
                          isLoading={isPosting}
                          onClick={handlePostTweet}
                          width="full"
                        >
                          Post to X
                        </Button>
                        
                        <Text fontSize="sm" color="gray.500">
                          This will post your main tweet and all {threads.length} thread {threads.length === 1 ? 'tweet' : 'tweets'} to X (Twitter).
                        </Text>
                      </VStack>
                    </Box>
                  </TabPanel>
                  
                  {/* Main tweet image selection modal */}
                  {selectedThreadIndex === -1 && (
                    <Box
                      position="fixed"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      bg="blackAlpha.900"
                      zIndex="100"
                      p={4}
                      borderRadius="md"
                      width="80%"
                      maxWidth="800px"
                      maxHeight="80vh"
                      overflowY="auto"
                    >
                      <VStack spacing={4} align="stretch">
                        <HStack justify="space-between">
                          <Text>Select an image for main tweet</Text>
                          <IconButton
                            aria-label="Close"
                            icon={<CloseIcon />}
                            size="xs"
                            onClick={() => setSelectedThreadIndex(null)}
                          />
                        </HStack>
                        
                        <Flex wrap="wrap" gap={2} maxHeight="60vh" overflowY="auto">
                          {generatedImages.map((image, imgIndex) => (
                            <Box 
                              key={imgIndex}
                              borderRadius="md" 
                              overflow="hidden"
                              width="100px"
                              height="100px"
                              cursor="pointer"
                              onClick={() => {
                                setImageUrl(image.url);
                                setSelectedThreadIndex(null);
                              }}
                              border="1px solid"
                              borderColor="whiteAlpha.300"
                            >
                              <Image 
                                src={image.url} 
                                alt={`Generated image ${imgIndex}`}
                                width="100%"
                                height="100%"
                                objectFit="cover"
                              />
                            </Box>
                          ))}
                          
                          {cloudflareImages.map((image) => (
                            <Box 
                              key={image.id}
                              borderRadius="md" 
                              overflow="hidden"
                              width="100px"
                              height="100px"
                              cursor="pointer"
                              onClick={() => {
                                setImageUrl(image.url);
                                setSelectedThreadIndex(null);
                              }}
                              border="1px solid"
                              borderColor="whiteAlpha.300"
                            >
                              <Image 
                                src={image.url} 
                                alt={`Cloudflare image ${image.id}`}
                                width="100%"
                                height="100%"
                                objectFit="cover"
                              />
                            </Box>
                          ))}
                        </Flex>
                      </VStack>
                    </Box>
                  )}
                  
                  {/* Tweet History Tab */}
                  <TabPanel>
                    <VStack spacing={4} align="stretch">
                      <Text fontSize="lg" fontWeight="semibold">Tweet History</Text>
                      
                      {postedTweets.length === 0 ? (
                        <Box 
                          p={4} 
                          borderRadius="md" 
                          bg="blackAlpha.400" 
                          textAlign="center"
                        >
                          <Text>No tweets posted yet. Post a tweet to see it here.</Text>
                        </Box>
                      ) : (
                        <VStack spacing={4} align="stretch">
                          {postedTweets.map((tweet, index) => (
                            <Box 
                              key={index}
                              border="1px solid" 
                              borderColor="whiteAlpha.300" 
                              borderRadius="md" 
                              p={4}
                              bg="blackAlpha.400"
                            >
                              <HStack justify="space-between" mb={2}>
                                <Badge colorScheme="green">
                                  {new Date(tweet.timestamp).toLocaleString()}
                                </Badge>
                                <HStack>
                                  <IconButton
                                    aria-label="Delete tweet"
                                    icon={<DeleteIcon />}
                                    size="xs"
                                    colorScheme="red"
                                    onClick={() => handleDeleteTweet(tweet.id)}
                                    isLoading={isDeleting}
                                  />
                                </HStack>
                              </HStack>
                              
                              <Text>{tweet.text}</Text>
                              
                              {tweet.threadIds && tweet.threadIds.length > 1 && (
                                <Badge mt={2} colorScheme="purple">
                                  Thread with {tweet.threadIds.length} tweets
                                </Badge>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  </TabPanel>
                  
                  {/* Cloudflare Gallery Tab */}
                  <TabPanel>
                    <VStack spacing={4} align="stretch">
                      <HStack justify="space-between">
                        <Text fontSize="lg" fontWeight="semibold">Cloudflare Gallery</Text>
                        <HStack>
                          <Button 
                            size="xs" 
                            leftIcon={<RepeatIcon />} 
                            onClick={() => fetchCloudflareImages(1, false)}
                            isLoading={isLoadingImages}
                          >
                            Refresh
                          </Button>
                        </HStack>
                      </HStack>
                      
                      {isLoadingImages ? (
                        <Box 
                          display="flex" 
                          justifyContent="center" 
                          alignItems="center" 
                          height="200px"
                        >
                          <Spinner size="xl" color={colors.primary} />
                        </Box>
                      ) : cloudflareImages.length === 0 ? (
                        <Box 
                          p={4} 
                          borderRadius="md" 
                          bg="blackAlpha.400" 
                          textAlign="center"
                        >
                          <Text>No images found in your Cloudflare account.</Text>
                          <Text fontSize="sm" mt={2}>
                            Generate an image and click "Save to Cloudflare" to add images.
                          </Text>
                        </Box>
                      ) : (
                        <>
                          <Box maxHeight="calc(100vh - 250px)" overflowY="auto" pr={2}>
                            <Flex wrap="wrap" gap={4}>
                              {cloudflareImages.map((image) => (
                                <CloudflareImageCard
                                  key={image.id}
                                  image={image}
                                  isSelected={imageUrl === image.url}
                                  primaryColor={colors.primary}
                                  onSelect={(url) => setValidatedImageUrl(url)}
                                  onSelectForThread={selectedThreadIndex !== null ? 
                                    (url) => handleSelectThreadImage(selectedThreadIndex, url) : 
                                    undefined}
                                />
                              ))}
                            </Flex>
                          </Box>
                          
                          {cloudflareImagesPagination.has_more && (
                            <Button 
                              mt={4} 
                              onClick={loadMoreCloudflareImages}
                              isLoading={isLoadingMoreImages}
                              width="100%"
                            >
                              Load More Images
                            </Button>
                          )}
                        </>
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </Flex>
          
          <HStack justify="space-between" pt={2} borderTop="1px solid" borderColor="whiteAlpha.200">
            <Text fontSize="xs" color="whiteAlpha.600">
              CFX-Terminal v1.0 • X Interface
            </Text>
            <HStack spacing={4}>
              <Text fontSize="xs" color="whiteAlpha.600">
                API Status: <Text as="span" color={colors.secondary}>Online</Text>
              </Text>
              <Tooltip label={`Model: ${selectedModel}`}>
                <Text fontSize="xs" color="whiteAlpha.600">
                  Current Model: <Text as="span" color={colors.accent}>
                    {selectedModel.startsWith('grok') ? 'xAI Grok' : selectedModel}
                  </Text>
                </Text>
              </Tooltip>
              <Text fontSize="xs" color="whiteAlpha.600">
                Image Model: <Text as="span" color={colors.accent}>{imageModel}</Text>
              </Text>
            </HStack>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}
