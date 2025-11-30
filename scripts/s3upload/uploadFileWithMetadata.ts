import fetch from 'node-fetch';
import { Blob } from 'buffer'; // Use Blob for creating file-like objects in Node.js

// This is a placeholder for your backend API endpoint.
const BACKEND_API_ENDPOINT = "http://localhost:3000/generate-upload-url";
const PUBLIC_GRAPHQL_HTTP_ENDPOINT = "https://m7iq4vqmt5bnxfyyx64xxctq2y.appsync-api.us-west-2.amazonaws.com/graphql";
// The metadata we want to attach to our S3 object.
const fileMetadata = {
  tenantId: "acme-corp",
  ownerId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  parentId: "PROJECT#123"
};

/**
 * Main function to orchestrate the file upload process.
 */
async function uploadFile() {
  // 1. Create a dummy file to upload. In a real app, this would
  // come from an <input type="file"> element.
  const fileContent = "This is the content of my test file.";
  const fileName = "test-document.txt";
  const file = new Blob([fileContent], { type: "text/plain" });

  console.log("Step 1: Requesting a pre-signed URL from the backend...");

  try {
    // 2. Request the pre-signed URL from our secure backend service.
    const response = await fetch(BACKEND_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: fileName,
        metadata: fileMetadata
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.statusText}`);
    }

    const { presignedUrl, key } = await response.json() as { presignedUrl: string, key: string };
    console.log("Successfully received pre-signed URL.");
    console.log(`File will be uploaded to key: ${key}`);

    // 3. Upload the file directly to S3 using the received pre-signed URL.
    console.log("\nStep 2: Uploading file directly to S3...");
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (uploadResponse.ok) {
      console.log("✅ File uploaded successfully to S3!");
      // The ETag header is a good sign of a successful upload.
      console.log("ETag:", uploadResponse.headers.get('etag'));
    } else {
      const errorText = await uploadResponse.text();
      throw new Error(`S3 upload failed: ${uploadResponse.statusText}\n${errorText}`);
    }
  } catch (error) {
    console.error("❌ An error occurred during the upload process:", error);
  }
}

// Run the upload process.
uploadFile();