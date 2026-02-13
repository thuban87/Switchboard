/**
 * Error Boundaries Tests (Phase 3)
 * Verifies that service failures don't crash the plugin.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { AudioService } from "../../src/services/AudioService";

// Mock Logger to silence output
vi.mock("../../src/services/Logger", () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock audio-data to avoid importing the large base64 string
vi.mock("../../src/services/audio-data", () => ({
    CLICK_AUDIO_DATA: "data:audio/wav;base64,AAAA",
}));

function createMockPlugin() {
    return {
        settings: {
            muteSounds: false,
            soundType: "synthesized" as const,
        },
    } as any;
}

describe("service failure isolation", () => {
    let originalAudioContext: any;

    afterEach(() => {
        if (originalAudioContext !== undefined) {
            (window as any).AudioContext = originalAudioContext;
        }
    });

    it("AudioService.playPatchIn catches errors without propagation", () => {
        originalAudioContext = (window as any).AudioContext;
        (window as any).AudioContext = vi.fn(() => {
            throw new Error("AudioContext not available");
        });

        const plugin = createMockPlugin();
        const service = new AudioService(plugin);

        // The error should be caught internally — no exception propagation
        expect(() => service.playPatchIn()).not.toThrow();
    });

    it("AudioService.destroy handles already-closed AudioContext gracefully", () => {
        originalAudioContext = (window as any).AudioContext;
        const closeSpy = vi.fn(() => { throw new Error("Context already closed"); });

        // Use a class so `new AudioContext()` works properly
        (window as any).AudioContext = class {
            currentTime = 0;
            destination = {};
            close = closeSpy;
            createOscillator() {
                return {
                    frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
                    type: "sine",
                    connect: vi.fn(),
                    start: vi.fn(),
                    stop: vi.fn(),
                };
            }
            createGain() {
                return {
                    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
                    connect: vi.fn(),
                };
            }
        };

        const plugin = createMockPlugin();
        const service = new AudioService(plugin);

        // Trigger AudioContext creation
        service.playPatchIn();

        // destroy() should not throw even if close() throws
        expect(() => service.destroy()).not.toThrow();
        expect((service as any).audioContext).toBeNull();
    });
});
