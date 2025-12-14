 import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"
 export const getCurrentUser=async (req,res)=>{
    try {
        const userId=req.userId
        const user=await User.findById(userId).select("-password")
        if(!user){
return res.status(400).json({message:"user not found"})
        }

   return res.status(200).json(user)     
    } catch (error) {
       return res.status(400).json({message:"get current user error"}) 
    }
}

export const updateAssistant=async (req,res)=>{
   try {
      const {assistantName,imageUrl}=req.body
      let assistantImage;
if(req.file){
   assistantImage=await uploadOnCloudinary(req.file.path)
}else{
   assistantImage=imageUrl
}

const user=await User.findByIdAndUpdate(req.userId,{
   assistantName,assistantImage
},{new:true}).select("-password")
return res.status(200).json(user)

      
   } catch (error) {
       return res.status(400).json({message:"updateAssistantError user error"}) 
   }
}


export const askToAssistant=async (req,res)=>{
   try {
      console.log("=== askToAssistant Called ===");
      const {command}=req.body
      console.log("Command received:", command);
      
      if(!command){
         console.log("No command provided");
         return res.status(400).json({response:"please provide a command"})
      }
      
      const user=await User.findById(req.userId);
      console.log("User found:", user?.name);
      
      if(!user){
         console.log("User not found for ID:", req.userId);
         return res.status(404).json({response:"user not found"})
      }
      
      user.history.push(command)
      await user.save()
      console.log("History updated");
      
      const userName=user.name
      const assistantName=user.assistantName
      console.log("Calling Gemini with:", {command, assistantName, userName});
      
      let result;
      try {
         result=await geminiResponse(command,assistantName,userName)
         console.log("Gemini Response received, length:", result?.length);
      } catch (error) {
         console.log("❌ Gemini API Error:", error.message)
         console.log("❌ Gemini Error Stack:", error.stack)
         return res.status(500).json({response:"error connecting to AI service: " + error.message})
      }
      
      if(!result){
         console.log("❌ No result from Gemini API");
         return res.status(500).json({response:"no response from AI"})
      }
      
      console.log("Raw Gemini result:", result.substring(0, 200));
      
      // Extract JSON from response
      const jsonMatch=result.match(/{[\s\S]*}/)
      if(!jsonMatch){
         console.log("❌ Failed to extract JSON from:", result)
         return res.status(400).json({response:"sorry, i can't understand that"})
      }
      
      console.log("Extracted JSON string:", jsonMatch[0].substring(0, 200));
      
      let gemResult;
      try {
         gemResult=JSON.parse(jsonMatch[0])
         console.log("✅ JSON parsed successfully:", gemResult);
      } catch (parseError) {
         console.log("❌ JSON Parse Error:", parseError.message)
         console.log("❌ Failed to parse:", jsonMatch[0])
         return res.status(400).json({response:"error processing response: " + parseError.message})
      }
      
      if(!gemResult.type || !gemResult.response){
         console.log("❌ Invalid response structure:", gemResult)
         return res.status(400).json({response:"invalid response format"})
      }
      
      console.log("✅ Parsed Gemini Result:", gemResult)
      
      // Sanitize and trim the type value to remove any whitespace or extra characters
      let type = (gemResult.type || '').trim().toLowerCase();
      console.log("📝 Sanitized type:", type, "(length:", type.length, ")");
      
      // Handle case where type might have extra quotes
      if (type && type.length > 0 && type.startsWith('"') && type.endsWith('"')) {
         type = type.slice(1, -1).trim();
         console.log("🔧 Removed extra quotes, final type:", type);
      }
      console.log("✅ Final type:", type);
      
      // Also sanitize userInput and response to ensure they're strings
      const userInput = String(gemResult.userInput || '').trim();
      const response = String(gemResult.response || '').trim();
      console.log("✅ Sanitized - userInput:", userInput, "| response:", response);

      console.log("🔍 Checking type against cases...");
      switch(type){
         case 'get-date' :
            console.log("✅ Matched: get-date");
            return res.json({
               type,
               userInput,
               response:`current date is ${moment().format("YYYY-MM-DD")}`
            });
         case 'get-time':
            console.log("✅ Matched: get-time");
            return res.json({
               type,
               userInput,
               response:`current time is ${moment().format("hh:mm A")}`
            });
         case 'get-day':
            console.log("✅ Matched: get-day");
            return res.json({
               type,
               userInput,
               response:`today is ${moment().format("dddd")}`
            });
         case 'get-month':
            console.log("✅ Matched: get-month");
            return res.json({
               type,
               userInput,
               response:`today is ${moment().format("MMMM")}`
            });
         case 'google-search':
         case 'youtube-search':
         case 'youtube-play':
         case 'general':
         case 'calculator-open':
         case 'instagram-open': 
         case 'facebook-open': 
         case 'weather-show' :
            console.log("✅ Matched type:", type, "- returning response:", response);
            return res.json({
               type,
               userInput,
               response,
            });

         default:
            console.log("⚠️  Unknown type:", type, "- Available types: get-date, get-time, get-day, get-month, google-search, youtube-search, youtube-play, general, calculator-open, instagram-open, facebook-open, weather-show")
            console.log("📤 Returning response anyway with type:", type);
            // Instead of rejecting, return the gemini response anyway
            return res.json({
               type,
               userInput,
               response,
            });
      }
     

   } catch (error) {
      console.log("❌ ❌ ❌ MAIN ERROR - Ask Assistant Error:", error.message)
      console.log("❌ Ask Assistant Error Stack:", error.stack)
      console.log("❌ Error Name:", error.name)
      console.log("❌ Error Object:", JSON.stringify(error, null, 2))
      return res.status(500).json({ 
         response: "ask assistant error: " + error.message,
         errorDetails: error.message
      })
   }
}