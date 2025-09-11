import {
  WeddingFileCategory,
  AIAnalysisResult,
  WeddingContext,
  FaceDetectionResult,
  SceneRecognitionResult,
  QualityAnalysisResult,
} from '@/types/file-management';

// OpenAI integration for image analysis
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function categorizeFile(
  file: File,
  weddingContext?: WeddingContext,
): Promise<WeddingFileCategory> {
  try {
    // Analyze filename patterns first
    const filename = file.name.toLowerCase();
    const fileType = file.type;

    // Document categorization
    if (
      fileType.includes('pdf') ||
      fileType.includes('document') ||
      fileType.includes('text')
    ) {
      if (filename.includes('contract') || filename.includes('agreement')) {
        return WeddingFileCategory.CONTRACTS;
      }
      if (
        filename.includes('invoice') ||
        filename.includes('bill') ||
        filename.includes('payment')
      ) {
        return WeddingFileCategory.INVOICES;
      }
      if (
        filename.includes('timeline') ||
        filename.includes('schedule') ||
        filename.includes('itinerary')
      ) {
        return WeddingFileCategory.TIMELINE;
      }
      if (
        filename.includes('guest') ||
        filename.includes('list') ||
        filename.includes('rsvp')
      ) {
        return WeddingFileCategory.GUEST_LIST;
      }
      return WeddingFileCategory.VENDOR_FILES;
    }

    // Audio categorization
    if (fileType.startsWith('audio/')) {
      return WeddingFileCategory.MUSIC_PLAYLIST;
    }

    // Video categorization
    if (fileType.startsWith('video/')) {
      if (
        filename.includes('ceremony') ||
        filename.includes('vows') ||
        filename.includes('processional')
      ) {
        return WeddingFileCategory.CEREMONY_VIDEO;
      }
      if (
        filename.includes('reception') ||
        filename.includes('party') ||
        filename.includes('dancing')
      ) {
        return WeddingFileCategory.RECEPTION_VIDEO;
      }
      if (
        filename.includes('speech') ||
        filename.includes('toast') ||
        filename.includes('vows')
      ) {
        return WeddingFileCategory.SPEECHES_VIDEO;
      }
      return WeddingFileCategory.CEREMONY_VIDEO; // Default video category
    }

    // Image categorization using filename patterns and AI
    if (fileType.startsWith('image/')) {
      // Use OpenAI Vision API for advanced categorization
      if (process.env.OPENAI_API_KEY && file.size < 20 * 1024 * 1024) {
        // 20MB limit for API
        try {
          const imageCategory = await categorizeImageWithAI(
            file,
            weddingContext,
          );
          if (imageCategory) return imageCategory;
        } catch (error) {
          console.warn(
            'AI categorization failed, falling back to pattern matching:',
            error,
          );
        }
      }

      // Fallback to pattern matching
      if (
        filename.includes('ceremony') ||
        filename.includes('altar') ||
        filename.includes('vows')
      ) {
        return WeddingFileCategory.CEREMONY_PHOTOS;
      }
      if (
        filename.includes('reception') ||
        filename.includes('party') ||
        filename.includes('dance')
      ) {
        return WeddingFileCategory.RECEPTION_PHOTOS;
      }
      if (
        filename.includes('getting ready') ||
        filename.includes('prep') ||
        filename.includes('bridal suite')
      ) {
        return WeddingFileCategory.PREPARATION_PHOTOS;
      }
      if (
        filename.includes('couple') ||
        filename.includes('bride') ||
        filename.includes('groom')
      ) {
        return WeddingFileCategory.COUPLE_PORTRAITS;
      }
      if (
        filename.includes('family') ||
        filename.includes('group') ||
        filename.includes('formal')
      ) {
        return WeddingFileCategory.FAMILY_PORTRAITS;
      }
      if (
        filename.includes('detail') ||
        filename.includes('ring') ||
        filename.includes('dress') ||
        filename.includes('flower')
      ) {
        return WeddingFileCategory.DETAIL_SHOTS;
      }

      // Default to ceremony photos for images
      return WeddingFileCategory.CEREMONY_PHOTOS;
    }

    return WeddingFileCategory.MISC;
  } catch (error) {
    console.error('File categorization failed:', error);
    return WeddingFileCategory.MISC;
  }
}

