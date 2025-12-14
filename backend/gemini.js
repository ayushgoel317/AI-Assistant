import axios from "axios"

// Simple in-memory cache to reduce API calls
const responseCache = new Map();
let lastApiCallTime = 0;
const MIN_API_CALL_INTERVAL = 2000; // Minimum 2 seconds between API calls

const getCacheKey = (command, assistantName, userName) => {
    return `${command.toLowerCase()}|${assistantName}|${userName}`;
};

const geminiResponse=async (command,assistantName,userName)=>{
try {
    const cacheKey = getCacheKey(command, assistantName, userName);
    
    // Check if response is already cached
    if (responseCache.has(cacheKey)) {
        console.log("⚡ Using cached response for:", command);
        return responseCache.get(cacheKey);
    }
    
    // Rate limiting: ensure minimum time between API calls
    const timeSinceLastCall = Date.now() - lastApiCallTime;
    if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
        const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
        console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const apiUrl=process.env.GEMINI_API_URL
    const prompt = `You are a voice-enabled virtual assistant named ${assistantName}, created by ${userName}.

CRITICAL INSTRUCTIONS:
1. Respond ONLY with valid JSON - no markdown, code blocks, or explanations
2. ALWAYS include all three fields: type, userInput, and response
3. Response field MUST be a brief conversational message (1-2 sentences max)

JSON Structure (mandatory):
{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month" | "calculator-open" | "instagram-open" | "facebook-open" | "weather-show",
  "userInput": "extracted search query or cleaned input",
  "response": "Brief friendly spoken reply"
}

Classification Guide:
SEARCH/ACTIONS (Always respond even for these):
- "google-search": User wants web search → response: "Searching for that on Google"
- "youtube-search": User wants YouTube search → response: "Searching for that on YouTube"
- "youtube-play": User wants to play music/video → response: "Playing that for you"
- "calculator-open": User needs calculator → response: "Opening calculator for you"
- "instagram-open": User wants Instagram → response: "Opening Instagram"
- "facebook-open": User wants Facebook → response: "Opening Facebook"
- "weather-show": User wants weather → response: "Checking the weather for you"

TIME/DATE:
- "get-time": Current time request → response: "Let me get the time"
- "get-date": Today's date request → response: "Let me check today's date"
- "get-day": Day of week request → response: "Let me tell you what day it is"
- "get-month": Current month request → response: "Let me check the current month"

GENERAL:
- "general": Questions/conversation → response: "Brief factual answer"

EXAMPLES:
Input: "search for recipes on Google" → {"type": "google-search", "userInput": "recipes", "response": "Searching for recipes on Google"}
Input: "play a song on YouTube" → {"type": "youtube-play", "userInput": "song", "response": "Playing that for you on YouTube"}
Input: "what is Python" → {"type": "general", "userInput": "what is Python", "response": "Python is a popular programming language"}

User input: "${command}"`;





    const result=await axios.post(apiUrl,{
    "contents": [{
    "parts":[{"text": prompt}]
    }]
    })
    
    // Update last API call time
    lastApiCallTime = Date.now();
    
    const responseText = result.data.candidates[0].content.parts[0].text;
    console.log("📡 Raw Gemini Response:", responseText);
    
    // Cache the response
    responseCache.set(cacheKey, responseText);
    console.log("💾 Response cached for future use");
    
    return responseText;
} catch (error) {
    // Check if it's a rate limit error
    if (error.response?.status === 429) {
        console.log("❌ 429 Rate Limited - Gemini API quota exceeded");
        console.log("⏱️  Please wait 5-15 minutes before trying again");
        console.log("💡 Tip: Upgrade to a paid plan for higher rate limits");
        throw new Error("API rate limit exceeded. Please wait and try again later.");
    }
    
    console.log("❌ Error in geminiResponse:", error.message);
    throw error;
}
}

export default geminiResponse