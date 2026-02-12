import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "../src/services/Logger";

describe("Logger", () => {
    let logSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        logSpy = vi.spyOn(console, "log").mockImplementation(() => { });
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Reset to default state
        Logger.setDebugMode(false);
    });

    it("debug() is suppressed when debugMode is off", () => {
        Logger.setDebugMode(false);
        Logger.debug("Test", "hello");
        expect(logSpy).not.toHaveBeenCalled();
    });

    it("debug() outputs when debugMode is on", () => {
        Logger.setDebugMode(true);
        Logger.debug("Test", "hello");
        expect(logSpy).toHaveBeenCalledWith("[Switchboard:Test]", "hello");
    });

    it("error() always outputs regardless of debug mode", () => {
        Logger.setDebugMode(false);
        Logger.error("Test", "something broke");
        expect(errorSpy).toHaveBeenCalledWith("[Switchboard:Test]", "something broke");
    });

    it("warn() always outputs regardless of debug mode", () => {
        Logger.setDebugMode(false);
        Logger.warn("Test", "watch out");
        expect(warnSpy).toHaveBeenCalledWith("[Switchboard:Test]", "watch out");
    });


    it("output format includes [Switchboard:Prefix]", () => {
        Logger.setDebugMode(true);
        Logger.debug("Circuit", "activating");
        expect(logSpy).toHaveBeenCalledWith("[Switchboard:Circuit]", "activating");
    });
});