async function categorizeImageWithAI(
  file: File,
  weddingContext?: WeddingContext,
): Promise<WeddingFileCategory | null> {
  try {
    const base64Image = await fileToBase64(file);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this wedding photo and categorize it. Consider the scene, people, setting, and activities. 
              Wedding context: ${weddingContext ? `Couple: ${weddingContext.coupleName}, Venue: ${weddingContext.venue}` : 'None'}
              
              Respond with ONE of these exact categories:
              - CEREMONY_PHOTOS: Wedding ceremony, altar, vows, processional, recessional
              - RECEPTION_PHOTOS: Reception party, dancing, dining, celebration
              - PREPARATION_PHOTOS: Getting ready, hair/makeup, putting on dress/suit
              - COUPLE_PORTRAITS: Bride and groom together, romantic shots, couple poses
              - FAMILY_PORTRAITS: Family groups, formal poses, multiple generations
              - DETAIL_SHOTS: Rings, dress details, flowers, decorations, close-ups
              
              Only respond with the category name, nothing else.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
                detail: 'low', // Use low detail for faster processing
              },
            },
          ],
        },
      ],
      max_tokens: 50,
      temperature: 0.1,
    });

    const category = response.choices[0]?.message?.content?.trim();
    return category &&
      Object.values(WeddingFileCategory).includes(
        category as WeddingFileCategory,
      )
      ? (category as WeddingFileCategory)
      : null;
  } catch (error) {
    console.error('AI image categorization failed:', error);
    return null;
  }
}

export async function detectFaces(file: File): Promise<FaceDetectionResult[]> {
  try {
    if (!file.type.startsWith('image/')) return [];

    const base64Image = await fileToBase64(file);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and detect faces. For each face found, provide:
              1. Estimated age range (e.g., "20-30", "50-60", "child")
              2. Gender (male/female/unknown)
              3. Position description (e.g., "center", "left side", "background")
              4. Likely role at wedding (bride, groom, family, guest, vendor, child)
              
              Respond in JSON format:
              [{"age": "25-35", "gender": "female", "position": "center", "role": "bride", "confidence": 0.9}]
              
              If no faces are detected, respond with an empty array: []`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    if (!responseText) return [];

    try {
      const faces = JSON.parse(responseText);
      return Array.isArray(faces)
        ? faces.map((face, index) => ({
            id: `face-${index}`,
            boundingBox: { x: 0, y: 0, width: 0, height: 0 }, // Placeholder - would need different API for coordinates
            confidence: face.confidence || 0.8,
            attributes: {
              age: face.age,
              gender: face.gender,
              position: face.position,
              role: face.role,
            },
          }))
        : [];
    } catch (parseError) {
      console.error('Failed to parse face detection response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Face detection failed:', error);
    return [];
  }
}

export async function recognizeScene(
  file: File,
): Promise<SceneRecognitionResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return {
        primaryScene: 'unknown',
        confidence: 0,
        objects: [],
        setting: 'unknown',
        mood: 'neutral',
        lightingCondition: 'unknown',
      };
    }

    const base64Image = await fileToBase64(file);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this wedding image and describe the scene. Provide:
              1. Primary scene/activity (ceremony, reception, portraits, getting-ready, etc.)
              2. Setting (church, outdoor, ballroom, garden, beach, etc.)
              3. Objects visible (flowers, rings, dress, altar, tables, etc.)
              4. Mood/atmosphere (romantic, joyful, elegant, casual, etc.)
              5. Lighting (natural, artificial, golden hour, indoor, etc.)
              
              Respond in JSON format:
              {
                "primaryScene": "ceremony",
                "confidence": 0.9,
                "objects": ["altar", "flowers", "wedding dress"],
                "setting": "church",
                "mood": "romantic",
                "lightingCondition": "natural"
              }`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error('No response from scene recognition');
    }

    try {
      const sceneData = JSON.parse(responseText);
      return {
        primaryScene: sceneData.primaryScene || 'unknown',
        confidence: sceneData.confidence || 0.5,
        objects: Array.isArray(sceneData.objects) ? sceneData.objects : [],
        setting: sceneData.setting || 'unknown',
        mood: sceneData.mood || 'neutral',
        lightingCondition: sceneData.lightingCondition || 'unknown',
      };
    } catch (parseError) {
      console.error('Failed to parse scene recognition response:', parseError);
      return {
        primaryScene: 'unknown',
        confidence: 0,
        objects: [],
        setting: 'unknown',
        mood: 'neutral',
        lightingCondition: 'unknown',
      };
    }
  } catch (error) {
    console.error('Scene recognition failed:', error);
    return {
      primaryScene: 'unknown',
      confidence: 0,
      objects: [],
      setting: 'unknown',
      mood: 'neutral',
      lightingCondition: 'unknown',
    };
  }
}

