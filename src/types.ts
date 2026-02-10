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
    /** Schema version for future migrations */
    schemaVersion: number;
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
    schemaVersion: 1,
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
    if (!name || !name.trim()) return "";
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * Validate a vault path — reject traversal, absolute paths, dot-prefix.
 * Note: dot-prefix rejection blocks .obsidian/ (prevents plugin data corruption)
 * but also blocks user folders like .hidden-folder/. This is an intentional
 * conservative security choice — session log files should not target hidden dirs.
 */
export function validatePath(path: string): boolean {
    if (!path) return false;
    // Normalize backslashes for Windows path support
    const normalized = path.replace(/\\/g, "/");
    if (normalized.includes("..")) return false;
    if (/^[a-zA-Z]:/.test(normalized) || normalized.startsWith("/")) return false;
    if (normalized.startsWith(".")) return false;
    return true;
}

/** Validate hex color (#RRGGBB format) */
export function isValidHexColor(color: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(color);
}

/** Validate time string (HH:MM 24h format) */
export function isValidTime(time: string): boolean {
    const match = time.match(/^(\d{2}):(\d{2})$/);
    if (!match) return false;
    const h = parseInt(match[1]), m = parseInt(match[2]);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Validate date string (YYYY-MM-DD) */
export function isValidDate(date: string): boolean {
    const d = new Date(date + "T00:00:00");
    return !isNaN(d.getTime());
}

/** Format duration as "Xh Ym" or "Xm" */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/** Format 24h time to 12h format */
export function formatTime12h(time24: string): string {
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Parse 12h time string (e.g. "9:00 AM", "2:30 PM") to 24h format ("09:00", "14:30"). Returns null if invalid. */
export function parseTime12h(time12: string): string | null {
    const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === "AM" && h === 12) h = 0;
    else if (period === "PM" && h !== 12) h += 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Validate 12h time string */
export function isValidTime12h(time: string): boolean {
    return parseTime12h(time) !== null;
}
