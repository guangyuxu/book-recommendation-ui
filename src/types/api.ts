// TypeScript mirrors of the accounts service's request/response contracts.
// Kept in sync with src/accounts/schemas.py and the ORM models in the backend repo.

export type Gender = "Male" | "Female";

// --- auth ---
export interface TokenResponse {
  access_token: string;
  token_type: string;
  family_id: string;
  family_member_id: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  family_name?: string | null;
  display_name?: string | null;
  role?: string;
  language_preference?: string | null;
  invite_code?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// GET /me — the caller's own identity (family_id/member derived server-side).
export interface Me {
  family_id: string;
  family_member_id: string;
  child_id?: string | null;
  email?: string | null;
  display_name?: string | null;
}

// --- family ---
export interface Family {
  id: string;
  family_name: string | null;
  default_language: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyUpdate {
  family_name?: string | null;
  default_language?: string | null;
}

// --- members ---
export interface Member {
  id: string;
  family_id: string;
  display_name: string | null;
  gender: Gender | null;
  birth_date: string | null;
  role: string;
  is_primary_user: boolean;
  language_preference: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberCreate {
  display_name?: string | null;
  role?: string;
  gender?: Gender | null;
  birth_date?: string | null;
  language_preference?: string | null;
  email?: string | null;
  password?: string | null;
}

export interface MemberUpdate {
  display_name?: string | null;
  role?: string | null;
  gender?: Gender | null;
  birth_date?: string | null;
  language_preference?: string | null;
}

// --- member profile (1:1, agent-curated parent context) ---
export interface MemberProfile {
  id: string;
  member_id: string;
  occupation_background: string | null;
  education_background: string | null;
  communication_style: string | null;
  concerns: string[];
  source: string | null;
  confidence: number | null;
  observed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberProfileUpsert {
  occupation_background?: string | null;
  education_background?: string | null;
  communication_style?: string | null;
  concerns?: string[] | null;
}

// --- invites ---
export interface Invite {
  id: string;
  family_id: string;
  role: string;
  created_by_member_id: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteCreate {
  role?: string;
  ttl_hours?: number | null;
}

// The raw `code` is returned only once, on creation.
export interface InviteResponse {
  id: string;
  code: string;
  role: string;
  family_id: string;
  expires_at: string | null;
}

// --- children ---
export interface Child {
  id: string;
  family_id: string;
  display_name: string | null;
  aliases: string[];
  gender: Gender | null;
  birth_date: string | null;
  grade: string | null;
  school_system: string | null;
  country_or_curriculum: string | null;
  primary_language: string | null;
  reading_language: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChildCreate {
  display_name?: string | null;
  aliases?: string[];
  gender?: Gender | null;
  birth_date?: string | null;
  grade?: string | null;
  school_system?: string | null;
  country_or_curriculum?: string | null;
  primary_language?: string | null;
  reading_language?: string | null;
  notes?: string | null;
}

export type ChildUpdate = ChildCreate;

// --- child reading profile (1:1) ---
export interface ReadingProfile {
  id: string;
  child_id: string;
  reading_level_note: string | null;
  cefr_level: string | null;
  lexile: number | null;
  current_stage: string | null;
  independent_reading: boolean | null;
  needs_dictionary: boolean | null;
  can_read_chapter_books: boolean | null;
  can_handle_old_language: boolean | null;
  interests: string[];
  preferred_genres: string[];
  disliked_genres: string[];
  liked_themes: string[];
  disliked_themes: string[];
  preferred_tone: string[];
  avoid_topics: string[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingProfileUpsert {
  reading_level_note?: string | null;
  cefr_level?: string | null;
  lexile?: number | null;
  current_stage?: string | null;
  independent_reading?: boolean | null;
  needs_dictionary?: boolean | null;
  can_read_chapter_books?: boolean | null;
  can_handle_old_language?: boolean | null;
  interests?: string[] | null;
  preferred_genres?: string[] | null;
  disliked_genres?: string[] | null;
  liked_themes?: string[] | null;
  disliked_themes?: string[] | null;
  preferred_tone?: string[] | null;
  avoid_topics?: string[] | null;
  summary?: string | null;
}

// --- child reading history (a list of books per child) ---
export interface ReadingHistoryEntry {
  id: string;
  child_id: string;
  title: string | null;
  author: string | null;
  series_name: string | null;
  book_order: string | null;
  status: string | null;
  liked: boolean | null;
  reasons: string[];
  parent_note: string | null;
  child_note: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingHistoryCreate {
  title?: string | null;
  author?: string | null;
  series_name?: string | null;
  book_order?: string | null;
  status?: string | null;
  liked?: boolean | null;
  reasons?: string[];
  parent_note?: string | null;
  child_note?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export type ReadingHistoryUpdate = ReadingHistoryCreate;

// --- reading policy ---
export interface Policy {
  id: string;
  family_id: string;
  child_id: string | null;
  goals: string[];
  constraints: string[];
  avoid_topics: string[];
  content_preferences: Record<string, unknown>;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyCreate {
  child_id?: string | null;
  goals?: string[];
  constraints?: string[];
  avoid_topics?: string[];
  content_preferences?: Record<string, unknown>;
  notes?: string | null;
  is_active?: boolean;
}

export interface PolicyUpdate {
  goals?: string[] | null;
  constraints?: string[] | null;
  avoid_topics?: string[] | null;
  content_preferences?: Record<string, unknown> | null;
  notes?: string | null;
  is_active?: boolean | null;
}
