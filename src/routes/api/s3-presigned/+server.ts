import type { RequestHandler } from './$types';
import { json, error as svelteError } from '@sveltejs/kit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { REGION, USER_FILE_STAGING_BUCKET, COGNITO_IDENTITY_POOL_ID, COGNITO_USER_POOL_ID } from '$env/static/private';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const { filename, contentType, projectId } = await request.json();

  const currentUser = locals.currentUser;
  if (!currentUser?.isAuthenticated || !currentUser.username) {
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
    // Resolve credentials to get the Cognito Identity ID
    const resolvedCreds = await credentials();
    const identityId = resolvedCreds.identityId;
    
    if (!identityId) {
      throw svelteError(401, 'Could not resolve identity ID');
    }

    // Create key using Cognito Identity ID (matches bucket policy requirement)
    const key = `${identityId}/${projectId}/${filename}`;

    const cmd = new PutObjectCommand({
      Bucket: USER_FILE_STAGING_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'bucket-owner-full-control', // Required by bucket policy
      // Optional: ServerSideEncryption: "AES256",
      // Optional: ChecksumSHA256: "<BASE64_SHA256>"
    });
  
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
    console.log('Generated presigned URL for key:', key);
  
    return json({ url, key });
  } catch (err) {
    console.error('Error generating presigned URL:', err);
    throw svelteError(500, 'Could not generate upload URL');
  }
};
