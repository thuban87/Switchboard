/**
 * Switchboard Types
 * Core interfaces for the plugin
 */

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
}

/**
 * Default settings for new installations
 */
export const DEFAULT_SETTINGS: SwitchboardSettings = {
    lines: [],
    activeLine: null,
    chronosIntegrationEnabled: true,
    defaultSnoozeMinutes: 5,
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