export async function analyzeImageQuality(
  file: File,
): Promise<QualityAnalysisResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return {
        score: 5.0,
        issues: [],
        recommendations: [],
        technicalMetrics: {},
      };
    }

    const base64Image = await fileToBase64(file);

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this wedding photo for technical quality. Rate from 1-10 and identify issues:
              
              Check for:
              - Sharpness/focus
              - Exposure (over/under exposed)
              - Composition
              - Color balance
              - Noise/grain
              - Motion blur
              - Artistic value
              
              Provide recommendations for improvement if needed.
              
              Respond in JSON format:
              {
                "score": 8.5,
                "issues": ["slightly underexposed", "minor noise in shadows"],
                "recommendations": ["increase brightness slightly", "apply noise reduction"],
                "technicalMetrics": {
                  "sharpness": 8.0,
                  "exposure": 7.0,
                  "composition": 9.0,
                  "colorBalance": 8.5
                }
              }`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0.1,
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error('No response from quality analysis');
    }

    try {
      const qualityData = JSON.parse(responseText);
      return {
        score: qualityData.score || 5.0,
        issues: Array.isArray(qualityData.issues) ? qualityData.issues : [],
        recommendations: Array.isArray(qualityData.recommendations)
          ? qualityData.recommendations
          : [],
        technicalMetrics: qualityData.technicalMetrics || {},
      };
    } catch (parseError) {
      console.error('Failed to parse quality analysis response:', parseError);
      return {
        score: 5.0,
        issues: [],
        recommendations: [],
        technicalMetrics: {},
      };
    }
  } catch (error) {
    console.error('Image quality analysis failed:', error);
    return {
      score: 5.0,
      issues: [],
      recommendations: [],
      technicalMetrics: {},
    };
  }
}

// Batch analysis for multiple files
export async function batchAnalyzeFiles(
  files: File[],
  weddingContext?: WeddingContext,
): Promise<Map<string, AIAnalysisResult>> {
  const results = new Map<string, AIAnalysisResult>();
  const batchSize = 3; // Process 3 files at a time to avoid rate limits

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (file) => {
        try {
          const [category, faces, scene, quality] = await Promise.all([
            categorizeFile(file, weddingContext),
            detectFaces(file),
            recognizeScene(file),
            file.type.startsWith('image/') ? analyzeImageQuality(file) : null,
          ]);

          const analysis: AIAnalysisResult = {
            suggestedCategory: category,
            faces,
            sceneRecognition: scene,
            qualityScore: quality?.score,
            technicalIssues: quality?.issues,
            smartTags: await generateContextualTags(
              file,
              scene,
              faces,
              weddingContext,
            ),
            weddingMoments: await identifyWeddingMoments(scene, weddingContext),
            vendorAttribution: await attributeToVendor(file, weddingContext),
            confidence: calculateOverallConfidence(
              category,
              faces,
              scene,
              quality,
            ),
            processingTime: Date.now(), // Would track actual processing time
          };

          results.set(file.name, analysis);
        } catch (error) {
          console.error(`Failed to analyze file ${file.name}:`, error);
        }
      }),
    );

    // Add delay between batches to respect rate limits
    if (i + batchSize < files.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Helper Functions
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

async function generateContextualTags(
  file: File,
  scene: SceneRecognitionResult,
  faces: FaceDetectionResult[],
  weddingContext?: WeddingContext,
): Promise<string[]> {
  const tags = new Set<string>();

  // Add scene-based tags
  if (scene.primaryScene !== 'unknown') {
    tags.add(scene.primaryScene);
  }
  if (scene.setting !== 'unknown') {
    tags.add(scene.setting);
  }
  if (scene.mood !== 'neutral') {
    tags.add(scene.mood);
  }

  // Add object tags
  scene.objects.forEach((obj) => tags.add(obj));

  // Add face-based tags
  faces.forEach((face) => {
    if (face.attributes?.role && face.confidence > 0.7) {
      tags.add(face.attributes.role);
    }
  });

  // Add wedding context tags
  if (weddingContext) {
    if (weddingContext.coupleName) {
      tags.add(weddingContext.coupleName.toLowerCase().replace(/\s+/g, '-'));
    }
    if (weddingContext.venue) {
      tags.add(weddingContext.venue.toLowerCase().replace(/\s+/g, '-'));
    }
    if (weddingContext.weddingDate) {
      const year = new Date(weddingContext.weddingDate).getFullYear();
      tags.add(year.toString());
    }
  }

  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

async function identifyWeddingMoments(
  scene: SceneRecognitionResult,
  weddingContext?: WeddingContext,
): Promise<string[]> {
  const moments = [];

  if (scene.primaryScene.includes('ceremony')) {
    if (scene.objects.includes('altar')) moments.push('at-altar');
    if (scene.objects.includes('rings')) moments.push('ring-exchange');
    moments.push('ceremony-moment');
  }

  if (scene.primaryScene.includes('reception')) {
    if (scene.objects.includes('dance')) moments.push('first-dance');
    if (scene.objects.includes('cake')) moments.push('cake-cutting');
    moments.push('reception-moment');
  }

  if (scene.primaryScene.includes('portrait')) {
    moments.push('portrait-session');
  }

  return moments;
}

async function attributeToVendor(
  file: File,
  weddingContext?: WeddingContext,
): Promise<string | undefined> {
  // In a real implementation, this would analyze metadata, watermarks, or file properties
  // to determine which vendor created the file

  const filename = file.name.toLowerCase();

  // Check for photographer watermarks or naming patterns
  if (
    filename.includes('photo') ||
    filename.includes('img') ||
    file.type.startsWith('image/')
  ) {
    return weddingContext?.primaryVendor || 'photographer';
  }

  // Check for videographer patterns
  if (file.type.startsWith('video/')) {
    return 'videographer';
  }

  // Check for planner/coordinator documents
  if (filename.includes('timeline') || filename.includes('schedule')) {
    return 'wedding-planner';
  }

  return undefined;
}

function calculateOverallConfidence(
  category: WeddingFileCategory,
  faces: FaceDetectionResult[],
  scene: SceneRecognitionResult,
  quality: QualityAnalysisResult | null,
): number {
  let confidence = 0.5; // Base confidence

  // Category confidence
  if (category !== WeddingFileCategory.MISC) {
    confidence += 0.2;
  }

  // Face detection confidence
  if (faces.length > 0) {
    const avgFaceConfidence =
      faces.reduce((sum, face) => sum + face.confidence, 0) / faces.length;
    confidence += avgFaceConfidence * 0.15;
  }

  // Scene confidence
  confidence += scene.confidence * 0.15;

  // Quality confidence (higher quality = more reliable analysis)
  if (quality && quality.score > 7) {
    confidence += 0.1;
  }

  return Math.min(1.0, Math.max(0.0, confidence));
}
