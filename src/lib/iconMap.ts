import {
  Flag, Building2, Globe, Users, Crown, TrendingUp, Briefcase,
  Vote, Gavel, MapPin, Target, Scale, Shield, Heart, Lightbulb,
  Award, BookOpen, Calendar, Camera, FileText, Gift, Home, Map,
  MessageCircle, Newspaper, Phone, PieChart, Settings, Star, Tag,
  Zap, Activity, Anchor, Archive, BarChart, Battery, Bell, Bookmark,
  Box, Check, Circle, Cloud, Code, Cpu, CreditCard, Database,
  Download, Droplet, Eye, Feather, Film, Filter, Folder, Hash,
  Headphones, HelpCircle, Image, Inbox, Info, Key, Layers, Link,
  Lock, Mail, Megaphone, Mic, Monitor, Moon, Music, Navigation,
  Package, Palette, Paperclip, Pencil, Percent, Play, Plus,
  Printer, Radio, RefreshCw, Repeat, Save, Search, Send, Server,
  Share, ShoppingCart, Shuffle, Sidebar, Smartphone, Smile,
  Speaker, Square, Sun, Thermometer, ThumbsUp, Trash,
  TrendingDown, Triangle, Tv, Type, Umbrella, Upload, Video,
  Volume, Watch, Wifi, Wind, XCircle, Youtube
} from 'lucide-react';

export const iconMap: Record<string, any> = {
  Flag, Building2, Globe, Users, Crown, TrendingUp, Briefcase,
  Vote, Gavel, MapPin, Target, Scale, Shield, Heart, Lightbulb,
  Award, BookOpen, Calendar, Camera, FileText, Gift, Home, Map,
  MessageCircle, Newspaper, Phone, PieChart, Settings, Star, Tag,
  Zap, Activity, Anchor, Archive, BarChart, Battery, Bell, Bookmark,
  Box, Check, Circle, Cloud, Code, Cpu, CreditCard, Database,
  Download, Droplet, Eye, Feather, Film, Filter, Folder, Hash,
  Headphones, HelpCircle, Image, Inbox, Info, Key, Layers, Link,
  Lock, Mail, Megaphone, Mic, Monitor, Moon, Music, Navigation,
  Package, Palette, Paperclip, Pencil, Percent, Play, Plus,
  Printer, Radio, RefreshCw, Repeat, Save, Search, Send, Server,
  Share, ShoppingCart, Shuffle, Sidebar, Smartphone, Smile,
  Speaker, Square, Sun, Thermometer, ThumbsUp, Trash,
  TrendingDown, Triangle, Tv, Type, Umbrella, Upload, Video,
  Volume, Watch, Wifi, Wind, XCircle, Youtube
};

// Get icon component by name with fallback
export const getIcon = (iconName: string | null | undefined, fallback: any = Users) => {
  if (!iconName) return fallback;
  return iconMap[iconName] || fallback;
};
