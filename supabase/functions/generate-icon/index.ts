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
  "Smile", "Speaker", "Square", "Sun", "Thermometer", "ThumbsUp", "Trash",
  "TrendingDown", "Triangle", "Tv", "Type", "Umbrella", "Upload", "Video",
  "Volume", "Watch", "Wifi", "Wind", "XCircle", "Youtube", "Vote", "Gavel"
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

    // Simple keyword matching for icon selection (reliable and fast)
    const nameLower = name.toLowerCase();
    let suggestedIcon = type === "category" ? "Flag" : "Users";
    
    // Category/Group keyword to icon mapping
    const keywordMap: Record<string, string> = {
      // Politics & Government
      'politic': 'Vote', 'government': 'Building', 'constitution': 'Gavel',
      'law': 'Scale', 'justice': 'Gavel', 'parliament': 'Building',
      // Organizations
      'organization': 'Building', 'institution': 'Building', 'party': 'Users',
      'committee': 'Users', 'association': 'Users',
      // International
      'international': 'Globe', 'global': 'Globe', 'world': 'Globe',
      'foreign': 'Globe', 'diplomatic': 'Globe',
      // Economy
      'economy': 'TrendingUp', 'business': 'Briefcase', 'finance': 'TrendingUp',
      'trade': 'TrendingUp', 'market': 'BarChart',
      // Social
      'social': 'Heart', 'community': 'Users', 'cultural': 'Users',
      'movement': 'TrendingUp',
      // Technology
      'technology': 'Cpu', 'tech': 'Cpu', 'science': 'Lightbulb',
      'innovation': 'Lightbulb', 'digital': 'Smartphone',
      // Education
      'education': 'BookOpen', 'school': 'BookOpen', 'university': 'Award',
      'academic': 'Award', 'learning': 'BookOpen',
      // Health
      'health': 'Heart', 'medical': 'Heart', 'healthcare': 'Heart',
      // Media
      'media': 'Tv', 'entertainment': 'Film', 'film': 'Film',
      'news': 'Newspaper', 'press': 'Newspaper',
      // Personalities
      'leader': 'Crown', 'figure': 'Users', 'influencer': 'Star',
      'personality': 'Star',
      // General
      'group': 'Users', 'team': 'Users', 'member': 'Users',
      'public': 'Eye', 'private': 'Lock', 'security': 'Shield'
    };
    
    // Find matching icon based on keywords
    for (const [keyword, icon] of Object.entries(keywordMap)) {
      if (nameLower.includes(keyword)) {
        suggestedIcon = icon;
        break;
      }
    }
    
    console.log(`Matched icon for "${name}": ${suggestedIcon}`);

    // Validate that the suggested icon is in our list
    const icon = availableIcons.includes(suggestedIcon) 
      ? suggestedIcon 
      : (type === "category" ? "Flag" : "Users");

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
