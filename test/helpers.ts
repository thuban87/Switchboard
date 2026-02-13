import { SwitchboardLine, SessionRecord } from "../../src/types";

/** Create a test Line with sensible defaults */
export function createTestLine(overrides: Partial<SwitchboardLine> = {}): SwitchboardLine {
    return {
        id: "test-line",
        name: "Test Line",
        color: "#3498db",
        safePaths: ["Test/Path"],
        landingPage: "",
        sessionLogFile: "",
        sessionLogHeading: "",
        scheduledBlocks: [],
        customCommands: [],
        ...overrides,
    };
}

/** Create a test SessionRecord */
export function createTestSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
    return {
        lineId: "test-line",
        lineName: "Test Line",
        date: "2026-02-11",
        startTime: "09:00",
        endTime: "10:00",
        durationMinutes: 60,
        summary: "",
        ...overrides,
    };
}
