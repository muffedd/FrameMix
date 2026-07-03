import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileArchive,
  FileImage,
  FileText,
  FolderOpen,
  Grid2X2,
  Heart,
  Image,
  Images,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  Scissors,
  Settings2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { PROCESSING_MODES, createProcessedCanvas, renderSheet } from "./frameProcessing";
import { estimateFrameCount, extractFrames } from "./videoFrames";
import { canvasToBlob, downloadBlob, formatBytes, formatTime, safeName } from "./utils";

const FRAME_COUNTS = [12, 24, 48, 96];
const FPS_OPTIONS = [0.5, 1, 2, 5, 10, 24];
const PURPOSES = ["Tracing", "Collage", "Cutting", "Painting reference", "Motion study"];
const LAYOUTS = [
  { id: "2x3", label: "2 × 3", columns: 2, rows: 3 },
  { id: "3x4", label: "3 × 4", columns: 3, rows: 4 },
  { id: "4x5", label: "4 × 5", columns: 4, rows: 5 },
];

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`switch ${checked ? "is-on" : ""}`}
        aria-pressed={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </label>
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="FrameMix home">
        <span className="brand-mark"><span /><span /><span /></span>
        <span>FRAMEMIX</span>
      </a>
      <nav>
        <a href="#process">HOW IT WORKS</a>
        <a href="#studio">STUDIO</a>
        <a href="#about">ABOUT</a>
      </nav>
      <button type="button" className="menu-button" aria-label="Open menu"><Menu size={22} /></button>
      <a className="header-cta" href="#studio">START MAKING <span>↗</span></a>
    </header>
  );
}

