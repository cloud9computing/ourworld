// Reads QR codes from the camera. Uses the browser's own detector where there is one (Chrome on Android),
// and jsQR everywhere else (including iOS Safari).
import jsQR from 'jsqr';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export async function startScanner(video: HTMLVideoElement, onText: (text: string) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  await video.play();

  const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  let detector: Detector | null = null;
  try { if (BD) detector = new BD({ formats: ['qr_code'] }); } catch { detector = null; }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  let stopped = false, busy = false;

  const tick = async () => {
    if (stopped) return;
    if (!busy && video.readyState >= 2) {
      busy = true;
      try {
        if (detector) {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) onText(codes[0].rawValue);
        } else {
          const scale = Math.min(1, 720 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) onText(code.data);
        }
      } catch { /* keep trying */ }
      busy = false;
    }
    setTimeout(tick, 120);
  };
  tick();

  return () => { stopped = true; stream.getTracks().forEach(t => t.stop()); video.srcObject = null; };
}
