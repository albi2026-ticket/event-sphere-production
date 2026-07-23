(function () {
  "use strict";

  const WORKER_PATH = "/assets/vendor/qr-scanner/qr-scanner-worker.min.js";

  class TiketaQrCameraScanner {
    constructor(options) {
      this.video = options.video;
      this.onDecode = options.onDecode;
      this.onDecodeError = options.onDecodeError;
      this.preferredCamera = options.preferredCamera || "environment";
      this.maxScansPerSecond = options.maxScansPerSecond || 2;
      this.scanner = null;
    }

    async start() {
      if (!this.video) return;
      if (!window.QrScanner) {
        throw new Error("Camera QR scanning is not supported in this browser. Use manual lookup.");
      }

      this.stop();
      window.QrScanner.WORKER_PATH = WORKER_PATH;
      this.scanner = new window.QrScanner(
        this.video,
        (result) => {
          const raw = typeof result === "string" ? result : result?.data;
          if (raw) this.onDecode?.(raw, result);
        },
        {
          preferredCamera: this.preferredCamera,
          maxScansPerSecond: this.maxScansPerSecond,
          returnDetailedScanResult: true,
          onDecodeError: (error) => this.onDecodeError?.(error),
        },
      );

      await this.scanner.start();
    }

    stop() {
      if (!this.scanner) return;
      this.scanner.destroy();
      this.scanner = null;
      if (this.video) this.video.srcObject = null;
    }
  }

  window.TiketaQrCameraScanner = TiketaQrCameraScanner;
})();
