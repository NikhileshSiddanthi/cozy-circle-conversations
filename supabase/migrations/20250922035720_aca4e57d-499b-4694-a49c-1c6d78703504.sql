-- Enable realtime for visitor_stats table
ALTER TABLE public.visitor_stats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_stats;