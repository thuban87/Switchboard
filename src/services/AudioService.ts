import type SwitchboardPlugin from "../main";
import { Logger } from "./Logger";
import { CLICK_AUDIO_DATA } from "./audio-data";

/**
 * AudioService - Handles sound effects for Switchboard
 * 
 * Realistic sounds use an embedded base64 audio file (no external dependencies).
 */
export class AudioService {
    private plugin: SwitchboardPlugin;
    private audioContext: AudioContext | null = null;
    private audioElement: HTMLAudioElement | null = null;

    constructor(plugin: SwitchboardPlugin) {
        this.plugin = plugin;
    }


    /**
     * Play sound on patch-in
     */
    playPatchIn(): void {
        if (this.plugin.settings.muteSounds) return;

        try {
            if (this.plugin.settings.soundType === "realistic") {
                this.playRealisticClick();
            } else {
                this.playSynthesizedClick();
            }
        } catch (e) {
            Logger.warn("Audio", "Error playing patch-in sound:", e);
        }
    }

    /**
     * Play sound on disconnect
     */
    playDisconnect(): void {
        if (this.plugin.settings.muteSounds) return;

        try {
            if (this.plugin.settings.soundType === "realistic") {
                this.playRealisticClick();
            } else {
                this.playSynthesizedDisconnect();
            }
        } catch (e) {
            Logger.warn("Audio", "Error playing disconnect sound:", e);
        }
    }

    /**
     * Synthesized click using Web Audio API
     * Creates a low, satisfying "thunk" sound
     */
    private playSynthesizedClick(): void {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            // Layer 1: Low thump
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.frequency.value = 150;
            osc1.type = "sine";
            gain1.gain.setValueAtTime(0.4, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.15);

            // Layer 2: Click transient
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 400;
            osc2.type = "triangle";
            gain2.gain.setValueAtTime(0.15, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.05);
        } catch (e) {
            Logger.warn("Audio", "Failed to play synthesized click", e);
        }
    }

    /**
     * Synthesized disconnect sound
     * Creates a lower, softer "unplug" sound
     */
    private playSynthesizedDisconnect(): void {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
            osc.type = "sine";

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.12);
        } catch (e) {
            Logger.warn("Audio", "Failed to play synthesized disconnect", e);
        }
    }

    /**
     * Play realistic click from embedded audio data
     */
    private playRealisticClick(): void {
        try {
            if (!this.audioElement) {
                this.audioElement = new Audio(CLICK_AUDIO_DATA);
            }
            this.audioElement.currentTime = 0;
            this.audioElement.volume = 0.5;
            this.audioElement.play().catch(() => {
                Logger.warn("Audio", "Failed to play, using synthesized");
                this.playSynthesizedClick();
            });
        } catch (e) {
            Logger.warn("Audio", "Error playing realistic click", e);
            this.playSynthesizedClick();
        }
    }

    /**
     * Get or create AudioContext
     */
    private getAudioContext(): AudioContext | null {
        if (!this.audioContext) {
            try {
                // as any: webkitAudioContext is the Safari/older browser prefix, not in standard Window types
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                Logger.warn("Audio", "AudioContext not supported", e);
                return null;
            }
        }
        return this.audioContext;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.audioElement) {
            this.audioElement = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
