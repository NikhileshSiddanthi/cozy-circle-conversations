# Multi-Image Upload Testing Guide

## Summary of Issues Fixed

### 1. **MediaUpload UI Hidden Issue**
- **Problem**: The media upload dropzone was conditionally hidden when `draftId` was not available
- **Fix**: Changed condition from `{canAddMore && draftId &&` to `{canAddMore &&` and added loading state when draftId is null
- **Result**: Users now see the upload area immediately with a loading message while draft is being created

### 2. **Multiple File Support**
- **Problem**: File input already supported multiple files correctly (`multiple: true`)
- **Verification**: The `onDrop` callback properly handles arrays of files and creates unique MediaFile objects for each
- **Result**: Multiple files are processed independently through the upload pipeline

### 3. **Upload Flow Enhancement**
- **Problem**: Upload flow was correct (init → PUT → complete) but needed better error handling
- **Fix**: Added better progress tracking and error states
- **Result**: Each file goes through its own complete upload cycle

## Testing Instructions

### Manual Testing on /test page

1. **Prerequisites**:
   - User must be signed in
   - User must have access to group `05c18a93-...`
   - Open browser DevTools to monitor console logs and network requests

2. **Test Multi-Image Upload**:
   ```
   1. Go to /test page
   2. Click "Show Test Composer" 
   3. Click "What's on your mind?" to expand composer
   4. Click "Media" tab
   5. Should see upload dropzone (may show "Initializing draft..." briefly)
   6. Select 2+ image files
   7. Monitor console for upload logs:
      - "MediaUpload: Initiating upload for: image1.jpg draftId: xxx"
      - "Upload initialized: {uploadId, uploadUrl}"
      - "File uploaded to storage successfully"
      - "Upload completed: {url, fileId}"
   8. Should see both files listed with progress bars
   9. Add title and click "Publish"
   10. Should see "Post Published" message
   ```

3. **Network Monitoring**:
   - Look for multiple POST requests to `/functions/v1/uploads` (init calls)
   - Look for multiple PUT requests to signed URLs (file uploads) 
   - Look for multiple POST requests to `/functions/v1/uploads` (complete calls)
   - Look for final POST to `/functions/v1/publish-post`

### Database Verification

After testing, run these queries to verify data integrity:

```sql
-- Check draft_media entries
SELECT id, file_id, url, status, order_index, mime_type 
FROM draft_media 
WHERE draft_id = 'YOUR_DRAFT_ID' 
ORDER BY order_index;

-- Check post_media entries after publish
SELECT id, file_id, url, status, order_index, mime_type 
FROM post_media 
WHERE post_id = 'YOUR_POST_ID' 
ORDER BY order_index;
```

### Expected Results

✅ **Success Indicators**:
- Media tab shows upload dropzone immediately (not hidden)
- Can select multiple files at once
- Each file shows individual progress bar
- All files complete upload before publishing is enabled
- Console shows separate upload flow for each file
- Network shows distinct requests for each file
- Database shows 2+ rows in draft_media and post_media
- Published post displays all images

❌ **Failure Indicators**:
- Media tab shows empty/hidden state
- Only 1 file uploads when multiple selected  
- Upload hangs or shows errors
- 401/403 errors in network requests
- Database shows only 1 row when multiple files selected

## Code Changes Made

### MediaUpload.tsx
```typescript
// OLD: Hidden when no draftId
{canAddMore && draftId && (

// NEW: Always show, with loading state  
{canAddMore && (
  // Shows "Initializing draft..." when !draftId
  // Shows upload dropzone when draftId available
```

### PostComposer.tsx  
```typescript
// Added debugging console.log for draft creation tracking
console.log('PostComposer debugging enabled for multi-image upload testing');
```

### Tests Added
- Unit tests: `src/__tests__/multi-image-upload.test.tsx`
- E2E tests: `src/__tests__/e2e/multi-image-flow.spec.ts`  
- SQL verification: `src/__tests__/verify-multi-upload.sql`

## Next Steps

1. Test the flow manually on /test page
2. Run unit tests: `npm test multi-image-upload.test.tsx`  
3. Run E2E tests: `npm run test:e2e multi-image-flow.spec.ts`
4. Verify database entries with provided SQL
5. Confirm text-only posts still work
6. Verify edit functionality preserves images correctly

The core issue was the MediaUpload UI being hidden due to draftId race condition. Now the UI is always visible with appropriate loading states, and the multiple file upload flow should work as expected.