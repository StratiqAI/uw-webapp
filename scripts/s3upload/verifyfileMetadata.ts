import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

// Configuration - can be overridden by environment variables or command line args
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'stratiqai-dev-user-file-staging-53se9nf2';
const REGION = process.env.REGION || 'us-west-2';

// Expected metadata fields (as they appear in S3 - lowercase)
const EXPECTED_METADATA_FIELDS = ['tenantid', 'ownerid', 'parentid'] as const;

interface VerificationResult {
	success: boolean;
	key: string;
	bucket: string;
	metadata: Record<string, string>;
	missingFields: string[];
	hasAllMetadata: boolean;
	objectInfo?: {
		contentType?: string;
		contentLength?: number;
		lastModified?: Date;
		etag?: string;
		storageClass?: string;
	};
}

/**
 * Verifies that an S3 object has the expected metadata attached.
 * @param bucket - The S3 bucket name
 * @param key - The S3 object key
 * @returns Verification result with metadata details
 */
async function verifyFileMetadata(
	bucket: string,
	key: string
): Promise<VerificationResult> {
	const s3Client = new S3Client({ region: REGION });

	try {
		const command = new HeadObjectCommand({
			Bucket: bucket,
			Key: key
		});

		const response = await s3Client.send(command);
		const metadata = response.Metadata || {};

		// Check which expected fields are present
		const missingFields = EXPECTED_METADATA_FIELDS.filter(
			(field) => !metadata[field]
		);

		const hasAllMetadata = missingFields.length === 0;

		return {
			success: true,
			key,
			bucket,
			metadata,
			missingFields,
			hasAllMetadata,
			objectInfo: {
				contentType: response.ContentType,
				contentLength: response.ContentLength,
				lastModified: response.LastModified,
				etag: response.ETag,
				storageClass: response.StorageClass
			}
		};
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === 'NotFound' || error.message.includes('NoSuchKey')) {
				throw new Error(`Object not found: s3://${bucket}/${key}`);
			}
			throw new Error(`Failed to verify metadata: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Main function to run the verification script.
 * Usage: tsx verifyfileMetadata.ts <bucket> <key>
 * Or set environment variables: S3_BUCKET_NAME, S3_KEY
 */
async function main() {
	// Get bucket and key from command line args or environment variables
	const args = process.argv.slice(2);
	const bucket = args[0] || process.env.S3_BUCKET_NAME || BUCKET_NAME;
	const key = args[1] || process.env.S3_KEY || '';

	if (!key) {
		console.error('❌ Error: S3 object key is required');
		console.error('\nUsage:');
		console.error('  tsx verifyfileMetadata.ts <bucket> <key>');
		console.error('  or set S3_BUCKET_NAME and S3_KEY environment variables');
		console.error('\nExample:');
		console.error(
			'  tsx verifyfileMetadata.ts my-bucket user-id/project-id/filename.pdf'
		);
		process.exit(1);
	}

	console.log('🔍 Verifying S3 object metadata...\n');
	console.log(`Bucket: ${bucket}`);
	console.log(`Key: ${key}\n`);

	try {
		const result = await verifyFileMetadata(bucket, key);

		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('📋 Metadata Verification Results');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

		// Show object information
		if (result.objectInfo) {
			console.log('📄 Object Information:');
			if (result.objectInfo.contentType) {
				console.log(`   Content-Type: ${result.objectInfo.contentType}`);
			}
			if (result.objectInfo.contentLength !== undefined) {
				const sizeKB = (result.objectInfo.contentLength / 1024).toFixed(2);
				const sizeMB = (result.objectInfo.contentLength / (1024 * 1024)).toFixed(2);
				console.log(`   Size: ${result.objectInfo.contentLength} bytes (${sizeKB} KB / ${sizeMB} MB)`);
			}
			if (result.objectInfo.lastModified) {
				console.log(`   Last Modified: ${result.objectInfo.lastModified.toISOString()}`);
			}
			if (result.objectInfo.etag) {
				console.log(`   ETag: ${result.objectInfo.etag}`);
			}
			if (result.objectInfo.storageClass) {
				console.log(`   Storage Class: ${result.objectInfo.storageClass}`);
			}
			console.log('');
		}

		// Show verification status
		if (result.hasAllMetadata) {
			console.log('✅ All expected metadata fields are present!\n');
		} else {
			console.log('⚠️  Some metadata fields are missing:\n');
			result.missingFields.forEach((field) => {
				console.log(`   ❌ Missing: ${field}`);
			});
			console.log('');
		}

		// Show ALL metadata fields
		console.log('📦 All Metadata Fields:');
		if (Object.keys(result.metadata).length === 0) {
			console.log('   (none)');
		} else {
			Object.entries(result.metadata)
				.sort(([a], [b]) => a.localeCompare(b))
				.forEach(([key, value]) => {
					const isExpected = EXPECTED_METADATA_FIELDS.includes(
						key as (typeof EXPECTED_METADATA_FIELDS)[number]
					);
					const icon = isExpected ? '✓' : 'ℹ️';
					const status = isExpected ? '(expected)' : '(custom)';
					console.log(`   ${icon} ${key}: ${value} ${status}`);
				});
		}

		console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

		// Exit with appropriate code
		process.exit(result.hasAllMetadata ? 0 : 1);
	} catch (error) {
		console.error('❌ Error:', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Run the script if executed directly
main();


export { verifyFileMetadata, type VerificationResult };

