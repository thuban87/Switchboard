/**
 * Switchboard Types
 * Core interfaces for the plugin
 */

/**
 * Represents a scheduled time block for a Line
 */
export interface ScheduledBlock {
    /** Unique ID for this block */
    id: string;
    /** Start time in 24h format (e.g., "09:00") */
    startTime: string;
    /** End time in 24h format, informational only (e.g., "10:30") */
    endTime: string;
    /** For one-time blocks: specific date "YYYY-MM-DD" */
    date?: string;
    /** For recurring blocks: true if recurring */
    recurring?: boolean;
    /** Days of week for recurring (0=Sun, 1=Mon, etc.) */
    days?: number[];
}

/**
 * Represents a single "Line" (context/focus area)
 */
export interface SwitchboardLine {
    /** Unique identifier, auto-generated from name (e.g., "math-140") */
    id: string;
    /** Display name (e.g., "Math 140") */
    name: string;
    /** Accent color in hex format (e.g., "#3498db") */
    color: string;
    /** Paths that remain visible when patched in (includes children) */
    safePaths: string[];
    /** File to open when patching in (optional) */
    landingPage: string;
    /** Path to session log file for this Line (optional) */
    sessionLogFile: string;
    /** Heading to append logs under (default: "## Session Log") */
    sessionLogHeading: string;
    /** Scheduled time blocks for this Line */
    scheduledBlocks: ScheduledBlock[];
    /** Custom operator commands for this Line */
    customCommands: OperatorCommand[];
}

/**
 * Represents a command in the Operator Menu
 */
export interface OperatorCommand {
    /** Display name */
    name: string;
    /** Emoji or icon */
    icon: string;
    /** Type of action */
    action: "command" | "insert" | "open";
    /** Command ID, snippet text, or file path */
    value: string;
}

/**
 * Represents a recorded session for statistics
 */
export interface SessionRecord {
    /** Line ID */
    lineId: string;
    /** Line name at time of session */
    lineName: string;
    /** Date in YYYY-MM-DD format */
    date: string;
    /** Start time in HH:MM format */
    startTime: string;
    /** End time in HH:MM format */
    endTime: string;
    /** Duration in minutes */
    durationMinutes: number;
    /** Optional session summary */
    summary?: string;
}

/**
 * Plugin settings stored in data.json
 */
export interface SwitchboardSettings {
    /** All configured lines */
    lines: SwitchboardLine[];
    /** Currently active line ID, or null if disconnected */
    activeLine: string | null;
    /** Enable Chronos integration for "Incoming Calls" */
    chronosIntegrationEnabled: boolean;
    /** Default snooze time in minutes for "Hold" action */
    defaultSnoozeMinutes: number;
    /** Auto-disconnect when scheduled block ends */
    autoDisconnect: boolean;
    /** Session history for statistics */
    sessionHistory: SessionRecord[];
    /** Mute all sounds */
    muteSounds: boolean;
    /** Sound type: synthesized or realistic */
    soundType: "synthesized" | "realistic";
    /** Enable goal prompt on patch-in */
    enableGoalPrompt: boolean;
    /** Break reminder interval in minutes (0 = disabled) */
    breakReminderMinutes: number;
    /** Enable logging to daily notes */
    enableDailyNoteLogging: boolean;
    /** Folder path for daily notes */
    dailyNotesFolder: string;
    /** Heading to append logs under in daily notes */
    dailyNoteHeading: string;
    /** Enable debug logging to console */
    debugMode: boolean;
}

/**
 * Default settings for new installations
 */
export const DEFAULT_SETTINGS: SwitchboardSettings = {
    lines: [],
    activeLine: null,
    chronosIntegrationEnabled: true,
    defaultSnoozeMinutes: 5,
    autoDisconnect: false,
    sessionHistory: [],
    muteSounds: false,
    soundType: "synthesized",
    enableGoalPrompt: true,
    breakReminderMinutes: 60,
    enableDailyNoteLogging: false,
    dailyNotesFolder: "",
    dailyNoteHeading: "### Switchboard Logs",
    debugMode: false,
};

/**
 * Preset colors for the color picker swatches
 */
export const PRESET_COLORS: string[] = [
    "#e74c3c", // Red
    "#e67e22", // Orange
    "#f1c40f", // Yellow
    "#2ecc71", // Green
    "#1abc9c", // Teal
    "#3498db", // Blue
    "#9b59b6", // Purple
    "#e91e63", // Pink
    "#607d8b", // Gray
    "#34495e", // Dark Gray
];

/**
 * Generates a slug ID from a name
 */
export function generateId(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
