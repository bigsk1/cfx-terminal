export interface TweetAuthor {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
  verified?: boolean;
}

export interface TweetMedia {
  type: string;
  url: string;
  preview_image_url?: string;
  media_key?: string;
  alt_text?: string;
  duration_ms?: number;
  height?: number;
  width?: number;
  content_type?: string;
  variants?: Array<{
    bit_rate?: number;
    content_type: string;
    url: string;
  }>;
}

export interface TweetMetrics {
  retweet_count?: number;
  reply_count?: number;
  like_count?: number;
  quote_count?: number;
  retweeted?: boolean;
  liked?: boolean;
}

export interface TweetEntities {
  mentions?: Array<{
    start: number;
    end: number;
    username: string;
    id: string;
  }>;
  hashtags?: Array<{
    start: number;
    end: number;
    tag: string;
  }>;
  urls?: Array<{
    start: number;
    end: number;
    url: string;
    expanded_url: string;
    display_url: string;
  }>;
}

export interface QuotedTweet {
  id: string;
  text: string;
  createdAt: string;
  author: TweetAuthor;
  media?: TweetMedia[];
  metrics?: TweetMetrics;
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  author: TweetAuthor;
  retweetedBy?: {
    id: string;
    name: string;
    username: string;
    profileImageUrl?: string;
  } | null;
  quotedTweet?: QuotedTweet | null;
  media?: TweetMedia[];
  metrics?: TweetMetrics;
  entities?: TweetEntities;
}

export interface TimelineResponse {
  data: Tweet[];
  meta?: {
    result_count: number;
    next_token?: string;
    previous_token?: string;
  };
}

export interface TweetActionRequest {
  tweet_id: string;
  action: 'like' | 'unlike' | 'retweet' | 'unretweet';
}

export interface ReplyTweetRequest {
  tweet_id: string;
  text: string;
  media_id?: string;
}

export interface PostTweetRequest {
  text: string;
  media?: File;
  reply_to_tweet_id?: string;
} 