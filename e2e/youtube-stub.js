// Fake external API for isolated tests; adapters and app components stay real.
window.YT = {
  Player: class {
    constructor(element, options) {
      this.state = 2;
      this.position = 0;
      this.at = Date.now();
      this.options = options;
      this.iframe = document.createElement("iframe");
      element.replaceWith(this.iframe);
      setTimeout(() => options.events.onReady({ target: this }), 10);
    }
    getCurrentTime() {
      return Math.min(
        180,
        this.position + (this.state === 1 ? (Date.now() - this.at) / 1000 : 0),
      );
    }
    getDuration() {
      return 180;
    }
    getPlayerState() {
      return this.state;
    }
    getIframe() {
      return this.iframe;
    }
    change(state) {
      this.position = this.getCurrentTime();
      this.at = Date.now();
      this.state = state;
      this.options.events.onStateChange({ data: state, target: this });
    }
    playVideo() {
      this.change(1);
    }
    pauseVideo() {
      this.change(2);
    }
    seekTo(time) {
      this.position = time;
      this.at = Date.now();
      this.options.events.onStateChange({ data: this.state, target: this });
    }
    cueVideoById() {
      this.position = 0;
      this.change(2);
    }
    setVolume() {}
    destroy() {
      this.iframe.remove();
    }
  },
};
