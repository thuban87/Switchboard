/**
 * AudioService Tests (Phase 3)
 * Verifies mute toggle, sound type routing, error handling, and cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

function createMockAudioContext() {
    const gainNode = {
        gain: {
            value: 0,
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
    };
    const oscillatorNode = {
        frequency: {
            value: 0,
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
        },
        type: "sine",
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    };

    return {
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn(() => oscillatorNode),
        createGain: vi.fn(() => gainNode),
        close: vi.fn(),
    };
}

function createMockPlugin(overrides: Record<string, any> = {}) {
    return {
        settings: {
            muteSounds: false,
            soundType: "synthesized" as "synthesized" | "realistic",
            ...overrides,
        },
    } as any;
}

describe("playPatchIn", () => {
    let originalAudioContext: any;

    beforeEach(() => {
        originalAudioContext = (window as any).AudioContext;
        (window as any).AudioContext = vi.fn(() => createMockAudioContext());
    });

    afterEach(() => {
        (window as any).AudioContext = originalAudioContext;
    });

    it("does nothing when muteSounds is true", () => {
        const plugin = createMockPlugin({ muteSounds: true });
        const service = new AudioService(plugin);

        // Should not throw, should not create AudioContext
        service.playPatchIn();

        expect((window as any).AudioContext).not.toHaveBeenCalled();
    });

    it("calls playSynthesizedClick when soundType is 'synthesized'", () => {
        const plugin = createMockPlugin({ soundType: "synthesized" });
        const service = new AudioService(plugin);
        const spy = vi.spyOn(service as any, "playSynthesizedClick");

        service.playPatchIn();

        expect(spy).toHaveBeenCalled();
    });

    it("calls playRealisticClick when soundType is 'realistic'", () => {
        const plugin = createMockPlugin({ soundType: "realistic" });
        const service = new AudioService(plugin);
        const spy = vi.spyOn(service as any, "playRealisticClick");

        service.playPatchIn();

        expect(spy).toHaveBeenCalled();
    });
});

describe("error handling", () => {
    it("catches AudioContext creation failure gracefully (no throw)", () => {
        const originalAudioContext = (window as any).AudioContext;
        (window as any).AudioContext = vi.fn(() => {
            throw new Error("AudioContext not supported");
        });

        const plugin = createMockPlugin({ soundType: "synthesized" });
        const service = new AudioService(plugin);

        // Should not throw — error is caught internally
        expect(() => service.playPatchIn()).not.toThrow();

        (window as any).AudioContext = originalAudioContext;
    });
});

describe("destroy", () => {
    it("closes AudioContext and nulls references", () => {
        const originalAudioContext = (window as any).AudioContext;
        const closeSpy = vi.fn();

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

        // Trigger AudioContext creation by playing a sound
        service.playPatchIn();

        service.destroy();

        expect(closeSpy).toHaveBeenCalled();
        expect((service as any).audioContext).toBeNull();
        expect((service as any).audioElement).toBeNull();

        (window as any).AudioContext = originalAudioContext;
    });
});
