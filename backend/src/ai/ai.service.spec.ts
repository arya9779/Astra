import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

// Mock OpenAI
const mockOpenAI = {
  moderations: {
    create: jest.fn(),
  },
};

// Mock Hugging Face
const mockHuggingFace = {
  imageClassification: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockOpenAI),
  };
});

jest.mock('@huggingface/inference', () => {
  return {
    HfInference: jest.fn().mockImplementation(() => mockHuggingFace),
  };
});

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'OPENAI_API_KEY':
                  return 'test-openai-key';
                case 'HUGGINGFACE_API_KEY':
                  return 'test-hf-key';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('moderateText', () => {
    it('should return flagged content when OpenAI detects violations', async () => {
      const mockResponse = {
        results: [
          {
            flagged: true,
            categories: {
              hate: true,
              violence: false,
              sexual: false,
              'self-harm': false,
              harassment: false,
            },
            category_scores: {
              hate: 0.8,
              violence: 0.1,
              sexual: 0.05,
              'self-harm': 0.02,
              harassment: 0.15,
            },
          },
        ],
      };

      mockOpenAI.moderations.create.mockResolvedValue(mockResponse);

      const result = await service.moderateText('This is hate speech content');

      expect(result.flagged).toBe(true);
      expect(result.confidence).toBe(0.8);
      expect(result.categories.hate).toBe(0.8);
      expect(result.reason).toContain('hate');
    });

    it('should return clean content when OpenAI finds no violations', async () => {
      const mockResponse = {
        results: [
          {
            flagged: false,
            categories: {
              hate: false,
              violence: false,
              sexual: false,
              'self-harm': false,
              harassment: false,
            },
            category_scores: {
              hate: 0.01,
              violence: 0.02,
              sexual: 0.01,
              'self-harm': 0.01,
              harassment: 0.02,
            },
          },
        ],
      };

      mockOpenAI.moderations.create.mockResolvedValue(mockResponse);

      const result = await service.moderateText('This is a normal, clean message');

      expect(result.flagged).toBe(false);
      expect(result.confidence).toBe(0.02);
      expect(result.reason).toBeUndefined();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.moderations.create.mockRejectedValue(new Error('API Error'));

      await expect(service.moderateText('test content')).rejects.toThrow('Text moderation failed');
    });

    it('should return safe default when OpenAI is not configured', async () => {
      // Create service without OpenAI key
      const moduleWithoutOpenAI = await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'HUGGINGFACE_API_KEY') return 'test-hf-key';
                return undefined; // No OpenAI key
              }),
            },
          },
        ],
      }).compile();

      const serviceWithoutOpenAI = moduleWithoutOpenAI.get<AiService>(AiService);
      const result = await serviceWithoutOpenAI.moderateText('test content');

      expect(result.flagged).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('detectDeepfake', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake image data'])),
      });
    });

    it('should detect potential deepfakes in images', async () => {
      const mockResponse = [
        {
          label: 'deepfake',
          score: 0.85,
        },
      ];

      mockHuggingFace.imageClassification.mockResolvedValue(mockResponse);

      const result = await service.detectDeepfake('http://example.com/image.jpg', 'image');

      expect(result.isDeepfake).toBe(true);
      expect(result.confidence).toBe(0.85);
      expect(result.reason).toContain('deepfake detected');
    });

    it('should return clean result for authentic images', async () => {
      const mockResponse = [
        {
          label: 'authentic',
          score: 0.3,
        },
      ];

      mockHuggingFace.imageClassification.mockResolvedValue(mockResponse);

      const result = await service.detectDeepfake('http://example.com/image.jpg', 'image');

      expect(result.isDeepfake).toBe(false);
      expect(result.confidence).toBe(0.3);
    });

    it('should handle video content gracefully', async () => {
      const result = await service.detectDeepfake('http://example.com/video.mp4', 'video');

      expect(result.isDeepfake).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Video deepfake detection not available');
    });

    it('should handle Hugging Face API errors gracefully', async () => {
      mockHuggingFace.imageClassification.mockRejectedValue(new Error('API Error'));

      const result = await service.detectDeepfake('http://example.com/image.jpg', 'image');

      expect(result.isDeepfake).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('Deepfake detection failed');
    });

    it('should return safe default when Hugging Face is not configured', async () => {
      // Create service without HF key
      const moduleWithoutHF = await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'OPENAI_API_KEY') return 'test-openai-key';
                return undefined; // No HF key
              }),
            },
          },
        ],
      }).compile();

      const serviceWithoutHF = moduleWithoutHF.get<AiService>(AiService);
      const result = await serviceWithoutHF.detectDeepfake('http://example.com/image.jpg', 'image');

      expect(result.isDeepfake).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('checkMisinformation', () => {
    it('should detect potential misinformation based on keywords', async () => {
      const result = await service.checkMisinformation('This is fake news and a conspiracy theory');

      expect(result.isMisinformation).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reason).toContain('misinformation indicators');
    });

    it('should return clean result for normal content', async () => {
      const result = await service.checkMisinformation('This is a normal news article about technology');

      expect(result.isMisinformation).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle errors gracefully', async () => {
      // Force an error by passing invalid input
      const result = await service.checkMisinformation('');

      expect(result.isMisinformation).toBe(false);
    });
  });

  describe('moderateContent', () => {
    beforeEach(() => {
      // Mock successful text moderation
      mockOpenAI.moderations.create.mockResolvedValue({
        results: [
          {
            flagged: false,
            categories: {
              hate: false,
              violence: false,
              sexual: false,
              'self-harm': false,
              harassment: false,
            },
            category_scores: {
              hate: 0.01,
              violence: 0.02,
              sexual: 0.01,
              'self-harm': 0.01,
              harassment: 0.02,
            },
          },
        ],
      });

      // Mock fetch for media
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake image data'])),
      });

      // Mock deepfake detection
      mockHuggingFace.imageClassification.mockResolvedValue([
        {
          label: 'authentic',
          score: 0.3,
        },
      ]);
    });

    it('should approve clean content', async () => {
      const result = await service.moderateContent('This is a clean message');

      expect(result.approved).toBe(true);
      expect(result.flags).toHaveLength(0);
      expect(result.requiresManualReview).toBe(false);
    });

    it('should flag inappropriate content for manual review', async () => {
      // Mock flagged text content
      mockOpenAI.moderations.create.mockResolvedValue({
        results: [
          {
            flagged: true,
            categories: {
              hate: true,
              violence: false,
              sexual: false,
              'self-harm': false,
              harassment: false,
            },
            category_scores: {
              hate: 0.7, // Below auto-reject threshold
              violence: 0.1,
              sexual: 0.05,
              'self-harm': 0.02,
              harassment: 0.15,
            },
          },
        ],
      });

      const result = await service.moderateContent('Inappropriate content');

      expect(result.approved).toBe(false);
      expect(result.flags).toContain('inappropriate_content');
      expect(result.requiresManualReview).toBe(true);
      expect(result.confidence).toBe(0.7);
    });

    it('should auto-reject content with high confidence violations', async () => {
      // Mock high-confidence violation
      mockOpenAI.moderations.create.mockResolvedValue({
        results: [
          {
            flagged: true,
            categories: {
              hate: true,
              violence: false,
              sexual: false,
              'self-harm': false,
              harassment: false,
            },
            category_scores: {
              hate: 0.98, // Above auto-reject threshold
              violence: 0.1,
              sexual: 0.05,
              'self-harm': 0.02,
              harassment: 0.15,
            },
          },
        ],
      });

      const result = await service.moderateContent('Extremely inappropriate content');

      expect(result.approved).toBe(false);
      expect(result.flags).toContain('inappropriate_content');
      expect(result.requiresManualReview).toBe(false);
      expect(result.confidence).toBe(0.98);
    });

    it('should handle content with media', async () => {
      const mediaUrls = ['http://example.com/image.jpg'];
      
      const result = await service.moderateContent(
        'Content with image',
        mediaUrls,
        'image'
      );

      expect(result).toBeDefined();
      expect(mockHuggingFace.imageClassification).toHaveBeenCalled();
    });

    it('should require manual review on moderation errors', async () => {
      // Force an error in text moderation
      mockOpenAI.moderations.create.mockRejectedValue(new Error('API Error'));

      const result = await service.moderateContent('Test content');

      expect(result.approved).toBe(false);
      expect(result.flags).toContain('moderation_error');
      expect(result.requiresManualReview).toBe(true);
      expect(result.reason).toContain('moderation failed');
    });
  });
});