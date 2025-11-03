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

  // Create key
  const key = `${currentUser.username}/${projectId}/${filename}`;

  try {
    // Use the same presigner logic in all environments for consistency
    const creds = await s3.config.credentials();   // resolves env/role creds uniformly
    const region = await s3.config.region();

    const cmd = new PutObjectCommand ({
      Bucket: USER_FILE_STAGING_BUCKET,
      Key: key,
      ContentType: contentType,
      // Optional: ServerSideEncryption: "AES256",
      // Optional: ChecksumSHA256: "<BASE64_SHA256>"
    });
  
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
    console.log(url);
  
    return json({ url, key });
  } catch (err) {
    console.error('Error generating presigned URL:', err);
    throw svelteError(500, 'Could not generate upload URL');
  }
};
