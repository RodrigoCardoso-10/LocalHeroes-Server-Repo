import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiSupportService {
  private readonly logger = new Logger(AiSupportService.name);
  private genAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'Google AI API key not found. AI support will not be available.',
      );
      return;
    }

    this.genAI = new GoogleGenAI({ apiKey });
    // No need to initialize model here, we'll use client.models.generateContent directly
  }
  async generateResponse(userMessage: string, context?: any): Promise<string> {
    if (!this.genAI) {
      throw new Error(
        'AI service not initialized. Please check your API key configuration.',
      );
    }

    try {
      const prompt = this.buildPrompt(userMessage, context);
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      return (
        result.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Sorry, I could not generate a response.'
      );
    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      throw new Error(
        'Failed to generate AI response. Please try again or contact human support.',
      );
    }
  }

  private buildPrompt(userMessage: string, context?: any): string {
    const systemPrompt = `You are a helpful customer support agent for LocalHeroes, a local service marketplace app. 
    LocalHeroes connects people who need help with local services (like cleaning, gardening, handyman work, etc.) with skilled local service providers.

    Key features of LocalHeroes:
    - Users can post jobs they need help with
    - Service providers can browse and apply for jobs
    - Secure payment system with escrow
    - Review and rating system
    - User profiles with skills and experience
    - Real-time messaging between users
    - Job management and tracking

    Please provide helpful, friendly, and accurate assistance. If you don't know something specific about the app, suggest they contact human support or check the app's help section.
    Keep responses concise and actionable.

    User message: ${userMessage}

    ${context ? `Additional context: ${JSON.stringify(context)}` : ''}

    Response:`;

    return systemPrompt;
  }

  async getChatSuggestions(): Promise<string[]> {
    return [
      'How do I post a job?',
      'How does payment work?',
      'How can I become a service provider?',
      'How do I contact someone about a job?',
      'What if I have issues with a service provider?',
      'How do I leave a review?',
      'How do I update my profile?',
      'What types of services are available?',
    ];
  }
}
