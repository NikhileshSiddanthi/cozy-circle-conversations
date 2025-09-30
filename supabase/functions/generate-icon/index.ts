import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Available Lucide icons for categories/groups
const availableIcons = [
  "Flag", "Users", "Target", "TrendingUp", "Scale", "Shield", "Globe",
  "Building", "Heart", "Lightbulb", "Award", "BookOpen", "Briefcase",
  "Calendar", "Camera", "FileText", "Gift", "Home", "Map", "MessageCircle",
  "Newspaper", "Phone", "PieChart", "Settings", "Star", "Tag", "Zap",
  "Activity", "Anchor", "Archive", "BarChart", "Battery", "Bell", "Bookmark",
  "Box", "Check", "Circle", "Cloud", "Code", "Cpu", "CreditCard", "Database",
  "Download", "Droplet", "Eye", "Feather", "Film", "Filter", "Folder",
  "Hash", "Headphones", "HelpCircle", "Image", "Inbox", "Info", "Key",
  "Layers", "Link", "Lock", "Mail", "Megaphone", "Mic", "Monitor", "Moon",
  "Music", "Navigation", "Package", "Palette", "Paperclip", "Pencil", "Percent",
  "Play", "Plus", "Printer", "Radio", "RefreshCw", "Repeat", "Save", "Search",
  "Send", "Server", "Share", "ShoppingCart", "Shuffle", "Sidebar", "Smartphone",
  "Smile", "Speaker", "Square", "Sun", "Thermometer", "ThumbsUp", "Tool",
  "Trash", "TrendingDown", "Triangle", "Tv", "Type", "Umbrella", "Upload",
  "Video", "Volume", "Watch", "Wifi", "Wind", "XCircle", "Youtube"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, type = "category" } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI to get icon suggestion
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an icon suggestion assistant. Given a ${type} name, suggest the most relevant icon from the available list. Respond ONLY with the icon name, nothing else.

Available icons: ${availableIcons.join(", ")}

Choose the icon that best represents the concept, keywords, or theme of the name provided.`
          },
          {
            role: "user",
            content: `Suggest an icon for this ${type}: "${name}"`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      // Return a default icon on error
      return new Response(
        JSON.stringify({ icon: type === "category" ? "Flag" : "Users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const suggestedIcon = data.choices?.[0]?.message?.content?.trim() || "";
    
    // Validate that the suggested icon is in our list
    const icon = availableIcons.includes(suggestedIcon) 
      ? suggestedIcon 
      : (type === "category" ? "Flag" : "Users");

    console.log(`Generated icon for "${name}": ${icon}`);

    return new Response(
      JSON.stringify({ icon }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        icon: "Flag" // Fallback icon
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
