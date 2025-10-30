# Database Migration Guide

## How to Create and Apply Migrations

### Creating a New Migration

1. **Make changes in QA Supabase first**
   - Go to your QA Supabase dashboard
   - Use SQL Editor to write your changes
   - Test thoroughly in QA

2. **Export the migration**
   ```sql
   -- Create a new file: supabase/migrations/YYYYMMDDHHMMSS_description.sql
   -- Example: supabase/migrations/20250131120000_add_user_preferences.sql
   
   -- Your migration SQL here
   CREATE TABLE user_preferences (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     theme TEXT DEFAULT 'light',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   -- Enable RLS
   ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY "Users can view own preferences"
     ON user_preferences FOR SELECT
     USING (auth.uid() = user_id);
   ```

3. **Test the migration in QA**
   - Run the SQL in QA
   - Verify it works
   - Test the app functionality

4. **Commit the migration file**
   ```bash
   git add supabase/migrations/20250131120000_add_user_preferences.sql
   git commit -m "Add user preferences table"
   git push origin develop
   ```

### Applying Migration to Production

**Option 1: Using Supabase CLI (Recommended)**
```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to production project
supabase link --project-ref zsquagqhilzjumfjxusk

# Apply migrations
supabase db push
```

**Option 2: Manual Application**
1. Go to Production Supabase Dashboard
2. SQL Editor → New Query
3. Copy migration SQL from file
4. Run the query
5. Verify success

### Migration Rollback

If a migration fails:

```sql
-- Create a rollback migration
-- Example: supabase/migrations/20250131130000_rollback_user_preferences.sql

DROP TABLE IF EXISTS user_preferences;
```

### Migration Best Practices

1. **Always use transactions**
   ```sql
   BEGIN;
   
   -- Your changes here
   
   COMMIT;
   ```

2. **Make migrations reversible**
   - Include DROP statements in rollback migrations
   - Document what the migration does

3. **Test in QA first**
   - Never apply untested migrations to production
   - Use same database version in QA and prod

4. **Keep migrations small**
   - One logical change per migration
   - Easier to debug and rollback

5. **Include data migrations**
   ```sql
   -- After schema changes, migrate data
   UPDATE users SET status = 'active' WHERE status IS NULL;
   ```

### Common Migration Patterns

**Adding a Column**
```sql
ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0;
```

**Adding an Index**
```sql
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

**Adding RLS Policy**
```sql
CREATE POLICY "Policy name"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Creating a Function**
```sql
CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET views = views + 1 WHERE id = post_id;
END;
$$;
```

**Creating a Trigger**
```sql
CREATE TRIGGER update_timestamp
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```
