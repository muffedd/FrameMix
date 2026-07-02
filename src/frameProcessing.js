import { loadImage } from "./utils";

export const PROCESSING_MODES = [
  { id: "original", label: "Original", detail: "Keep the color" },
  { id: "mono", label: "B & W", detail: "Quiet grayscale" },
  { id: "contrast", label: "High contrast", detail: "Bold light & dark" },
  { id: "tracing", label: "Tracing", detail: "Light pencil guide" },
];

function processPixels(context, width, height, mode) {
  if (mode === "original") return;
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
    let value = gray;
    if (mode === "contrast") value = gray > 132 ? 255 : 18;
    if (mode === "tracing") value = Math.round(188 + gray * 0.26);
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
}

function drawFit(context, image, x, y, width, height, fit = "contain", background = "#fff") {
  const scale = fit === "cover"
    ? Math.max(width / image.width, height / image.height)
    : Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.fillStyle = background;
  context.fillRect(x, y, width, height);
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

export async function createProcessedCanvas(frame, mode = "original", maxWidth = Infinity) {
  const image = await loadImage(frame.src);
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  processPixels(context, canvas.width, canvas.height, mode);
  return canvas;
}

export async function renderSheet({
  frames,
  mode,
  columns,
  rows,
  margin,
  gap,
  fit,
  border,
  showNumbers,
  showTimestamps,
  cuttingGuides,
  pageWidth = 1240,
  pageHeight = 1754,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = pageWidth;
  canvas.height = pageHeight;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const scale = pageWidth / 210;
  const marginPx = margin * scale;
  const gapPx = gap * scale;
  const cellWidth = (pageWidth - marginPx * 2 - gapPx * (columns - 1)) / columns;
  const cellHeight = (pageHeight - marginPx * 2 - gapPx * (rows - 1)) / rows;

  for (let index = 0; index < Math.min(frames.length, columns * rows); index += 1) {
    const frame = frames[index];
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = marginPx + col * (cellWidth + gapPx);
    const y = marginPx + row * (cellHeight + gapPx);
    const labelHeight = showNumbers || showTimestamps ? Math.min(34, cellHeight * 0.13) : 0;
    const imageHeight = cellHeight - labelHeight;
    const processed = await createProcessedCanvas(frame, mode);
    drawFit(context, processed, x, y, cellWidth, imageHeight, fit);

    if (border) {
      context.strokeStyle = "#25231f";
      context.lineWidth = 1.6;
      context.strokeRect(x, y, cellWidth, imageHeight);
    }

    if (cuttingGuides) {
      context.save();
      context.strokeStyle = "#a7a39b";
      context.lineWidth = 1;
      context.setLineDash([7, 7]);
      context.strokeRect(x - 4, y - 4, cellWidth + 8, imageHeight + 8);
      context.restore();
    }

    if (labelHeight) {
      context.fillStyle = "#ffffff";
      context.fillRect(x, y + imageHeight, cellWidth, labelHeight);
      context.fillStyle = "#25231f";
      context.font = `600 ${Math.max(14, Math.min(20, labelHeight * 0.52))}px Arial`;
      context.textBaseline = "middle";
      const left = showNumbers ? `FRAME ${String(frame.number).padStart(2, "0")}` : "";
      const right = showTimestamps ? frame.label : "";
      context.fillText(left, x, y + imageHeight + labelHeight / 2);
      if (right) {
        context.textAlign = "right";
        context.fillStyle = "#6d6961";
        context.fillText(right, x + cellWidth, y + imageHeight + labelHeight / 2);
        context.textAlign = "left";
      }
    }
  }

  return canvas;
}
