import OpenAI from 'openai';
import { z } from 'zod';
import { Debrief, SessionPlan, StudentProfile, ProgressSummaryResult } from '@/types';

// Zod Schemas for Strict AI Response Validation
export const PreSessionPlanSchema = z.object({
  objectives: z.array(z.string()).min(3).max(3),
  lesson_outline: z.array(z.string()).min(4).max(4),
  practice_questions: z.array(
    z.union([
      z.object({
        question: z.string(),
        solution: z.string(),
      }),
      z.string(),
    ])
  ).min(3).max(3),
});

export const PostSessionDebriefSchema = z.object({
  summary: z.string(),
  homework: z.array(
    z.object({
      task: z.string(),
      description: z.string(),
    })
  ).min(2).max(3),
  next_focus: z.string(),
});

export const ProgressSummarySchema = z.object({
  summary: z.string(),
  key_improvements: z.array(z.string()),
  persistent_weaknesses: z.array(z.string()),
  recommended_strategy: z.string(),
});

// Helper to get initialized OpenAI client if key is set
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('dummy') || apiKey.includes('your-openai')) {
    return null;
  }
  return new OpenAI({ apiKey });
}

// Helper to safely clean markdown codeblocks and parse JSON output defensively
function cleanAndParseJSON<T>(content: string): T | null {
  try {
    const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn('Defensive JSON parsing caught exception on AI output:', err);
    return null;
  }
}

/**
 * Touchpoint 1: Pre-Session Lesson Plan Generation
 * Context: Student profile (subject, level, goals, weak areas) + past session history
 * Output: Structured JSON with exactly 3 objectives, 4-point outline, 3 practice questions with solutions
 */
export async function generatePreSessionPlan(
  student: StudentProfile,
  topic: string,
  pastDebriefs: Debrief[] = []
): Promise<Omit<SessionPlan, 'session_id'>> {
  const openai = getOpenAIClient();
  if (!openai) {
    const primaryWeakness = student.weak_areas?.[0] || 'core weak areas';
    return {
      objectives: [
        `Master foundational mechanics for ${topic}`,
        `Apply systematic problem-solving strategies to ${primaryWeakness}`,
        `Build speed and precision on exam-style practice questions`,
      ],
      lesson_outline: [
        `1. Warm-Up & Diagnostic (10 min): Review foundational concepts and homework from last session`,
        `2. Concept Breakdown & Modeling (20 min): Interactive walkthrough of ${topic}`,
        `3. Guided Practice (20 min): Solve targeted practice problems focusing on ${primaryWeakness}`,
        `4. Exit Challenge & Wrap-Up (10 min): Independent problem solving and key takeaways summary`,
      ],
      practice_questions: [
        `Problem 1: Solve the primary equation for ${topic} under standard conditions. (Solution: Apply formula step 1 and solve for variable)`,
        `Problem 2: Analyze the edge case scenario in ${topic} when parameters approach boundary limits. (Solution: Substitute given boundary values and simplify)`,
        `Problem 3: Multi-step word problem applying ${topic} to practical application. (Solution: Break into sub-problems A and B, then combine final outputs)`,
      ],
    };
  }

  const historyContext = pastDebriefs.length > 0
    ? pastDebriefs.slice(0, 3).map((d, i) => `Session ${i + 1} Summary: ${d.summary} | Next Focus: ${d.next_focus}`).join('\n')
    : 'No previous session debriefs available.';

  const prompt = `You are an expert 1-on-1 private tutor preparing a highly structured, personalized lesson plan.

Student Profile:
- Name: ${student.name}
- Subject: ${student.subject}
- Level: ${student.current_level}
- Learning Goals: ${(student.learning_goals || []).join(', ')}
- Weak Areas / Focus Topics: ${(student.weak_areas || []).join(', ')}

Upcoming Session Topic: ${topic}

Recent Past Session History:
${historyContext}

Task: Create a targeted lesson plan specifically tailored to address the student's weak areas and goals.

Return ONLY a valid JSON object with the following exact keys and structure:
{
  "objectives": [
    "Learning Objective 1",
    "Learning Objective 2",
    "Learning Objective 3"
  ],
  "lesson_outline": [
    "1. Warm-Up & Diagnostic (10 min): Review previous concepts",
    "2. Concept Breakdown & Modeling (20 min): Core mechanics",
    "3. Guided Practice & Problem Solving (20 min): Target weak areas",
    "4. Exit Challenge & Recap (10 min): Independent problem solving"
  ],
  "practice_questions": [
    { "question": "Targeted question 1", "solution": "Brief solution steps 1" },
    { "question": "Targeted question 2", "solution": "Brief solution steps 2" },
    { "question": "Targeted question 3", "solution": "Brief solution steps 3" }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const rawParsed = cleanAndParseJSON<unknown>(content);
    const parsed = PreSessionPlanSchema.safeParse(rawParsed);

    if (!parsed.success) {
      console.error('Pre-Session Plan Zod validation error:', parsed.error.format());
      throw new Error(`AI response failed schema validation: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    const formattedQuestions = parsed.data.practice_questions.map(pq => {
      if (typeof pq === 'string') return pq;
      return `${pq.question} (Solution: ${pq.solution})`;
    });

    return {
      objectives: parsed.data.objectives,
      lesson_outline: parsed.data.lesson_outline,
      practice_questions: formattedQuestions,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('schema validation')) throw err;
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        throw new Error('OpenAI Rate Limit Exceeded: Please wait a moment before trying again.');
      }
      if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNRESET') || err.message.includes('fetch failed')) {
        throw new Error('AI Service Timeout: Connection to OpenAI API failed. Please try again.');
      }
      throw err;
    }
    throw new Error('AI Pre-Session Plan generation failed due to an unexpected error.');
  }
}

