# Troubleshooting S3 Metadata Upload Issues

## Problem
Metadata is not being attached to files uploaded through the DocumentUpload component, but standalone scripts work correctly.

## Debugging Steps

### 1. Check Browser Console Logs

When uploading a file, check the browser console for these log messages:

- `[DocumentUpload] Metadata received:` - Should show the metadata object
- `[DocumentUpload] Got presigned URL for <filename>, key: <key>` - Confirms presigned URL was received
- `[DocumentUpload] Metadata to be sent:` - Should show the metadata that will be sent
- `[DocumentUpload] Setting metadata headers for <filename>:` - Confirms headers are being set
- `[DocumentUpload] Upload successful for <filename>` - Confirms upload completed

**If you see "WARNING: No metadata provided"**, the metadata is not being passed correctly to the uploader.

### 2. Check Server Logs

Check your server console for:
- `Generated presigned URL for key: <key>`
- `Metadata included in presigned URL: { tenantid: '...', ownerid: '...', parentid: '...' }`

**If metadata is not logged**, the API endpoint is not receiving metadata.

### 3. Verify Metadata Flow

1. **Component Level** (`get-started/+page.svelte`):
   - Check that `fileMetadata` is not null
   - Verify `currentUser.sub` and `projectId` are available
   - Add: `console.log('fileMetadata:', fileMetadata)`

2. **Uploader Store** (`uploader.store.svelte.ts`):
   - Check that `fileMetadata` is not null when `uploadFile` is called
   - Verify metadata is passed to `getPresignedUrl`
   - Verify metadata is passed to `uploadToS3`

### 4. Network Inspection

Open browser DevTools → Network tab:

1. Find the request to `/api/s3-presigned`
   - Check Request Payload - should include `metadata` object
   - Check Response - should include `url` and `key`

2. Find the PUT request to S3 (the presigned URL)
   - Check Request Headers - should include:
     - `x-amz-meta-tenantid: <value>`
     - `x-amz-meta-ownerid: <value>`
     - `x-amz-meta-parentid: <value>`
   - Check Response Status - should be 200

**If headers are missing**, XMLHttpRequest is not setting them correctly.

### 5. Common Issues

#### Issue: Metadata is null/undefined
**Symptoms**: Console shows "WARNING: No metadata provided"
**Solution**: 
- Check that `currentUser.sub` exists
- Check that `projectId` is not null
- Verify `fileMetadata` is being passed to `DocumentUpload` component

#### Issue: Headers not being sent
**Symptoms**: Network tab shows PUT request without metadata headers
**Possible Causes**:
- CORS preflight might be blocking headers
- XMLHttpRequest might not support custom headers
- Headers might be getting stripped

**Solution**: Try using `fetch` instead of XMLHttpRequest (see alternative implementation below)

#### Issue: Signature mismatch
**Symptoms**: Upload fails with 403 Forbidden or signature error
**Possible Causes**:
- Headers don't match what was signed
- Header order matters (should be alphabetical)
- Header values don't match exactly

**Solution**: Ensure headers match exactly what was signed in presigned URL

### 6. Alternative: Use Fetch API

If XMLHttpRequest isn't working, try using `fetch` instead:

```typescript
async function uploadToS3WithFetch(
  url: string,
  file: File,
  metadata: FileMetadata | null
): Promise<void> {
  const headers: HeadersInit = {
    'Content-Type': file.type || 'application/pdf'
  };

  if (metadata) {
    headers['x-amz-meta-tenantid'] = metadata.tenantId;
    headers['x-amz-meta-ownerid'] = metadata.ownerId;
    headers['x-amz-meta-parentid'] = metadata.parentId;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: file
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}
```

### 7. Verify Metadata on S3

After upload, verify metadata was attached:

```bash
tsx scripts/s3upload/verifyfileMetadata.ts <bucket> <key>
```

Or use AWS CLI:
```bash
aws s3api head-object --bucket <bucket> --key <key>
```

Look for `Metadata` section in the output.

## Quick Test

Add this to your browser console after uploading:

```javascript
// Check if metadata was passed
console.log('Check uploader metadata:', window.__uploaderDebug);
```

Then add this temporary debug code to `uploader.store.svelte.ts`:

```typescript
// Temporary debug - remove after troubleshooting
if (typeof window !== 'undefined') {
  (window as any).__uploaderDebug = {
    metadata: fileMetadata,
    hasMetadata: !!fileMetadata
  };
}
```

