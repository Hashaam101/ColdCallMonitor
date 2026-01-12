/**
 * TypeScript interfaces for Cold Calls Dashboard
 *
 * These types are aligned with Schema.dbml - the master schema definition.
 * Note: Appwrite uses $id, $createdAt, $updatedAt as system field names.
 */

// ============================================
// Cold Call Types
// ============================================

export interface ColdCall {
    // System fields (Appwrite auto-managed)
    $id: string;
    $createdAt: string;
    $updatedAt: string;

    // Required fields
    transcript: string;

    // Optional fields
    caller_name: string | null;
    recipients: string | null;
    owner_name: string | null;
    company_name: string | null;
    company_location: string | null;
    call_outcome: string | null;  // Values: Interested, Not Interested, Callback, No Answer, Wrong Number, Other
    interest_level: number | null; // Range: 1-10
    objections: string | null;     // JSON array stored as string
    pain_points: string | null;    // JSON array stored as string
    follow_up_actions: string | null; // JSON array stored as string
    call_summary: string | null;
    call_duration_estimate: string | null;

    // AI model metadata
    model_used: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;

    // Team collaboration
    claimed_by: string | null;     // Reference to team_members.id, null = unclaimed
    google_maps_link: string | null;
}

export type ColdCallUpdateData = Partial<Omit<ColdCall, '$id' | '$createdAt' | '$updatedAt'>>;

// Valid call outcome values
export const CALL_OUTCOMES = [
    'Interested',
    'Not Interested',
    'Callback',
    'No Answer',
    'Wrong Number',
    'Other',
] as const;

export type CallOutcome = typeof CALL_OUTCOMES[number];

// ============================================
// Team Member Types
// ============================================

export interface TeamMember {
    // System fields
    $id: string;
    $createdAt: string;
    $updatedAt: string;

    // Required fields
    name: string;
    email: string;
    role: 'admin' | 'member';
}

export type TeamMemberCreateData = {
    name: string;
    email: string;
    role?: 'admin' | 'member';
};

// ============================================
// Alert Types
// ============================================

export interface Alert {
    // System fields
    $id: string;
    $createdAt: string;
    $updatedAt: string;

    // Required fields
    created_by: string;           // Reference to team_members.id
    target_user: string;          // Reference to team_members.id
    entity_type: string;          // e.g., 'cold_call' (extensible for future entity types)
    entity_id: string;            // Reference to entity document ID

    // Optional fields
    entity_label: string | null;  // Display name, e.g., "TechCorp - John"
    alert_time: string | null;    // ISO datetime string, null = instant alert
    message: string | null;       // Custom alert message
    is_dismissed: boolean;        // Default: false
}

export type AlertCreateData = {
    target_user: string;
    entity_type: string;
    entity_id: string;
    entity_label?: string | null;
    alert_time?: string | null;
    message?: string | null;
};

// Valid entity types for alerts
export const ALERT_ENTITY_TYPES = ['cold_call'] as const;
export type AlertEntityType = typeof ALERT_ENTITY_TYPES[number];

// ============================================
// Auth Types
// ============================================

export interface User {
    $id: string;
    email: string;
    name: string;
}

export interface AuthState {
    user: User | null;
    teamMember: TeamMember | null;
    loading: boolean;
}

// ============================================
// Filter & Sort Types
// ============================================

export interface ColdCallFilters {
    dateRange?: {
        from: Date | null;
        to: Date | null;
    };
    interestLevel?: {
        min: number;
        max: number;
    };
    callOutcome?: string[];
    claimedBy?: string | 'unclaimed' | null;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
    field: keyof ColdCall;
    direction: SortDirection;
}

// ============================================
// Bulk Action Types
// ============================================

export type BulkAction = 'delete' | 'export' | 'change_outcome' | 'claim';

export interface BulkActionState {
    selectedIds: string[];
    action: BulkAction | null;
}
