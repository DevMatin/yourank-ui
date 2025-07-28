# 🕷️ Website Crawler Feature with Smart Fallback

## Overview
The website crawler feature automatically detects URLs in user messages and crawls the entire website content for analysis. If crawling fails, it automatically falls back to web search to ensure users always get a response. This is different from regular web search - instead of searching for information about a topic, it extracts the actual content from a specific website or searches for information about it.

## How It Works

### 1. Automatic URL Detection (Priority #1)
- The system automatically detects HTTP/HTTPS URLs in user messages
- Keywords like "analyze this website", "crawl this site", "what's on this page" also trigger crawling
- URL crawling takes priority over web search when URLs are detected

### 2. Smart Fallback System
- **Primary**: Attempts website crawling (best - gets full content)
- **Fallback**: If crawling fails → automatically tries web search
- **Safety**: If both fail → shows clear error message
- **Guarantee**: User always gets some form of response

### 3. Content Extraction (When Crawling Works)
- Uses Cheerio for robust HTML parsing
- Extracts title, description, and main content
- Removes navigation, ads, scripts, and irrelevant elements
- Intelligent content area detection (main, article, .content, etc.)
- 8000 character limit for optimal context processing

### 4. Web Search Fallback (When Crawling Fails)
- Automatically searches for information about the website
- Combines cleaned query with URL for better search results
- Provides context and general information about the site
- Uses existing DataForSEO web search infrastructure

## Usage Examples

### Basic URL Analysis
```
User: "Analyze this website: https://example.com"
```

### Specific Questions
```
User: "What's the main topic of https://blog.example.com/post-123?"
User: "Summarize the content from https://docs.company.com/guide"
User: "https://github.com/user/repo - what does this project do?"
```

### Contextual Crawling
```
User: "Get content from https://news.site.com and tell me the key points"
User: "Read this page https://research.org/paper and explain the findings"
```

## Visual Indicators

### During Crawling
- 🕷️ Spider icon with "Crawling website..." message
- Animated pulse effect during processing

### During Fallback
- 🌐 Globe icon with "Searching the web..." message
- Indicates fallback to web search is happening

### Tool State
- `toolInUse` set to "website-crawler" during crawling
- `toolInUse` set to "web-search" during fallback
- Consistent with other tool indicators

## Common Crawling Failures & Fallback Scenarios

### Why Crawling Might Fail
1. **Bot Protection**: Website blocks crawlers or has strict bot detection
2. **JavaScript Required**: Single Page Applications (SPAs) that need JS rendering
3. **Authentication Required**: Content behind login/paywall
4. **Network Issues**: Website temporarily down or slow response
5. **Timeout**: 30-second timeout exceeded
6. **CORS/Security**: Strict security policies preventing access

### When Fallback Web Search Helps
- ✅ **General Information**: Gets descriptions, reviews, and summaries about the website
- ✅ **Context**: Provides background information even if content can't be crawled
- ✅ **Alternatives**: Finds related content or similar information
- ✅ **Reliability**: Ensures user always gets a response

### Console Logging for Debugging
```
🔍 URL Detection Analysis:
🕷️ AUTO-CRAWL DECISION: YES for URL: "https://example.com"
🕷️ Crawling website: https://example.com
✅ Successfully crawled: [Title] (1234 words)

-- OR if crawling fails --

🚨 Crawling failed, falling back to web search: [Error details]
🔄 Attempting fallback to web search...
✅ Fallback web search successful
```

## API Endpoints

### `/api/chat/detect-url`
- **Purpose**: Detects URLs in user messages
- **Input**: `{ query: string }`
- **Output**: `{ shouldCrawl: boolean, data: UrlDetectionResult }`

### `/api/chat/crawl-website`
- **Purpose**: Crawls and extracts website content
- **Input**: `{ url: string }`
- **Output**: `{ success: boolean, data: CrawlResult }`

## Technical Details

### Content Extraction Strategy
1. **Primary Selectors**: `main`, `article`, `.content`, `.main-content`
2. **Fallback**: Extract from common content tags (`p`, `h1-h6`, `div`, `section`)
3. **Cleanup**: Remove scripts, styles, navigation elements
4. **Text Processing**: Normalize whitespace, clean line breaks

### Error Handling
- 30-second timeout for reliability
- HTTP status validation
- Graceful fallback for inaccessible sites
- Detailed error messages for debugging

### Performance Considerations
- Content truncated at 8000 characters
- Word count metadata included
- Crawl timestamp for cache considerations

## Integration with Chat Flow

### Detection Phase
1. User sends message with URL
2. URL detection API analyzes message
3. If URL found, extraction process begins

### Crawling Phase
1. Website crawler API fetches and parses content
2. Content extracted and cleaned
3. Integrated into chat context

### Processing Phase
1. Enhanced prompt created with crawled content
2. Regular chat processing continues
3. AI responds with content analysis

## Benefits

### For Users
- No manual configuration required
- Works with any publicly accessible website
- Full content access, not just summaries
- Perfect for research and analysis

### For Developers
- Modular design with separate APIs
- Easy to extend and customize
- Consistent with existing tool patterns
- Comprehensive error handling

## Future Enhancements

### Potential Additions
- PDF content extraction
- Image content analysis
- Multi-page crawling
- Content caching for repeated requests
- Custom extraction rules per domain