/**
 * Touchpoint 2: Post-Session Debrief Generation
 * Context: Tutor's raw session notes + Student profile
 * Output: Structured JSON with summary, 2-3 homework tasks, and next focus recommendation
 */
export async function generatePostSessionDebrief(
  student: StudentProfile,
  topic: string,
  rawNotes: string
): Promise<Omit<Debrief, 'session_id'>> {
  const openai = getOpenAIClient();
  if (!openai) {
    const primaryWeakness = student.weak_areas?.[0] || 'target focus area';
    const summaryText = rawNotes && rawNotes.trim().length > 10
      ? `In this session on "${topic}", the student worked through key concepts. Tutor notes summary: ${rawNotes.slice(0, 150)}.`
      : `Solid session covering "${topic}". ${student.name} demonstrated good retention of core principles and actively engaged during guided practice.`;

    return {
      summary: summaryText,
      homework: [
        {
          task: `${topic} Practice Problems`,
          description: `Complete exercises 1-5 focusing on ${primaryWeakness}.`,
        },
        {
          task: `Concept Review & Self-Quiz`,
          description: `Review key formulas and sketch summary notes for next session preparation.`,
        },
      ],
      next_focus: `Deepen problem-solving fluency on ${primaryWeakness}.`,
    };
  }

  const prompt = `You are an AI pedagogical assistant generating a post-session debrief for a tutoring session.

Student Profile:
- Name: ${student.name}
- Subject: ${student.subject}
- Level: ${student.current_level}

Session Topic: ${topic}
Tutor Raw Session Notes:
"""
${rawNotes || 'Session completed successfully. Covered core concepts and practice problems.'}
"""

Task: Synthesize the tutor's raw notes into a concise, professional debrief summary, 2-3 actionable homework tasks, and a clear next focus.

Return ONLY a valid JSON object with the exact format:
{
  "summary": "Clear, encouraging 2-3 sentence overview of what was covered and student comprehension",
  "homework": [
    { "task": "Short title 1", "description": "Specific actionable exercise details 1" },
    { "task": "Short title 2", "description": "Specific actionable exercise details 2" }
  ],
  "next_focus": "Recommended topic or skill area for the next tutoring session"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const rawParsed = cleanAndParseJSON<unknown>(content);
    const parsed = PostSessionDebriefSchema.safeParse(rawParsed);

    if (!parsed.success) {
      console.error('Post-Session Debrief Zod validation error:', parsed.error.format());
      throw new Error(`AI response failed schema validation: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    return {
      summary: parsed.data.summary,
      homework: parsed.data.homework,
      next_focus: parsed.data.next_focus,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('schema validation')) throw err;
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        throw new Error('OpenAI Rate Limit Exceeded: Please wait a moment before trying again.');
      }
      if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNRESET') || err.message.includes('fetch failed')) {
        throw new Error('AI Service Timeout: Connection to OpenAI API failed. Please try again.');
      }
      throw err;
    }
    throw new Error('AI Post-Session Debrief generation failed due to an unexpected error.');
  }
}

