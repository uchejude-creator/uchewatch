export type PlayerState =
  "playing" | "paused" | "buffering" | "ended" | "unstarted";
export interface ProviderCallbacks {
  onState: (state: PlayerState) => void;
  onError: (message: string) => void;
  onAutoplayBlocked: () => void;
}
/** Provider-neutral boundary. A future extension supplies this adapter through a
 * consented message bridge; room membership and synchronization stay unchanged.
 * No provider may bypass DRM or manipulate protected streaming services. */
export interface VideoProvider {
  mount(
    element: HTMLElement,
    videoId: string,
    callbacks: ProviderCallbacks,
  ): Promise<void>;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  load(videoId: string): void;
  getCurrentTime(): number;
  getDuration(): number;
  getState(): PlayerState;
  setVolume(volume: number): void;
  destroy(): void;
}
