import type SwitchboardPlugin from "../main";
import { Logger } from "./Logger";

/**
 * AudioService - Handles sound effects for Switchboard
 * 
 * For realistic sounds, place a 'click.mp3' file in the plugin folder
 * at: .obsidian/plugins/switchboard/click.mp3
 */
export class AudioService {
    private plugin: SwitchboardPlugin;
    private audioContext: AudioContext | null = null;
    private clickAudioUrl: string | null = null;
    private audioLoaded: boolean = false;

    constructor(plugin: SwitchboardPlugin) {
        this.plugin = plugin;
        // Pre-load the audio file on construction
        this.loadAudioFile();
    }

    /**
     * Pre-load the audio file using Obsidian's adapter
     */
    private async loadAudioFile(): Promise<void> {
        try {
            const adapter = (this.plugin.app.vault as any).adapter;
            const pluginDir = ".obsidian/plugins/switchboard";
            const filePath = `${pluginDir}/click.mp3`;

            // Check if file exists
            const exists = await adapter.exists(filePath);
            if (!exists) {
                Logger.debug("Audio", "click.mp3 not found in plugin folder");
                return;
            }

            // Read the file as binary
            const data = await adapter.readBinary(filePath);

            // Convert to blob URL
            const blob = new Blob([data], { type: "audio/mpeg" });
            this.clickAudioUrl = URL.createObjectURL(blob);
            this.audioLoaded = true;
            Logger.debug("Audio", "Loaded click.mp3 successfully");
        } catch (e) {
            Logger.warn("Audio", "Could not load click.mp3", e);
        }
    }

    /**
     * Play sound on patch-in
     */
    playPatchIn(): void {
        if (this.plugin.settings.muteSounds) return;

        if (this.plugin.settings.soundType === "realistic") {
            this.playRealisticClick();
        } else {
            this.playSynthesizedClick();
        }
    }

    /**
     * Play sound on disconnect
     */
    playDisconnect(): void {
        if (this.plugin.settings.muteSounds) return;

        if (this.plugin.settings.soundType === "realistic") {
            this.playRealisticClick();
        } else {
            this.playSynthesizedDisconnect();
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
     * Play realistic click from pre-loaded audio
     */
    private playRealisticClick(): void {
        if (!this.audioLoaded || !this.clickAudioUrl) {
            Logger.warn("Audio", "click.mp3 not loaded, using synthesized");
            this.playSynthesizedClick();
            return;
        }

        try {
            const audio = new Audio(this.clickAudioUrl);
            audio.volume = 0.5;
            audio.play().catch(() => {
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
        if (this.clickAudioUrl) {
            URL.revokeObjectURL(this.clickAudioUrl);
            this.clickAudioUrl = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