function UploadStage({ onFile, onImages, dragActive, setDragActive, error }) {
  const [sourceMode, setSourceMode] = useState("video");
  const videoInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const imagesInputRef = useRef(null);
  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (!files.length) return;
    if (sourceMode === "images") onImages(files);
    else onFile(files[0]);
  };

  return (
    <section className="upload-stage" id="studio">
      <div className="eyebrow"><span>01</span> CHOOSE YOUR SOURCE</div>
      <div className="source-tabs" role="tablist" aria-label="Artwork source">
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode === "video"}
          className={sourceMode === "video" ? "selected" : ""}
          onClick={() => setSourceMode("video")}
        >
          <Play size={15} /> VIDEO
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode === "images"}
          className={sourceMode === "images" ? "selected" : ""}
          onClick={() => setSourceMode("images")}
        >
          <Images size={16} /> IMAGE SEQUENCE
        </button>
      </div>
      <div
        className={`drop-zone ${dragActive ? "drag-active" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])}
        />
        <input
          ref={folderInputRef}
          type="file"
          accept="image/*"
          multiple
          webkitdirectory=""
          directory=""
          onChange={(event) => event.target.files?.length && onImages(Array.from(event.target.files))}
        />
        <input
          ref={imagesInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp"
          multiple
          onChange={(event) => event.target.files?.length && onImages(Array.from(event.target.files))}
        />
        <div className="drop-art" aria-hidden="true">
          <div className="film-card one"><span /></div>
          <div className="film-card two"><span /></div>
          <div className="film-card three">
            {sourceMode === "video" ? <Play size={20} fill="currentColor" /> : <Images size={23} />}
          </div>
        </div>
        <h2>{sourceMode === "video" ? "DROP YOUR VIDEO HERE" : "DROP YOUR IMAGE SEQUENCE"}</h2>
        <p>
          {sourceMode === "video"
            ? "or choose a file from your device"
            : "Images are placed in natural filename order"}
        </p>
        {sourceMode === "video" ? (
          <button className="ink-button" type="button" onClick={() => videoInputRef.current?.click()}>
            <Upload size={17} /> CHOOSE VIDEO
          </button>
        ) : (
          <div className="image-source-actions">
            <button className="ink-button" type="button" onClick={() => folderInputRef.current?.click()}>
              <FolderOpen size={17} /> CHOOSE FOLDER
            </button>
            <button className="paper-button" type="button" onClick={() => imagesInputRef.current?.click()}>
              <Images size={17} /> CHOOSE IMAGES
            </button>
          </div>
        )}
        <div className="file-note">
          {sourceMode === "video" ? "MP4, MOV OR WEBM" : "PNG, JPG, WEBP OR BMP"}
          <i />
          {sourceMode === "video" ? "UP TO 500 MB" : "LOSSLESS PNG EXPORT"}
        </div>
      </div>
      {error && <div className="error-banner"><X size={17} /> {error}</div>}
      <div className="privacy-note">
        <LockKeyhole size={15} /> {sourceMode === "video"
          ? "Your video stays on your device while sheets are made."
          : "Your images stay on your device while sheets are made."}
      </div>
    </section>
  );
}

function SetupStage({
  videoInfo,
  extractionMode,
  setExtractionMode,
  count,
  setCount,
  customCount,
  setCustomCount,
  fps,
  setFps,
  purpose,
  setPurpose,
  onExtract,
  loading,
  error,
}) {
  const selectedCount = count === "custom" ? customCount : count;
  const extractionSettings = extractionMode === "fps"
    ? { mode: "fps", fps }
    : { mode: "count", count: Number(selectedCount) };
  const estimatedCount = estimateFrameCount(videoInfo.duration, extractionSettings);
  const overLimit = estimatedCount > 240;

  return (
    <section className="setup-stage">
      <div className="section-heading">
        <div className="eyebrow"><span>02</span> SHAPE YOUR SEQUENCE</div>
        <h2>CHOOSE YOUR FRAMES</h2>
        <p>Choose a final frame count, or capture a steady number of frames every second.</p>
      </div>
      <div className="video-strip">
        <div className="video-thumb">
          <img src={videoInfo.poster} alt="" />
          <span><Play size={14} fill="currentColor" /></span>
        </div>
        <div className="video-details">
          <strong>{videoInfo.file.name}</strong>
          <span>{formatTime(videoInfo.duration)} &nbsp;•&nbsp; {videoInfo.width} × {videoInfo.height} &nbsp;•&nbsp; {formatBytes(videoInfo.file.size)}</span>
        </div>
        <button className="text-button" type="button" onClick={() => window.location.reload()}><RotateCcw size={14} /> CHANGE</button>
      </div>
      <div className="setup-grid">
        <div className="control-card">
          <label>HOW SHOULD WE PICK?</label>
          <div className="extraction-tabs">
            <button
              type="button"
              className={extractionMode === "count" ? "selected" : ""}
              onClick={() => setExtractionMode("count")}
            >
              TOTAL FRAMES
              <span>Spread across the video</span>
            </button>
            <button
              type="button"
              className={extractionMode === "fps" ? "selected" : ""}
              onClick={() => setExtractionMode("fps")}
            >
              FRAMES PER SECOND
              <span>Capture at a steady rhythm</span>
            </button>
          </div>

          {extractionMode === "count" ? (
            <>
              <div className="count-options">
                {FRAME_COUNTS.map((value) => (
                  <button
                    key={value}
                    className={count === value ? "selected" : ""}
                    type="button"
                    onClick={() => setCount(value)}
                  >
                    <strong>{value}</strong><span>frames</span>
                  </button>
                ))}
                <button className={count === "custom" ? "selected" : ""} type="button" onClick={() => setCount("custom")}>
                  <strong>•••</strong><span>custom</span>
                </button>
              </div>
              {count === "custom" && (
                <div className="custom-count">
                  <input type="range" min="2" max="120" value={customCount} onChange={(event) => setCustomCount(Number(event.target.value))} />
                  <strong>{customCount} frames</strong>
                </div>
              )}
            </>
          ) : (
            <div className="fps-picker">
              <div className="fps-options">
                {FPS_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={fps === value ? "selected" : ""}
                    onClick={() => setFps(value)}
                  >
                    <strong>{value}</strong><span>FPS</span>
                  </button>
                ))}
              </div>
              <label className="custom-fps">
                <span>CUSTOM FPS</span>
                <input
                  type="number"
                  min="0.1"
                  max="60"
                  step="0.1"
                  value={fps}
                  onChange={(event) => setFps(Math.max(0.1, Number(event.target.value) || 0.1))}
                />
              </label>
              <div className={`frame-estimate ${overLimit ? "is-warning" : ""}`}>
                <strong>ABOUT {estimatedCount} FRAMES</strong>
                <span>{fps} FPS × {videoInfo.duration.toFixed(1)} seconds</span>
              </div>
            </div>
          )}
        </div>
        <div className="control-card">
          <label>WHAT ARE YOU MAKING?</label>
          <div className="purpose-options">
            {PURPOSES.map((item) => (
              <button key={item} type="button" className={purpose === item ? "selected" : ""} onClick={() => setPurpose(item)}>
                {item === "Tracing" && <FileText size={16} />}
                {item === "Collage" && <Grid2X2 size={16} />}
                {item === "Cutting" && <Scissors size={16} />}
                {item === "Painting reference" && <Image size={16} />}
                {item === "Motion study" && <Play size={16} />}
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
      {overLimit && (
        <div className="error-banner">
          <X size={17} /> That setting would make {estimatedCount} full-resolution PNGs. Choose 240 frames or fewer.
        </div>
      )}
      {error && !overLimit && <div className="error-banner"><X size={17} /> {error}</div>}
      <button className="primary-action" type="button" onClick={() => onExtract(extractionSettings)} disabled={loading || overLimit}>
        {loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
        {loading ? "GATHERING FRAMES…" : `GATHER ${estimatedCount} FRAMES`}
      </button>
    </section>
  );
}

function ProgressStage({ progress, current, total }) {
  return (
    <section className="progress-stage" aria-live="polite">
      <div className="progress-art">
        <div className="progress-reel"><span /><span /><span /><span /></div>
        <Sparkles className="spark one" size={19} />
        <Sparkles className="spark two" size={14} />
      </div>
      <div className="eyebrow">MAKING YOUR SEQUENCE</div>
      <h2>GATHERING THE GOOD BITS</h2>
      <p>Reading moment {current} of {total}. Your video never leaves this device.</p>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <strong>{progress}%</strong>
    </section>
  );
}

function FrameCard({ frame, mode, onToggle, onFavorite, onMove, index, total }) {
  return (
    <article className={`frame-card ${!frame.kept ? "removed" : ""}`}>
      <div className={`frame-image mode-${mode}`}>
        <img src={frame.src} alt={`Frame ${frame.number} at ${frame.label}`} />
        {!frame.kept && <div className="removed-label">REMOVED</div>}
        <button
          className={`favorite-button ${frame.favorite ? "active" : ""}`}
          type="button"
          onClick={() => onFavorite(frame.id)}
          aria-label={frame.favorite ? "Remove favorite" : "Favorite frame"}
        >
          <Heart size={17} fill={frame.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="frame-meta">
        <div className="frame-identity"><strong>FRAME {String(frame.number).padStart(2, "0")}</strong><span title={frame.label}>{frame.label}</span></div>
        <div className="frame-actions">
          <div className="reorder-actions" aria-label={`Reorder frame ${frame.number}`}>
            <button type="button" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move frame earlier"><ArrowLeft size={13} /></button>
            <button type="button" disabled={index === total - 1} onClick={() => onMove(index, index + 1)} aria-label="Move frame later"><ArrowRight size={13} /></button>
          </div>
          <button className={`keep-button ${frame.kept ? "kept" : ""}`} type="button" onClick={() => onToggle(frame.id)}>
            {frame.kept ? <><Check size={14} /> KEEP</> : "RESTORE"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ReviewStage({ frames, setFrames, mode, setMode, onRegenerate, regenerateLabel = "REGENERATE", onContinue }) {
  const keptCount = frames.filter((frame) => frame.kept).length;
  const toggleAll = (kept) => setFrames((items) => items.map((item) => ({ ...item, kept })));
  const moveFrame = (from, to) => {
    if (to < 0 || to >= frames.length) return;
    setFrames((items) => {
      const reordered = [...items];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      return reordered.map((item, index) => ({ ...item, number: index + 1 }));
    });
  };
  return (
    <section className="review-stage" id="process">
      <div className="section-heading row">
        <div>
          <div className="eyebrow"><span>03</span> EDIT YOUR PICKS</div>
          <h2>PICK THE FRAMES YOU WANT</h2>
          <p>Keep the moments with energy. Leave the rest on the cutting-room floor.</p>
        </div>
        <div className="selection-count"><strong>{keptCount}</strong><span>of {frames.length}<br />frames kept</span></div>
      </div>
      <div className="review-toolbar">
        <div className="mode-pills">
          {PROCESSING_MODES.map((item) => (
            <button key={item.id} type="button" className={mode === item.id ? "selected" : ""} onClick={() => setMode(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={() => toggleAll(true)}><Check size={14} /> KEEP ALL</button>
          <button type="button" onClick={() => toggleAll(false)}><X size={14} /> CLEAR</button>
          <button type="button" onClick={onRegenerate}><RefreshCw size={14} /> {regenerateLabel}</button>
        </div>
      </div>
      <div className="frame-grid">
        {frames.map((frame, index) => (
          <FrameCard
            key={frame.id}
            frame={frame}
            mode={mode}
            index={index}
            total={frames.length}
            onMove={moveFrame}
            onToggle={(id) => setFrames((items) => items.map((item) => item.id === id ? { ...item, kept: !item.kept } : item))}
            onFavorite={(id) => setFrames((items) => items.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item))}
          />
        ))}
      </div>
      <button className="primary-action" type="button" onClick={onContinue} disabled={!keptCount}>
        MAKE MY PRINT SHEET <span>→</span>
      </button>
    </section>
  );
}

function SheetPreview({ preview, pageCount, activePage, setActivePage }) {
  return (
    <div className="preview-panel">
      <div className="preview-topline">
        <div><Printer size={17} /><strong>PRINT PREVIEW</strong></div>
        <span>A4 • PAGE {activePage + 1} OF {pageCount}</span>
      </div>
      <div className="paper-wrap">
        {preview ? <img className="paper-preview" src={preview} alt={`Print sheet page ${activePage + 1}`} /> : <div className="paper-loading"><LoaderCircle className="spin" /></div>}
      </div>
      {pageCount > 1 && (
        <div className="page-dots">
          {Array.from({ length: pageCount }, (_, index) => (
            <button key={index} className={index === activePage ? "active" : ""} onClick={() => setActivePage(index)} aria-label={`Show page ${index + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function BuilderStage({ frames, mode, setMode, videoName, onBack }) {
  const selectedFrames = useMemo(() => frames.filter((frame) => frame.kept), [frames]);
  const [layoutId, setLayoutId] = useState("3x4");
  const [margin, setMargin] = useState(10);
  const [gap, setGap] = useState(4);
  const [fit, setFit] = useState("contain");
  const [border, setBorder] = useState(true);
  const [cuttingGuides, setCuttingGuides] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState("");
  const layout = LAYOUTS.find((item) => item.id === layoutId);
  const perPage = layout.columns * layout.rows;
  const pages = Math.max(1, Math.ceil(selectedFrames.length / perPage));

  const settings = useMemo(() => ({
    mode, columns: layout.columns, rows: layout.rows, margin, gap, fit, border,
    showNumbers, showTimestamps, cuttingGuides,
  }), [mode, layout.columns, layout.rows, margin, gap, fit, border, showNumbers, showTimestamps, cuttingGuides]);

  useEffect(() => {
    let cancelled = false;
    const update = async () => {
      setRendering(true);
      const next = [];
      for (let page = 0; page < pages; page += 1) {
        const canvas = await renderSheet({
          ...settings,
          frames: selectedFrames.slice(page * perPage, (page + 1) * perPage),
          pageWidth: 620,
          pageHeight: 877,
        });
        next.push(canvas.toDataURL("image/png"));
      }
      if (!cancelled) {
        setPreviews(next);
        setActivePage((value) => Math.min(value, next.length - 1));
        setRendering(false);
      }
    };
    const timer = window.setTimeout(update, 90);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [selectedFrames, pages, perPage, settings]);

  const exportPdf = async () => {
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      for (let page = 0; page < pages; page += 1) {
        if (page > 0) pdf.addPage("a4", "portrait");
        const canvas = await renderSheet({
          ...settings,
          frames: selectedFrames.slice(page * perPage, (page + 1) * perPage),
          pageWidth: 2480,
          pageHeight: 3508,
        });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "NONE");
      }
      pdf.save(`${safeName(videoName)}-framemix.pdf`);
    } finally {
      setExporting("");
    }
  };

  const exportZip = async () => {
    setExporting("zip");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (let index = 0; index < selectedFrames.length; index += 1) {
        const frame = selectedFrames[index];
        const canvas = await createProcessedCanvas(frame, mode);
        const blob = await canvasToBlob(canvas, "image/png");
        zip.file(`frame-${String(index + 1).padStart(3, "0")}-${frame.label.replace(":", "-")}.png`, blob);
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBlob(blob, `${safeName(videoName)}-frames.zip`);
    } finally {
      setExporting("");
    }
  };

  const exportPng = async () => {
    setExporting("png");
    try {
      const canvas = await renderSheet({
        ...settings,
        frames: selectedFrames.slice(0, perPage),
        pageWidth: 2480,
        pageHeight: 3508,
      });
      const blob = await canvasToBlob(canvas, "image/png");
      downloadBlob(blob, `${safeName(videoName)}-contact-sheet.png`);
    } finally {
      setExporting("");
    }
  };

  return (
    <section className="builder-stage">
      <button className="back-button" type="button" onClick={onBack}>← BACK TO FRAME PICKS</button>
      <div className="section-heading row">
        <div>
          <div className="eyebrow"><span>04</span> BUILD YOUR SHEET</div>
          <h2>MAKE IT READY FOR PAPER</h2>
          <p>Set the rhythm, breathing room, and marks you want on the final print.</p>
        </div>
        <div className="sheet-summary"><strong>{selectedFrames.length}</strong><span>frames<br />{pages} {pages === 1 ? "page" : "pages"}</span></div>
      </div>
      <div className="builder-grid">
        <aside className="builder-controls">
          <div className="settings-group">
            <label>SHEET LAYOUT</label>
            <div className="layout-options">
              {LAYOUTS.map((item) => (
                <button key={item.id} className={layoutId === item.id ? "selected" : ""} type="button" onClick={() => setLayoutId(item.id)}>
                  <span className={`mini-grid grid-${item.id}`}>{Array.from({ length: Math.min(item.rows * item.columns, 12) }, (_, index) => <i key={index} />)}</span>
                  <strong>{item.label}</strong><small>{item.columns * item.rows} per page</small>
                </button>
              ))}
            </div>
          </div>
          <div className="settings-group two-col">
            <label>PAPER</label>
            <button className="select-button" type="button">A4 PORTRAIT <ChevronDown size={15} /></button>
            <label>IMAGE FIT</label>
            <div className="segmented">
              <button className={fit === "contain" ? "selected" : ""} onClick={() => setFit("contain")}>FIT</button>
              <button className={fit === "cover" ? "selected" : ""} onClick={() => setFit("cover")}>FILL</button>
            </div>
          </div>
          <div className="settings-group">
            <label>IMAGE TREATMENT</label>
            <div className="treatment-grid">
              {PROCESSING_MODES.map((item) => (
                <button key={item.id} className={mode === item.id ? "selected" : ""} onClick={() => setMode(item.id)}>
                  <span className={`treatment-swatch swatch-${item.id}`} />
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="settings-group range-group">
            <div><label>MARGINS</label><strong>{margin} mm</strong></div>
            <input type="range" min="4" max="25" value={margin} onChange={(event) => setMargin(Number(event.target.value))} />
            <div><label>SPACE BETWEEN</label><strong>{gap} mm</strong></div>
            <input type="range" min="0" max="15" value={gap} onChange={(event) => setGap(Number(event.target.value))} />
          </div>
          <div className="settings-group toggles">
            <Toggle checked={border} onChange={setBorder} label="Frame border" />
            <Toggle checked={cuttingGuides} onChange={setCuttingGuides} label="Cutting guides" />
            <Toggle checked={showNumbers} onChange={setShowNumbers} label="Frame numbers" />
            <Toggle checked={showTimestamps} onChange={setShowTimestamps} label="Timestamps" />
          </div>
        </aside>
        <SheetPreview
          preview={rendering ? null : previews[activePage]}
          pageCount={pages}
          activePage={activePage}
          setActivePage={setActivePage}
        />
      </div>
      <div className="export-station">
        <div>
          <div className="eyebrow"><span>05</span> TAKE IT TO YOUR WORKTABLE</div>
          <h2>EXPORT FOR YOUR ARTWORK</h2>
        </div>
        <div className="export-buttons">
          <button className="export-primary" type="button" onClick={exportPdf} disabled={!!exporting}>
            {exporting === "pdf" ? <LoaderCircle className="spin" /> : <FileText />}
            <span><strong>PRINT-READY PDF</strong><small>A4 • {pages} {pages === 1 ? "page" : "pages"}</small></span>
            <Download />
          </button>
          <button type="button" onClick={exportZip} disabled={!!exporting}>
            {exporting === "zip" ? <LoaderCircle className="spin" /> : <FileArchive />}
            <span><strong>FRAMES AS ZIP</strong><small>{selectedFrames.length} lossless PNGs</small></span>
            <Download />
          </button>
          <button type="button" onClick={exportPng} disabled={!!exporting}>
            {exporting === "png" ? <LoaderCircle className="spin" /> : <FileImage />}
            <span><strong>CONTACT SHEET PNG</strong><small>First page • high quality</small></span>
            <Download />
          </button>
        </div>
        <div className="export-note"><LockKeyhole size={14} /> Everything is made here in your browser. No upload, no account, no trail.</div>
      </div>
    </section>
  );
}

function App() {
  const hiddenVideoRef = useRef(null);
  const objectUrlRef = useRef("");
  const imageObjectUrlsRef = useRef([]);
  const [stage, setStage] = useState("upload");
  const [sourceType, setSourceType] = useState("video");
  const [videoInfo, setVideoInfo] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [extractionMode, setExtractionMode] = useState("count");
  const [count, setCount] = useState(12);
  const [customCount, setCustomCount] = useState(30);
  const [fps, setFps] = useState(1);
  const [purpose, setPurpose] = useState("Tracing");
  const [frames, setFrames] = useState([]);
  const [mode, setMode] = useState("original");
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [requestedCount, setRequestedCount] = useState(12);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleFile = (file) => {
    setError("");
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm)$/i.test(file.name)) {
      setError("That file doesn’t look like a supported video. Try an MP4, MOV, or WebM.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("That video is over 500 MB. Trim or compress it, then try again.");
      return;
    }
    imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imageObjectUrlsRef.current = [];
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSourceType("video");
    const video = hiddenVideoRef.current;
    video.src = url;
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        setError("We couldn’t read this video. It may use an unsupported codec.");
        return;
      }
      video.currentTime = Math.min(0.1, video.duration / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(640, video.videoWidth);
      canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      setVideoInfo({
        file,
        url,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        poster: canvas.toDataURL("image/png"),
      });
      video.onseeked = null;
      setStage("setup");
      window.setTimeout(() => document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    video.onerror = () => setError("We couldn’t open this video. Try converting it to MP4 or WebM.");
  };

  const handleImages = (incomingFiles) => {
    setError("");
    const supported = Array.from(incomingFiles || []).filter((file) => (
      file.type.startsWith("image/")
      || /\.(png|jpe?g|webp|bmp)$/i.test(file.name)
    ));

    if (!supported.length) {
      setError("We couldn’t find any supported images. Try PNG, JPG, WebP, or BMP files.");
      return;
    }

    imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imageObjectUrlsRef.current = [];
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }

    const sorted = [...supported].sort((left, right) => left.name.localeCompare(
      right.name,
      undefined,
      { numeric: true, sensitivity: "base" },
    ));
    const folderName = sorted[0]?.webkitRelativePath?.split("/")[0];
    const sequenceName = folderName || `image-sequence-${sorted.length}`;
    const nextFrames = sorted.map((file, index) => {
      const src = URL.createObjectURL(file);
      imageObjectUrlsRef.current.push(src);
      return {
        id: `image-${file.name}-${file.lastModified}-${index}`,
        number: index + 1,
        time: index,
        label: file.name,
        src,
        kept: true,
        favorite: false,
      };
    });

    setSourceType("images");
    setFrames(nextFrames);
    setVideoInfo({
      file: {
        name: sequenceName,
        size: sorted.reduce((total, file) => total + file.size, 0),
      },
      poster: nextFrames[0].src,
      imageCount: nextFrames.length,
    });
    setStage("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExtract = async (settings) => {
    const frameCount = estimateFrameCount(hiddenVideoRef.current.duration, settings);
    if (frameCount > 240) {
      setError(`That setting would create ${frameCount} frames. Choose 240 frames or fewer.`);
      return;
    }
    setRequestedCount(frameCount);
    setProgress(0);
    setCurrentFrame(0);
    setError("");
    setStage("progress");
    try {
      const nextFrames = await extractFrames(hiddenVideoRef.current, settings, (value, current) => {
        setProgress(value);
        setCurrentFrame(current);
      });
      setFrames(nextFrames);
      setStage("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught.message || "Something went wrong while gathering frames.");
      setStage("setup");
    }
  };

  return (
    <div id="top">
      <Header />
      <main>
        {stage === "upload" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="kicker">FROM MOVING IMAGE TO PHYSICAL ART</div>
                <h1>TURN VIDEO INTO<br /><em>PRINTABLE</em> FRAMES.</h1>
                <p>Choose the moments. Shape the look. Print them for tracing, cutting, painting, collage, and everything your hands can make.</p>
                <a href="#studio" className="hero-link">START WITH A VIDEO <span>↓</span></a>
              </div>
              <div className="hero-collage" aria-hidden="true">
                <div className="collage-label">MOTION, MADE TANGIBLE.</div>
                <div className="abstract-frame frame-a"><span /></div>
                <div className="abstract-frame frame-b"><span /></div>
                <div className="abstract-frame frame-c"><span /></div>
                <div className="tape tape-a" />
                <div className="tape tape-b" />
                <div className="scribble">↗</div>
              </div>
            </section>
            <UploadStage
              onFile={handleFile}
              onImages={handleImages}
              dragActive={dragActive}
              setDragActive={setDragActive}
              error={error}
            />
            <section className="promise-strip" id="about">
              <div><span>01</span><strong>CHOOSE</strong><small>Find the moments<br />with something to say.</small></div>
              <div><span>02</span><strong>SHAPE</strong><small>Make them bold, quiet,<br />or ready to trace.</small></div>
              <div><span>03</span><strong>PRINT</strong><small>Build a clean sheet<br />for the worktable.</small></div>
            </section>
          </>
        )}
        {stage === "setup" && videoInfo && (
          <SetupStage
            videoInfo={videoInfo}
            extractionMode={extractionMode}
            setExtractionMode={setExtractionMode}
            count={count}
            setCount={setCount}
            customCount={customCount}
            setCustomCount={setCustomCount}
            fps={fps}
            setFps={setFps}
            purpose={purpose}
            setPurpose={setPurpose}
            onExtract={handleExtract}
            loading={false}
            error={error}
          />
        )}
        {stage === "progress" && <ProgressStage progress={progress} current={currentFrame} total={requestedCount} />}
        {stage === "review" && (
          <ReviewStage
            frames={frames}
            setFrames={setFrames}
            mode={mode}
            setMode={setMode}
            onRegenerate={() => setStage(sourceType === "video" ? "setup" : "upload")}
            regenerateLabel={sourceType === "video" ? "REGENERATE" : "NEW SEQUENCE"}
            onContinue={() => { setStage("builder"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          />
        )}
        {stage === "builder" && (
          <BuilderStage
            frames={frames}
            mode={mode}
            setMode={setMode}
            videoName={videoInfo?.file.name}
            onBack={() => setStage("review")}
          />
        )}
      </main>
      <footer>
        <div className="brand"><span className="brand-mark"><span /><span /><span /></span><span>FRAMEMIX</span></div>
        <p>VIDEO INTO PAPER. MADE FOR ARTISTS.</p>
        <span>PRIVATE BY DESIGN • 2026</span>
      </footer>
      <video ref={hiddenVideoRef} className="hidden-video" muted playsInline preload="metadata" />
    </div>
  );
}

export default App;
