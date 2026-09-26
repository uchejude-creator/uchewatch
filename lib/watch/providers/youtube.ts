import type { ProviderCallbacks, PlayerState, VideoProvider } from "./types";
let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timer = setTimeout(() => {
      apiPromise = null;
      reject(
        new Error(
          "YouTube took too long to load. Check your connection and reload the player.",
        ),
      );
    }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      previous?.();
      resolve();
    };
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    script.onerror = () => {
      clearTimeout(timer);
      script?.remove();
      apiPromise = null;
      reject(
        new Error(
          "YouTube could not load. Check your connection or content blocker.",
        ),
      );
    };
  });
  return apiPromise;
}
function stateOf(state: number): PlayerState {
  return state === 1
    ? "playing"
    : state === 2 || state === 5
      ? "paused"
      : state === 3
        ? "buffering"
        : state === 0
          ? "ended"
          : "unstarted";
}
export class YouTubeProvider implements VideoProvider {
  private player: YT.Player | null = null;
  private destroyed = false;
  async mount(
    element: HTMLElement,
    videoId: string,
    callbacks: ProviderCallbacks,
  ) {
    await loadApi();
    if (this.destroyed) return;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(
            new Error("The video player didn’t respond. Please reload it."),
          ),
        15000,
      );
      this.player = new window.YT.Player(element, {
        videoId,
        width: "100%",
        height: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          playsinline: 1,
          origin: window.location.origin,
          rel: 0,
          controls: 1,
          fs: 1,
        },
        events: {
          onReady: () => {
            clearTimeout(timeout);
            if (this.destroyed) {
              this.player?.destroy();
              return;
            }
            this.player
              ?.getIframe()
              .setAttribute("title", "Shared YouTube video player");
            resolve();
          },
          onStateChange: (event) => callbacks.onState(stateOf(event.data)),
          onError: (event) => {
            clearTimeout(timeout);
            const message = [101, 150].includes(event.data)
              ? "This video can’t be embedded. Ask the host to choose another video."
              : event.data === 100
                ? "This video is unavailable or private. Ask the host to choose another video."
                : "YouTube couldn’t play this video. Try reloading, or choose another video.";
            callbacks.onError(message);
            reject(new Error(message));
          },
          onAutoplayBlocked: () => callbacks.onAutoplayBlocked(),
        },
      });
    });
  }
  play() {
    this.player?.playVideo();
  }
  pause() {
    this.player?.pauseVideo();
  }
  seek(seconds: number) {
    this.player?.seekTo(Math.max(0, seconds), true);
  }
  load(id: string) {
    this.player?.cueVideoById(id);
  }
  getCurrentTime() {
    return this.player?.getCurrentTime?.() || 0;
  }
  getDuration() {
    return this.player?.getDuration?.() || 0;
  }
  getState() {
    return stateOf(this.player?.getPlayerState?.() ?? -1);
  }
  setVolume(volume: number) {
    this.player?.setVolume(volume);
  }
  destroy() {
    this.destroyed = true;
    this.player?.destroy();
    this.player = null;
  }
}
