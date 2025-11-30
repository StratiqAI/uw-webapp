import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration - can be overridden by environment variables or command line args
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'stratiqai-dev-user-file-staging-53se9nf2';
const REGION = process.env.REGION || 'us-west-2';

// File metadata structure
interface FileMetadata {
	tenantId: string;
	ownerId: string;
	parentId: string;
}

interface UploadOptions {
	bucket: string;
	key?: string; // Optional - will generate if not provided
	filePath: string;
	metadata: FileMetadata;
	contentType?: string;
}

/**
 * Uploads a file directly to S3 with metadata attached.
 * @param options - Upload configuration options
 * @returns The S3 key where the file was uploaded
 */
async function uploadFileWithMetadata(options: UploadOptions): Promise<string> {
	const s3Client = new S3Client({ region: REGION });

	// Read the file
	let fileContent: Buffer;
	try {
		fileContent = readFileSync(options.filePath);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to read file: ${error.message}`);
		}
		throw error;
	}

	// Determine content type
	const fileName = basename(options.filePath);
	const contentType =
		options.contentType ||
		getContentType(fileName) ||
		'application/octet-stream';

	// Generate key if not provided
	const key =
		options.key ||
		`${options.metadata.ownerId}/${options.metadata.parentId}/${fileName}`;

	// Prepare S3 metadata - keys must be lowercase
	const s3Metadata: Record<string, string> = {
		tenantid: options.metadata.tenantId,
		ownerid: options.metadata.ownerId,
		parentid: options.metadata.parentId
	};

	// Create the PutObject command
	const command = new PutObjectCommand({
		Bucket: options.bucket,
		Key: key,
		Body: fileContent,
		ContentType: contentType,
		Metadata: s3Metadata,
		ACL: 'bucket-owner-full-control' // Required by bucket policy
	});

	try {
		console.log(`📤 Uploading file to S3...`);
		console.log(`   Bucket: ${options.bucket}`);
		console.log(`   Key: ${key}`);
		console.log(`   Content-Type: ${contentType}`);
		console.log(`   Size: ${(fileContent.length / 1024).toFixed(2)} KB\n`);

		const response = await s3Client.send(command);

		console.log('✅ File uploaded successfully!');
		console.log(`   ETag: ${response.ETag}`);
		console.log(`   Location: s3://${options.bucket}/${key}\n`);

		return key;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to upload file: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Determines content type based on file extension.
 */
function getContentType(fileName: string): string | undefined {
	const ext = fileName.toLowerCase().split('.').pop();
	const contentTypes: Record<string, string> = {
		pdf: 'application/pdf',
		txt: 'text/plain',
		json: 'application/json',
		xml: 'application/xml',
		csv: 'text/csv',
		html: 'text/html',
		css: 'text/css',
		js: 'application/javascript',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		zip: 'application/zip',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	};
	return ext ? contentTypes[ext] : undefined;
}

/**
 * Parses metadata from command line arguments or environment variables.
 */
function parseMetadata(): FileMetadata {
	// Try to parse from environment variables first
	const envMetadata = {
		tenantId: process.env.TENANT_ID,
		ownerId: process.env.OWNER_ID,
		parentId: process.env.PARENT_ID
	};

	if (envMetadata.tenantId && envMetadata.ownerId && envMetadata.parentId) {
		return envMetadata as FileMetadata;
	}

	// Default test values if not provided
	return {
		tenantId: 'acme-corp',
		ownerId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
		parentId: 'PROJECT#123'
	};
}

/**
 * Main function to run the upload script.
 * Usage: tsx uploadFileDirect.ts <file-path> [bucket] [tenantId] [ownerId] [parentId]
 * Or set environment variables: S3_BUCKET_NAME, TENANT_ID, OWNER_ID, PARENT_ID
 */
async function main() {
	const args = process.argv.slice(2);
	const filePath = args[0];
	const bucket = args[1] || process.env.S3_BUCKET_NAME || BUCKET_NAME;

	if (!filePath) {
		console.error('❌ Error: File path is required\n');
		console.error('Usage:');
		console.error('  tsx uploadFileDirect.ts <file-path> [bucket] [tenantId] [ownerId] [parentId]');
		console.error('\nOr set environment variables:');
		console.error('  S3_BUCKET_NAME, TENANT_ID, OWNER_ID, PARENT_ID\n');
		console.error('Examples:');
		console.error(
			'  tsx uploadFileDirect.ts ./test-document.txt my-bucket acme-corp user-123 PROJECT#456'
		);
		console.error(
			'  S3_BUCKET_NAME=my-bucket TENANT_ID=acme-corp OWNER_ID=user-123 PARENT_ID=PROJECT#456 tsx uploadFileDirect.ts ./test-document.txt'
		);
		process.exit(1);
	}

	// Parse metadata from args or env
	const metadata: FileMetadata =
		args.length >= 5
			? {
					tenantId: args[2],
					ownerId: args[3],
					parentId: args[4]
				}
			: parseMetadata();

	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('📤 S3 File Upload with Metadata');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
	console.log('File:', filePath);
	console.log('Metadata:');
	console.log(`  tenantId: ${metadata.tenantId}`);
	console.log(`  ownerId: ${metadata.ownerId}`);
	console.log(`  parentId: ${metadata.parentId}\n`);

	try {
		const key = await uploadFileWithMetadata({
			bucket,
			filePath,
			metadata
		});

		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('✨ Upload complete!');
		console.log(`\nVerify metadata with:`);
		console.log(`  tsx verifyfileMetadata.ts ${bucket} ${key}`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

		process.exit(0);
	} catch (error) {
		console.error('\n❌ Error:', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

// Run the script if executed directly
main();

export { uploadFileWithMetadata, type FileMetadata, type UploadOptions };

