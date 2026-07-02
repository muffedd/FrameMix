import { formatTime } from "./utils";

function seek(video, time) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("The video could not be read at that moment."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.03));
  });
}

export async function extractFrames(video, count, onProgress) {
  if (!video.duration || !video.videoWidth) {
    throw new Error("This video is not ready yet. Try uploading it again.");
  }

  const captureWidth = video.videoWidth;
  const captureHeight = video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = captureWidth;
  canvas.height = captureHeight;
  const context = canvas.getContext("2d");
  const frames = [];
  const start = Math.min(video.duration * 0.015, 0.35);
  const end = Math.max(start, video.duration - Math.min(video.duration * 0.015, 0.35));

  for (let index = 0; index < count; index += 1) {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const time = start + (end - start) * ratio;
    await seek(video, time);
    context.drawImage(video, 0, 0, captureWidth, captureHeight);
    const src = canvas.toDataURL("image/png");
    frames.push({
      id: `${Date.now()}-${index}`,
      number: index + 1,
      time,
      label: formatTime(time),
      src,
      kept: true,
      favorite: false,
    });
    onProgress?.(Math.round(((index + 1) / count) * 100), index + 1);
  }

  return frames;
}
