import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pinataSDK from '@pinata/sdk';
import { S3 } from 'aws-sdk';
import { Readable } from 'stream';

export interface UploadResult {
  ipfsHash?: string;
  s3Url?: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private pinata: any;
  private s3: S3;

  constructor(private configService: ConfigService) {
    // Initialize Pinata client
    const pinataApiKey = this.configService.get<string>('PINATA_API_KEY');
    const pinataSecretKey = this.configService.get<string>('PINATA_SECRET_KEY');
    
    if (pinataApiKey && pinataSecretKey) {
      this.pinata = new pinataSDK(pinataApiKey, pinataSecretKey);
    }

    // Initialize S3 client for backup
    const awsAccessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const awsSecretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const awsRegion = this.configService.get<string>('AWS_REGION');

    if (awsAccessKey && awsSecretKey && awsRegion) {
      this.s3 = new S3({
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        region: awsRegion,
      });
    }
  }

  async uploadToIPFS(file: Express.Multer.File): Promise<UploadResult> {
    try {
      let ipfsHash: string | undefined;
      let s3Url: string | undefined;

      // Try uploading to IPFS first
      if (this.pinata) {
        try {
          const stream = Readable.from(file.buffer);
          const options = {
            pinataMetadata: {
              name: file.originalname,
            },
            pinataOptions: {
              cidVersion: 0,
            },
          };

          const result = await this.pinata.pinFileToIPFS(stream, options);
          ipfsHash = result.IpfsHash;
          this.logger.log(`File uploaded to IPFS: ${ipfsHash}`);
        } catch (ipfsError) {
          this.logger.warn(`IPFS upload failed: ${ipfsError.message}`);
        }
      }

      // Fallback to S3 if IPFS fails or is not configured
      if (!ipfsHash && this.s3) {
        try {
          const bucketName = this.configService.get<string>('AWS_S3_BUCKET');
          const key = `content/${Date.now()}-${file.originalname}`;

          const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
          };

          const result = await this.s3.upload(uploadParams).promise();
          s3Url = result.Location;
          this.logger.log(`File uploaded to S3: ${s3Url}`);
        } catch (s3Error) {
          this.logger.error(`S3 upload failed: ${s3Error.message}`);
          return {
            success: false,
            error: 'Failed to upload file to both IPFS and S3',
          };
        }
      }

      if (!ipfsHash && !s3Url) {
        return {
          success: false,
          error: 'No storage service configured',
        };
      }

      return {
        ipfsHash,
        s3Url,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadTextToIPFS(content: string, filename: string): Promise<UploadResult> {
    try {
      let ipfsHash: string | undefined;

      if (this.pinata) {
        try {
          const options = {
            pinataMetadata: {
              name: filename,
            },
          };

          const result = await this.pinata.pinJSONToIPFS({ content }, options);
          ipfsHash = result.IpfsHash;
          this.logger.log(`Text content uploaded to IPFS: ${ipfsHash}`);
        } catch (ipfsError) {
          this.logger.warn(`IPFS text upload failed: ${ipfsError.message}`);
        }
      }

      if (!ipfsHash) {
        return {
          success: false,
          error: 'IPFS not configured or upload failed',
        };
      }

      return {
        ipfsHash,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Text upload failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getIPFSUrl(hash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
}