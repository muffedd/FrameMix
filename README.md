# FrameMix

Turn videos and image sequences into print-ready frame sheets for tracing, cutting, painting, collage, and motion studies.

FrameMix runs entirely in the browser. Videos and images stay on the user's device while frames and print sheets are generated.

## Features

- Extract a chosen total or capture at a true frames-per-second (FPS) rhythm from MP4, MOV, and WebM videos
- Import a complete image-sequence folder or select multiple images
- Keep, remove, favorite, and reorder frames
- Original, black-and-white, high-contrast, and tracing treatments
- A4 print-sheet builder with 2×3, 3×4, and 4×5 layouts
- Adjustable margins, spacing, image fit, borders, cutting guides, frame numbers, and timestamps
- Lossless PNG processing at the source image resolution
- Export print-ready PDF, PNG contact sheet, or a ZIP of processed PNG frames
- No account, server upload, or backend required

## Try the hosted version

After GitHub Pages is enabled, the site will be available at:

**https://muffedd.github.io/FrameMix/**

## Run locally

Install [Node.js](https://nodejs.org/) and Git, then copy and paste:

```bash
git clone https://github.com/muffedd/FrameMix.git
cd FrameMix
npm install
npm run dev
```

Open the local address printed in the terminal, normally `http://localhost:5173`.

## Production build

```bash
npm install
npm run build
npm run preview
```

The production files are created in `dist/`.

## Deploy with GitHub Pages

Deployment is already configured in `.github/workflows/deploy.yml`.

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Push to `main`, or run the workflow manually from the **Actions** tab.

Every push to `main` will build and deploy the latest version automatically.

## Privacy

FrameMix processes media locally with browser video and Canvas APIs. Source files are not uploaded to FrameMix or stored on a server.

## Technology

React, Vite, Canvas API, jsPDF, JSZip, and Lucide icons.

## License

MIT
