import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';
import {
  ModerationResult,
  DeepfakeResult,
  MisinformationResult,
  ContentModerationResult,
} from './dto/moderation.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly hf: HfInference;

  constructor(private configService: ConfigService) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const hfApiKey = this.configService.get<string>('HUGGINGFACE_API_KEY');

    if (!openaiApiKey) {
      this.logger.warn('OpenAI API key not found. Text moderation will be disabled.');
    } else {
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
      });
    }

    if (!hfApiKey) {
      this.logger.warn('Hugging Face API key not found. Deepfake detection will be disabled.');
    } else {
      this.hf = new HfInference(hfApiKey);
    }
  }

  /**
   * Moderate text content using OpenAI Moderation API
   */
  async moderateText(content: string): Promise<ModerationResult> {
    try {
      if (!this.openai) {
        this.logger.warn('OpenAI not configured, skipping text moderation');
        return {
          flagged: false,
          confidence: 0,
          categories: {
            hate: 0,
            violence: 0,
            sexual: 0,
            selfHarm: 0,
            harassment: 0,
          },
        };
      }

      const response = await this.openai.moderations.create({
        input: content,
      });

      const result = response.results[0];
      
      // Calculate overall confidence as the highest category score
      const categoryScores = result.category_scores;
      const maxScore = Math.max(
        categoryScores.hate,
        categoryScores.violence,
        categoryScores.sexual,
        categoryScores['self-harm'],
        categoryScores.harassment,
      );

      const moderationResult: ModerationResult = {
        flagged: result.flagged,
        confidence: maxScore,
        categories: {
          hate: categoryScores.hate,
          violence: categoryScores.violence,
          sexual: categoryScores.sexual,
          selfHarm: categoryScores['self-harm'],
          harassment: categoryScores.harassment,
        },
      };

      if (result.flagged) {
        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category, _]) => category);
        moderationResult.reason = `Content flagged for: ${flaggedCategories.join(', ')}`;
      }

      this.logger.debug(`Text moderation result: flagged=${result.flagged}, confidence=${maxScore}`);
      return moderationResult;
    } catch (error) {
      this.logger.error('Error in text moderation:', error);
      throw new Error('Text moderation failed');
    }
  }

  /**
   * Detect deepfakes in images/videos using Hugging Face models
   */
  async detectDeepfake(mediaUrl: string, mediaType: 'image' | 'video'): Promise<DeepfakeResult> {
    try {
      if (!this.hf) {
        this.logger.warn('Hugging Face not configured, skipping deepfake detection');
        return {
          isDeepfake: false,
          confidence: 0,
        };
      }

      // For images, use a deepfake detection model
      if (mediaType === 'image') {
        // Using a generic image classification model as placeholder
        // In production, you'd use a specialized deepfake detection model
        const response = await this.hf.imageClassification({
          data: await this.fetchMediaAsBlob(mediaUrl),
          model: 'microsoft/DialoGPT-medium', // This is a placeholder - use actual deepfake detection model
        });

        // This is a simplified implementation
        // In reality, you'd need a model specifically trained for deepfake detection
        const confidence = response[0]?.score || 0;
        const isDeepfake = confidence > 0.7; // Threshold for deepfake detection

        return {
          isDeepfake,
          confidence,
          reason: isDeepfake ? 'Potential deepfake detected by AI analysis' : undefined,
        };
      }

      // For videos, we'd need more sophisticated processing
      // This is a placeholder implementation
      this.logger.warn('Video deepfake detection not fully implemented');
      return {
        isDeepfake: false,
        confidence: 0,
        reason: 'Video deepfake detection not available',
      };
    } catch (error) {
      this.logger.error('Error in deepfake detection:', error);
      // Don't throw error, return safe default
      return {
        isDeepfake: false,
        confidence: 0,
        reason: 'Deepfake detection failed',
      };
    }
  }

  /**
   * Check content for misinformation using AI analysis
   */
  async checkMisinformation(content: string): Promise<MisinformationResult> {
    try {
      // This is a placeholder implementation
      // In production, you'd use a model specifically trained for misinformation detection
      // or integrate with fact-checking APIs
      
      // Simple heuristic: check for common misinformation patterns
      const misinformationKeywords = [
        'fake news',
        'conspiracy',
        'hoax',
        'debunked',
        'false claim',
      ];

      const lowerContent = content.toLowerCase();
      const hasKeywords = misinformationKeywords.some(keyword => 
        lowerContent.includes(keyword)
      );

      // This is a very basic implementation
      // Real implementation would use sophisticated NLP models
      const confidence = hasKeywords ? 0.6 : 0.1;
      const isMisinformation = confidence > 0.5;

      return {
        isMisinformation,
        confidence,
        reason: isMisinformation ? 'Content contains potential misinformation indicators' : undefined,
      };
    } catch (error) {
      this.logger.error('Error in misinformation detection:', error);
      return {
        isMisinformation: false,
        confidence: 0,
        reason: 'Misinformation detection failed',
      };
    }
  }

  /**
   * Comprehensive content moderation combining all AI checks
   */
  async moderateContent(
    content: string,
    mediaUrls?: string[],
    mediaType?: string,
  ): Promise<ContentModerationResult> {
    try {
      const results = await Promise.allSettled([
        this.moderateText(content),
        this.checkMisinformation(content),
        // Only check deepfakes if media is present
        ...(mediaUrls && mediaUrls.length > 0 && mediaType
          ? [this.detectDeepfake(mediaUrls[0], mediaType as 'image' | 'video')]
          : []),
      ]);

      const textModerationResult = results[0].status === 'fulfilled' 
        ? results[0].value as ModerationResult 
        : null;
      
      const misinformationResult = results[1].status === 'fulfilled' 
        ? results[1].value as MisinformationResult 
        : null;
      
      const deepfakeResult = results[2]?.status === 'fulfilled' 
        ? results[2].value as DeepfakeResult 
        : null;

      // Determine overall moderation result
      const flags: string[] = [];
      let maxConfidence = 0;
      let requiresManualReview = false;

      if (textModerationResult?.flagged) {
        flags.push('inappropriate_content');
        maxConfidence = Math.max(maxConfidence, textModerationResult.confidence);
      }

      if (misinformationResult?.isMisinformation) {
        flags.push('misinformation');
        maxConfidence = Math.max(maxConfidence, misinformationResult.confidence);
      }

      if (deepfakeResult?.isDeepfake) {
        flags.push('deepfake');
        maxConfidence = Math.max(maxConfidence, deepfakeResult.confidence);
      }

      // Auto-reject if confidence > 95%
      const autoReject = maxConfidence > 0.95;
      
      // Require manual review if flagged but not auto-rejected
      requiresManualReview = flags.length > 0 && !autoReject;

      const approved = flags.length === 0 || (!autoReject && !requiresManualReview);

      return {
        approved,
        confidence: maxConfidence,
        flags,
        reason: flags.length > 0 ? `Content flagged for: ${flags.join(', ')}` : undefined,
        requiresManualReview,
      };
    } catch (error) {
      this.logger.error('Error in content moderation:', error);
      // Default to manual review on error
      return {
        approved: false,
        confidence: 0,
        flags: ['moderation_error'],
        reason: 'Content moderation failed, requires manual review',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Helper method to fetch media as blob for AI processing
   */
  private async fetchMediaAsBlob(url: string): Promise<Blob> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      this.logger.error('Error fetching media:', error);
      throw new Error('Failed to fetch media for analysis');
    }
  }
}