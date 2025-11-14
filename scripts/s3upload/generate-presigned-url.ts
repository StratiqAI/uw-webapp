import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';

// Initialize the S3 client.
// Ensure your environment has AWS credentials configured (e.g., via IAM role, .env file).
const s3Client = new S3Client({ region: "us-east-1" });

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "stratiqai-dev-user-file-staging-53se9nf2";

// Define the structure of the metadata we expect from the client.
interface UploadMetadata {
  tenantId: string;
  ownerId: string;
  templateId?: string; // Optional
  parentId: string;
}

/**
 * Generates a pre-signed URL for uploading a file to S3 with specific metadata.
 * @param metadata - The metadata object provided by the client.
 * @param originalFileName - The original name of the file to be uploaded.
 * @returns An object containing the pre-signed URL and the unique key for the file.
 */
export async function generatePresignedUploadUrl(metadata: UploadMetadata, originalFileName: string) {
  // Generate a unique key for the S3 object to prevent file collisions.
  const uniqueKey = `uploads/${uuidv4()}/${originalFileName}`;

  // S3 metadata keys must be lowercase and prefixed with 'x-amz-meta-'.
  // We transform our camelCase keys into a valid S3 metadata object.
  const s3Metadata: Record<string, string> = {
    'tenantid': metadata.tenantId,
    'ownerid': metadata.ownerId,
    'parentid': metadata.parentId,
  };
  if (metadata.templateId) {
    s3Metadata['templateid'] = metadata.templateId;
  }

  // Create the command to put an object in S3.
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    // Attach the metadata to the command. This ensures the uploaded object has these tags.
    Metadata: s3Metadata,
  });

  try {
    // Generate the pre-signed URL. It's valid for 5 minutes by default.
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    console.log("Successfully generated a pre-signed URL.");

    return {
      presignedUrl: signedUrl,
      key: uniqueKey, // Return the key so the client knows where the file will be.
    };
  } catch (error) {
    console.error("Error generating pre-signed URL", error);
    throw new Error("Could not generate upload URL.");
  }
}