/**
 * Touchpoint 3: Student Progress Summary Generation
 * Context: All past debriefs for a student
 * Output: Trend analysis paragraph, key improvements, persistent weaknesses, recommended strategy
 */
export async function generateStudentProgressSummary(
  student: StudentProfile,
  pastDebriefs: Debrief[]
): Promise<ProgressSummaryResult> {
  const openai = getOpenAIClient();
  if (!openai) {
    return {
      summary: `${student.name} has demonstrated steady learning momentum in ${student.subject} across recent sessions. Performance shows growing confidence in core problem-solving routines with consistent effort on assigned practice.`,
      key_improvements: [
        `Improved accuracy on baseline mechanics and conceptual understanding`,
        `Better speed when approaching multi-step problem setups`,
      ],
      persistent_weaknesses: [
        student.weak_areas?.[0] || 'Time management under strict exam conditions',
        student.weak_areas?.[1] || 'Algebraic simplification in complex multi-part problems',
      ],
      recommended_strategy: `Continue combining 15-minute diagnostic warm-ups with timed independent problem sets during upcoming sessions.`,
    };
  }

  const debriefsContext = pastDebriefs.length > 0
    ? pastDebriefs.map((d, i) => `Session ${i + 1} (${d.created_at || 'Date N/A'}):\nSummary: ${d.summary}\nNext Focus: ${d.next_focus}`).join('\n\n')
    : 'Initial tutoring session completed.';

  const prompt = `You are an educational strategist assessing student learning velocity across multiple tutoring sessions.

Student Profile:
- Name: ${student.name}
- Subject: ${student.subject}
- Level: ${student.current_level}
- Goals: ${(student.learning_goals || []).join(', ')}

Session History Debriefs:
${debriefsContext}

Task: Evaluate progress trends across sessions and generate an insightful evaluation.

Return ONLY a valid JSON object with the format:
{
  "summary": "Insightful 3-4 sentence paragraph summarizing student trajectory, effort, and growth trends.",
  "key_improvements": ["Array of 2-3 specific concepts mastered or skill improvements noted"],
  "persistent_weaknesses": ["Array of 1-2 areas needing continued reinforcement"],
  "recommended_strategy": "Actionable recommendation for the tutor for upcoming sessions"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const rawParsed = cleanAndParseJSON<unknown>(content);
    const parsed = ProgressSummarySchema.safeParse(rawParsed);

    if (!parsed.success) {
      console.error('Progress Summary Zod validation error:', parsed.error.format());
      throw new Error(`AI response failed schema validation: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    return parsed.data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('schema validation')) throw err;
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        throw new Error('OpenAI Rate Limit Exceeded: Please wait a moment before trying again.');
      }
      if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNRESET') || err.message.includes('fetch failed')) {
        throw new Error('AI Service Timeout: Connection to OpenAI API failed. Please try again.');
      }
      throw err;
    }
    throw new Error('AI Student Progress Summary generation failed due to an unexpected error.');
  }
}


