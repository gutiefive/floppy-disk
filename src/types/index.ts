import { z } from 'zod';

export const PlatformSchema = z.enum([
  'facebook',
  'twitter',
  'instagram',
  'threads',
  'reddit',
  'tiktok',
  'youtube',
]);

export type Platform = z.infer<typeof PlatformSchema>;

export const RecordTypeSchema = z.enum([
  'post',
  'comment',
  'reply',
  'share',
  'caption',
]);

export type RecordType = z.infer<typeof RecordTypeSchema>;

export const ImportStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export type ImportStatus = z.infer<typeof ImportStatusSchema>;

export const PermalinkStatusSchema = z.enum([
  'unknown',
  'recognized',
  'validated',
  'unavailable',
]);

export type PermalinkStatus = z.infer<typeof PermalinkStatusSchema>;

export const PrioritySchema = z.enum(['high', 'medium', 'low', 'none']);
export type Priority = z.infer<typeof PrioritySchema>;

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

export const SuggestedActionSchema = z.enum([
  'review',
  'consider_editing',
  'consider_visibility',
  'no_action',
]);

export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;

export const ReviewActionTypeSchema = z.enum([
  'reviewed',
  'dismissed',
  'marked_for_deletion',
  'visibility_changed',
  'confirmed_deleted',
  'confirmed_concern',
]);

export type ReviewActionType = z.infer<typeof ReviewActionTypeSchema>;

export const ImportSchema = z.object({
  id: z.string(),
  platform: PlatformSchema,
  source_type: z.string(),
  filename: z.string().nullable(),
  started_at: z.number(),
  completed_at: z.number().nullable(),
  status: ImportStatusSchema,
  total_records: z.number().default(0),
  processed_records: z.number().default(0),
  failed_records: z.number().default(0),
  error_message: z.string().nullable(),
  metadata: z.string().nullable(),
});

export type Import = z.infer<typeof ImportSchema>;

export const PostSchema = z.object({
  id: z.string(),
  import_id: z.string(),
  platform: PlatformSchema,
  platform_id: z.string().nullable(),
  record_type: RecordTypeSchema,
  author_name: z.string().nullable(),
  text: z.string().nullable(),
  timestamp: z.number().nullable(),
  timezone: z.string().nullable(),
  permalink: z.string().nullable(),
  permalink_status: PermalinkStatusSchema.nullable(),
  visibility: z.string().nullable(),
  parent_id: z.string().nullable(),
  shared_content: z.string().nullable(),
  owner_commentary: z.string().nullable(),
  has_media: z.number().default(0),
  media_metadata: z.string().nullable(),
  conversation_context: z.string().nullable(),
  import_warnings: z.string().nullable(),
  created_at: z.number(),
});

export type Post = z.infer<typeof PostSchema>;

export const AnalysisAssessmentSchema = z.object({
  threats_violence: z.boolean().default(false),
  harassment_bullying: z.boolean().default(false),
  discriminatory_abuse: z.boolean().default(false),
  explicit_sexual: z.boolean().default(false),
  vulgar_hostile: z.boolean().default(false),
  employer_disparagement: z.boolean().default(false),
  confidential_disclosure: z.boolean().default(false),
  workplace_safety_concerns: z.boolean().default(false),
  abusive_arguments: z.boolean().default(false),
  other_concerns: z.string().nullable(),
});

export const FaithContextAssessmentSchema = z.object({
  religious_abuse: z.boolean().default(false),
  celebration_of_harm: z.boolean().default(false),
  policy_conflicts: z.array(z.string()).default([]),
  other_concerns: z.string().nullable(),
});

export const AnalysisOutputSchema = z.object({
  priority: PrioritySchema,
  priority_score: z.number().min(0).max(100).optional(),
  professional_assessment: AnalysisAssessmentSchema,
  faith_context_assessment: FaithContextAssessmentSchema,
  supporting_excerpts: z.array(z.string()),
  specific_concern: z.string().nullable(),
  rationale: z.string(),
  severity: SeveritySchema.nullable(),
  confidence: z.number().min(0).max(1),
  context_notes: z.string().nullable(),
  uncertainty: z.string().nullable(),
  policy_grounding: z.string().nullable(),
  suggested_action: SuggestedActionSchema,
  media_reviewed: z.boolean().default(false),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

export const AnalysisResultSchema = z.object({
  id: z.string(),
  post_id: z.string(),
  provider: z.string(),
  model_name: z.string(),
  model_version: z.string().nullable(),
  analyzed_at: z.number(),
  priority: PrioritySchema,
  priority_score: z.number().nullable(),
  professional_assessment: z.string(),
  faith_context_assessment: z.string(),
  supporting_excerpts: z.string(),
  concerns: z.string().nullable(),
  severity: SeveritySchema.nullable(),
  confidence: z.number(),
  context_notes: z.string().nullable(),
  uncertainty: z.string().nullable(),
  policy_version: z.string().nullable(),
  suggested_action: SuggestedActionSchema.nullable(),
  media_reviewed: z.number().default(0),
  raw_output: z.string().nullable(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const ReviewActionSchema = z.object({
  id: z.string(),
  post_id: z.string(),
  action_type: ReviewActionTypeSchema,
  notes: z.string().nullable(),
  created_at: z.number(),
});

export type ReviewAction = z.infer<typeof ReviewActionSchema>;
