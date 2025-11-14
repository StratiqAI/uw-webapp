import type { RequestHandler } from './$types';
import { json, error as svelteError } from '@sveltejs/kit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { REGION, USER_FILE_STAGING_BUCKET, COGNITO_IDENTITY_POOL_ID, COGNITO_USER_POOL_ID } from '$env/static/private';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const { filename, contentType, projectId, fileHash, metadata } = await request.json();

  if (!projectId) {
    throw svelteError(400, 'Project ID is required');
  }

  const currentUser = locals.currentUser;
  if (!currentUser?.isAuthenticated || !currentUser.username || !currentUser.sub) {
    throw svelteError(401, 'Unauthorized');
  }

  // Get ID token from cookies
  const idToken = cookies.get('id_token');
  if (!idToken) {
    throw svelteError(401, 'Unauthorized: No ID token');
  }

  // Get credentials from Cognito Identity Pool
  const credentials = fromCognitoIdentityPool({
    clientConfig: { region: REGION },
    identityPoolId: COGNITO_IDENTITY_POOL_ID,
    logins: {
      // IMPORTANT: This exact key format
      [`cognito-idp.${REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`]: idToken,
    },
  });

  // Create S3 client
  const s3 = new S3Client({ region: REGION, credentials });

  try {
    // Create key using Cognito User Pool sub (stable user ID for DynamoDB correlation)
    const userId = currentUser.sub;
    const key = `${userId}/${projectId}/${filename}`;

    // Prepare S3 metadata - keys must be lowercase
    // Metadata will be included in the presigned URL query parameters
    const s3Metadata: Record<string, string> = {};
    if (metadata) {
      if (metadata.tenantId) s3Metadata['tenantid'] = metadata.tenantId;
      if (metadata.ownerId) s3Metadata['ownerid'] = metadata.ownerId;
      if (metadata.parentId) s3Metadata['parentid'] = metadata.parentId;
    }

    const cmd = new PutObjectCommand({
      Bucket: USER_FILE_STAGING_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'bucket-owner-full-control', // Required by bucket policy
      Metadata: Object.keys(s3Metadata).length > 0 ? s3Metadata : undefined,
      // Optional: ServerSideEncryption: "AES256",
      // Optional: ChecksumSHA256: fileHash ? Buffer.from(fileHash, 'hex').toString('base64') : undefined
    });
  
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
  
    return json({ url, key });
  } catch (err) {
    console.error('Error generating presigned URL:', err);
    throw svelteError(500, 'Could not generate upload URL');
  }
};
