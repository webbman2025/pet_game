import { memo, useEffect, useRef } from "react";
import { decompressFrames, parseGIF, type ParsedFrame, type ParsedGif } from "gifuct-js";

interface CanvasGifPlayerProps {
  src: string;
  alt: string;
  className?: string;
  wrapperRef?: React.Ref<HTMLDivElement>;
  onLoad?: () => void;
}

export const CanvasGifPlayer = memo(function CanvasGifPlayer({
  src,
  alt,
  className,
  wrapperRef,
  onLoad,
}: CanvasGifPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(true);

  const setWrapperRef = (node: HTMLDivElement | null) => {
    if (typeof wrapperRef === "function") {
      wrapperRef(node);
    } else if (wrapperRef && "current" in wrapperRef) {
      wrapperRef.current = node;
    }
  };

  useEffect(() => {
    let cancelled = false;
    playingRef.current = !document.hidden;

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    let renderFrame: (() => void) | null = null;

    const startAnimation = (gif: ParsedGif, frames: ParsedFrame[]) => {
      const canvas = canvasRef.current;
      if (!canvas || frames.length === 0 || cancelled) {
        return;
      }

      const width = gif.lsd.width;
      const height = gif.lsd.height;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        return;
      }

      const gifCanvas = document.createElement("canvas");
      gifCanvas.width = width;
      gifCanvas.height = height;
      const gifCtx = gifCanvas.getContext("2d");
      if (!gifCtx) {
        return;
      }

      let frameIndex = 0;
      let frameImageData: ImageData | null = null;
      let needsDisposal = false;

      const drawPatch = (frame: ParsedFrame) => {
        const { dims } = frame;

        if (
          !frameImageData ||
          dims.width !== frameImageData.width ||
          dims.height !== frameImageData.height
        ) {
          tempCanvas.width = dims.width;
          tempCanvas.height = dims.height;
          frameImageData = tempCtx.createImageData(dims.width, dims.height);
        }

        frameImageData.data.set(frame.patch);
        tempCtx.putImageData(frameImageData, 0, 0);
        gifCtx.drawImage(tempCanvas, dims.left, dims.top);
      };

      renderFrame = () => {
        if (cancelled || !playingRef.current) {
          return;
        }

        const frame = frames[frameIndex];
        const start = performance.now();

        if (needsDisposal) {
          gifCtx.clearRect(0, 0, width, height);
          needsDisposal = false;
        }

        drawPatch(frame);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(gifCanvas, 0, 0);

        if (frame.disposalType === 2) {
          needsDisposal = true;
        }

        frameIndex = (frameIndex + 1) % frames.length;

        const elapsed = performance.now() - start;
        const delay = Math.max(0, frame.delay - elapsed);

        clearTimer();
        timeoutRef.current = setTimeout(() => {
          requestAnimationFrame(() => renderFrame?.());
        }, delay);
      };

      onLoad?.();
      renderFrame();
    };

    const loadGif = async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`Failed to fetch GIF (${response.status})`);
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) {
          return;
        }

        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);
        if (cancelled) {
          return;
        }

        startAnimation(gif, frames);
      } catch (error) {
        console.error("Failed to load GIF animation:", error);
      }
    };

    const handleVisibilityChange = () => {
      playingRef.current = !document.hidden;

      if (document.hidden) {
        clearTimer();
        return;
      }

      if (!cancelled && renderFrame) {
        renderFrame();
      }
    };

    clearTimer();
    loadGif();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      renderFrame = null;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [src, onLoad]);

  return (
    <div ref={setWrapperRef} aria-label={alt} role="img">
      <canvas ref={canvasRef} className={className} />
    </div>
  );
});
