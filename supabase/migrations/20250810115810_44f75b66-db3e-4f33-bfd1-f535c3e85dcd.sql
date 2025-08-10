-- Add unique constraints for upsert operations
ALTER TABLE news_sources ADD CONSTRAINT news_sources_name_unique UNIQUE (name);
ALTER TABLE news_categories ADD CONSTRAINT news_categories_name_unique UNIQUE (name);
ALTER TABLE news_articles ADD CONSTRAINT news_articles_url_unique UNIQUE (url);