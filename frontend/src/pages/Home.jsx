import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"
function Home() {
  const {userData,serverUrl,setUserData,getGeminiResponse}=useContext(userDataContext)
  const navigate=useNavigate()
  const [listening,setListening]=useState(false)
  const [userText,setUserText]=useState("")
  const [aiText,setAiText]=useState("")
  
  const isSpeakingRef=useRef(false)
  const recognitionRef=useRef(null)
  const [ham,setHam]=useState(false)
  const isRecognizingRef=useRef(false)
  const synth=window.speechSynthesis

  const handleLogOut=async ()=>{
    try {
      const result=await axios.get(`${serverUrl}/api/auth/logout`,{withCredentials:true})
      setUserData(null)
      navigate("/signin")
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const startRecognition = () => {
    
   if (!isSpeakingRef.current && !isRecognizingRef.current) {
    try {
      recognitionRef.current?.start();
      console.log("Recognition requested to start");
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Start error:", error);
      }
    }
  }
  }

  

  // Detect command type from user input (synchronous, for popup blocker bypass)
  const detectCommandType = (transcript) => {
    const lower = transcript.toLowerCase();
    
    if (lower.includes('youtube') || lower.includes('you tube')) {
      return 'youtube-play';
    } else if (lower.includes('google') || lower.includes('search')) {
      return 'google-search';
    } else if (lower.includes('calculator') || lower.includes('calculate')) {
      return 'calculator-open';
    } else if (lower.includes('instagram') || lower.includes('insta')) {
      return 'instagram-open';
    } else if (lower.includes('facebook') || lower.includes('fb')) {
      return 'facebook-open';
    } else if (lower.includes('weather')) {
      return 'weather-show';
    } else if (lower.includes('date') || lower.includes('day') || lower.includes('what day')) {
      return 'get-date';
    } else if (lower.includes('time') || lower.includes('what time')) {
      return 'get-time';
    }
    
    return null;
  }

  // Build a set of links (label + url) for a command type WITHOUT opening them.
  // We only return the links; the UI will present buttons which the user can click
  // (a real user gesture) to open the pages and avoid popup blocking.
  const buildLinksForCommand = (data) => {
    const { type, userInput } = data || {};
    const t = (type || '').trim().toLowerCase();
    const links = [];

    if (t === 'google-search') {
      const query = encodeURIComponent(userInput || '');
      links.push({ label: 'Open Google Search', url: `https://www.google.com/search?q=${query}` });
    } else if (t === 'youtube-play' || t === 'youtube-search') {
      const query = encodeURIComponent(userInput || '');
      links.push({ label: 'Open YouTube', url: `https://www.youtube.com/results?search_query=${query}` });
    } else if (t === 'calculator-open') {
      links.push({ label: 'Open Calculator', url: `https://www.google.com/search?q=calculator` });
    } else if (t === 'instagram-open') {
      links.push({ label: 'Open Instagram', url: `https://www.instagram.com/` });
    } else if (t === 'facebook-open') {
      links.push({ label: 'Open Facebook', url: `https://www.facebook.com/` });
    } else if (t === 'weather-show') {
      links.push({ label: 'Show Weather', url: `https://www.google.com/search?q=weather` });
    }

    return links;
  }

  


  const speak=(text)=>{
    const utterence=new SpeechSynthesisUtterance(text)
    utterence.lang = 'en-US';
    
    // Improve voice quality and speed
    utterence.rate = 0.9; // Slightly slower for clarity (0.1-2, default 1)
    utterence.pitch = 1.0; // Normal pitch
    utterence.volume = 1.0; // Maximum volume
    
    const voices = window.speechSynthesis.getVoices()
    
    // Try to get a female voice first (usually sounds better), fallback to any available voice
    if (voices.length > 0) {
      const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'));
      utterence.voice = femaleVoice || voices[0];
    }

    isSpeakingRef.current=true
    
    utterence.onstart = () => {
      console.log("🔊 Speaking - stopping recognition to avoid feedback");
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.log("Could not stop recognition:", e.message);
      }
    }
    
    utterence.onend=()=>{
      console.log("🔊 Done speaking - restarting recognition");
      isSpeakingRef.current = false;
      setTimeout(() => {
        setAiText("");
        try {
          recognitionRef.current?.start();
          console.log("🎤 Recognition restarted after speaking");
        } catch (e) {
          console.log("Could not restart recognition:", e.message);
        }
      }, 1500); // Wait 1.5 seconds before resuming to avoid echo
    }
    
    utterence.onerror = (error) => {
      console.log("🔊 Speech synthesis error:", error);
      isSpeakingRef.current = false;
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.log("Could not restart recognition:", e.message);
        }
      }, 1500);
    }
    
    synth.cancel(); // Cancel any previous speech
    synth.speak(utterence);
  }

  // Separate function to open windows - called synchronously from event handler
  const openWindowsForCommand = (data) => {
    const {type, userInput} = data;
    
    // Early return if no type is specified
    if (!type || type === null) return;
    
    const cleanType = (type || '').trim().toLowerCase();
    console.log("🔗 openWindowsForCommand - Clean Type:", cleanType);
    
    if (cleanType === 'google-search') {
      console.log("🌐 Opening Google search for:", userInput);
      const query = encodeURIComponent(userInput);
      const searchUrl = `https://www.google.com/search?q=${query}`;
      console.log("📍 Google URL:", searchUrl);
      try {
        const win = window.open(searchUrl, '_blank');
        if (win) {
          console.log("✅ Google search window opened successfully");
        } else {
          console.warn("⚠️  Google search window blocked - popup may be disabled");
        }
      } catch (e) {
        console.warn("❌ Failed to open Google search:", e.message);
      }
    }
    else if (cleanType === 'calculator-open') {
      console.log("🔢 Opening calculator");
      const calcUrl = `https://www.google.com/search?q=calculator`;
      try {
        const win = window.open(calcUrl, '_blank');
        if (win) {
          console.log("✅ Calculator window opened successfully");
        } else {
          console.warn("⚠️  Calculator window blocked");
        }
      } catch (e) {
        console.warn("❌ Failed to open calculator:", e.message);
      }
    }
    else if (cleanType === "instagram-open") {
      console.log("📷 Opening Instagram");
      try {
        const win = window.open(`https://www.instagram.com/`, '_blank');
        if (win) {
          console.log("✅ Instagram window opened successfully");
        } else {
          console.warn("⚠️  Instagram window blocked");
        }
      } catch (e) {
        console.warn("❌ Failed to open Instagram:", e.message);
      }
    }
    else if (cleanType === "facebook-open") {
      console.log("📱 Opening Facebook");
      try {
        const win = window.open(`https://www.facebook.com/`, '_blank');
        if (win) {
          console.log("✅ Facebook window opened successfully");
        } else {
          console.warn("⚠️  Facebook window blocked");
        }
      } catch (e) {
        console.warn("❌ Failed to open Facebook:", e.message);
      }
    }
    else if (cleanType === "weather-show") {
      console.log("⛅ Checking weather");
      const weatherUrl = `https://www.google.com/search?q=weather`;
      try {
        const win = window.open(weatherUrl, '_blank');
        if (win) {
          console.log("✅ Weather window opened successfully");
        } else {
          console.warn("⚠️  Weather window blocked");
        }
      } catch (e) {
        console.warn("❌ Failed to open weather:", e.message);
      }
    }
    else if (cleanType === 'youtube-search' || cleanType === 'youtube-play') {
      console.log("🎥 Opening YouTube search for:", userInput);
      const query = encodeURIComponent(userInput);
      const youtubeUrl = `https://www.youtube.com/results?search_query=${query}`;
      console.log("📍 YouTube URL:", youtubeUrl);
      try {
        const win = window.open(youtubeUrl, '_blank');
        if (win) {
          console.log("✅ YouTube window opened successfully");
        } else {
          console.warn("⚠️  YouTube window blocked - popup may be disabled");
        }
      } catch (e) {
        console.warn("❌ Failed to open YouTube:", e.message);
      }
    }
    else {
      console.log("ℹ️  General or other command type:", cleanType);
    }
  };

  const handleCommand=(data)=>{
    // This is now just for logging/debugging
    const {type,userInput,response}=data
    console.log("📢 handleCommand called - Type:", type, "UserInput:", userInput);
  }

useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Better speech recognition configuration
  recognition.continuous = true;        // Keep listening continuously
  recognition.interimResults = true;    // Get interim results for better UX
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  
  // IMPORTANT: Increase audio level requirements
  recognition.audioLevel = 0.5;         // Lower threshold to detect quieter speech

  recognitionRef.current = recognition;

  let isMounted = true;  // flag to avoid setState on unmounted component
  let noSpeechTimeout = null;           // Timeout for "no-speech" error handling

  // Start recognition after 1 second delay only if component still mounted
  const startTimeout = setTimeout(() => {
    if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
      try {
        recognition.start();
        console.log("🎤 Speech Recognition started - waiting for audio...");
        console.log("🎙️  Please speak clearly and say your assistant's name first");
        
        // Set a timeout to restart if no speech is detected after 10 seconds
        noSpeechTimeout = setTimeout(() => {
          if (isRecognizingRef.current && isMounted) {
            console.log("⏱️  No speech detected for 10 seconds, restarting recognition...");
            try {
              recognition.stop();
              setTimeout(() => {
                if (isMounted) recognition.start();
              }, 500);
            } catch (e) {
              console.log("Error restarting:", e.message);
            }
          }
        }, 10000);
      } catch (e) {
        if (e.name !== "InvalidStateError") {
          console.error("Start error:", e);
        }
      }
    }
  }, 1000);

  recognition.onstart = () => {
    console.log("✅ Speech recognition started - microphone active");
    isRecognizingRef.current = true;
    setListening(true);
  };

  recognition.onend = () => {
    console.log("🛑 Speech recognition ended");
    isRecognizingRef.current = false;
    setListening(false);
    
    // Clear no-speech timeout
    if (noSpeechTimeout) clearTimeout(noSpeechTimeout);
    
    // Restart recognition if component is still mounted and we're not speaking
    if (isMounted && !isSpeakingRef.current) {
      setTimeout(() => {
        if (isMounted) {
          try {
            console.log("🔄 Restarting speech recognition from onend...");
            recognition.start();
          } catch (e) {
            if (e.name !== "InvalidStateError") console.error(e);
          }
        }
      }, 1000);
    }
  };

  recognition.onerror = (event) => {
    console.warn("🔴 Recognition error:", event.error);
    
    // Handle different error types
    switch(event.error) {
      case 'no-speech':
        console.log("❌ No speech detected. Make sure:");
        console.log("   1. Your microphone is working");
        console.log("   2. You're speaking clearly");
        console.log("   3. You started by saying the assistant name: " + userData?.assistantName);
        break;
      case 'audio-capture':
        console.log("❌ No microphone found. Check your audio input device.");
        break;
      case 'network':
        console.log("❌ Network error. Check your internet connection.");
        break;
      case 'aborted':
        console.log("ℹ️  Speech recognition was stopped");
        break;
      default:
        console.log("⚠️  Error type:", event.error);
    }
    
    isRecognizingRef.current = false;
    setListening(false);
    
    // Clear no-speech timeout
    if (noSpeechTimeout) clearTimeout(noSpeechTimeout);
    
    // Restart recognition for most errors (except audio-capture which is fatal)
    if (event.error !== "aborted" && event.error !== "audio-capture" && isMounted && !isSpeakingRef.current) {
      setTimeout(() => {
        if (isMounted) {
          try {
            console.log("🔄 Restarting speech recognition...");
            recognition.start();
          } catch (e) {
            if (e.name !== "InvalidStateError") console.error(e);
          }
        }
      }, 1500);
    }
  };

  recognition.onresult = async (e) => {
    // Get the final transcript (not interim)
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        transcript += e.results[i][0].transcript;
      }
    }
    
    transcript = transcript.trim();
    
    // Log what was heard
    if (transcript) {
      console.log("🎤 Heard:", transcript);
    }
    
    // Clear no-speech timeout when speech is detected
    if (noSpeechTimeout) clearTimeout(noSpeechTimeout);
    
    if (transcript && transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
      setAiText("");
      setUserText(transcript);
      recognition.stop();
      isRecognizingRef.current = false;
      setListening(false);
      
      // Stop listening while speaking to avoid feedback
      console.log("🤐 Stopping recognition to avoid voice feedback...");
      
      // CRITICAL: Detect command type from transcript IMMEDIATELY (synchronous)
      // This allows us to open windows in the user interaction context
      // before any async operations
      const commandType = detectCommandType(transcript);
      console.log("📝 Detected command type:", commandType);
      
        if (commandType) {
          // Build link(s) synchronously
          const tempData = { type: commandType, userInput: transcript };
          const links = buildLinksForCommand(tempData);
          const url = links && links.length ? links[0].url : null;

          if (url) {
            console.log('🚀 Auto-navigating to:', url);
            // Update UI quickly then navigate the current tab to the URL
            setAiText(`Opening ${url}`);
            // small delay to flush UI updates, then navigate away
            setTimeout(() => {
              try {
                window.location.href = url;
              } catch (e) {
                console.warn('Auto navigation failed:', e.message);
              }
            }, 150);
          } else {
            console.log('No auto-open URL detected for commandType:', commandType);
          }
        }
      
      // Now fetch the response (async, no longer in user interaction context, but windows already opened)
      getGeminiResponse(transcript)
        .then(data => {
          if (data && data.response) {
            console.log("✅ Response received:", data);
            setAiText(data.response); // Display response
            speak(data.response);
          } else {
            console.log("Invalid response format:", data);
            setAiText("Sorry, I didn't get that. Please try again.");
            speak("Sorry, I didn't get that. Please try again.");
          }
        })
        .catch(error => {
          console.log("❌ Error getting response:", error.message);
          
          // Check if it's a rate limit error
          if (error.message && error.message.includes("rate limit")) {
            setAiText("API rate limit exceeded. Please wait a few minutes and try again.");
            speak("The AI service is temporarily unavailable. Please wait a few minutes and try again.");
            console.log("💡 Suggestion: Upgrade to a paid Gemini API plan for higher limits");
          } else {
            setAiText("Sorry, there was an error. Please try again.");
            speak("Sorry, there was an error. Please try again.");
          }
        })
        .finally(() => {
          setUserText("");
        });
    }
  };


    const greeting = new SpeechSynthesisUtterance(`Hello ${userData.name}, I am ${userData.assistantName}. What can I help you with?`);
    greeting.lang = 'en-US';
    greeting.rate = 0.9; // Slightly slower for clarity
    greeting.pitch = 1.0; // Normal pitch
    greeting.volume = 1.0; // Maximum volume
    
    const greetingVoices = window.speechSynthesis.getVoices();
    if (greetingVoices.length > 0) {
      const femaleVoice = greetingVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'));
      greeting.voice = femaleVoice || greetingVoices[0];
    }
    
    greeting.onstart = () => {
      console.log("🔊 Greeting: Stopping recognition to prevent echo");
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.log("Could not stop recognition:", e.message);
      }
    }
    
    greeting.onend = () => {
      console.log("🔊 Greeting done - Ready to listen");
      isSpeakingRef.current = false;
      setTimeout(() => {
        startRecognition();
      }, 500);
    }
   
    window.speechSynthesis.speak(greeting);
 

  return () => {
    isMounted = false;
    clearTimeout(startTimeout);
    if (noSpeechTimeout) clearTimeout(noSpeechTimeout);
    try {
      recognition.stop();
    } catch (e) {
      console.log("Error stopping recognition:", e.message);
    }
    setListening(false);
    isRecognizingRef.current = false;
  };
}, [userData?.assistantName]);




  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>
      {/* Voice recognition: starts automatically (no mic button). External links will open in the same tab automatically. */}
      <CgMenuRight className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(true)}/>
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham?"translate-x-0":"translate-x-full"} transition-transform`}>
 <RxCross1 className=' text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(false)}/>
 <button className='min-w-[150px] h-[60px]  text-black font-semibold   bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px]  text-black font-semibold  bg-white  rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>

<div className='w-full h-[2px] bg-gray-400'></div>
<h1 className='text-white font-semibold text-[19px]'>History</h1>

<div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>
  {userData.history?.map((his)=>(
    <div className='text-gray-200 text-[18px] w-full h-[30px]  '>{his}</div>
  ))}

</div>

      </div>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px]  bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold  bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>
      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
<img src={userData?.assistantImage} alt="" className='h-full object-cover'/>
      </div>
      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
      {!aiText && <img src={userImg} alt="" className='w-[200px]'/>}
      {aiText && <img src={aiImg} alt="" className='w-[200px]'/>}
    
    <h1 className='text-white text-[18px] font-semibold text-wrap'>{userText?userText:aiText?aiText:null}</h1>
      
    </div>
  )
}

export default Home