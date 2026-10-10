# Umeta

Vite + React + TypeScript app that inspects a file's hidden metadata (EXIF/GPS/author/software/etc.), lets you pick what to remove, and gives you back a cleaned copy - entirely in the browser. Nothing is ever uploaded: there's no backend, no analytics, and no network requests. Closing or refreshing the tab discards everything.

Currently supports JPG/JPEG files.

This project is open-source, licensed under [PolyForm Noncommercial 1.0.0](LICENSE) - free to view, use, and modify for noncommercial purposes; commercial use requires a separate agreement with Frivaro.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs to `dist/`.

## Deploy (Azure Static Web Apps)

Deploys automatically via GitHub Actions (`.github/workflows/azure-static-web-app-prod.yml` on push to `main`, `azure-static-web-app-demo.yml` on push to `demo`). No manual steps needed.

The workflows authenticate with the `AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret - get a fresh value from this project's own Static Web App resource in the Azure Portal (Overview → Manage deployment token) if it ever needs rotating. This must be a token from Umeta's own Static Web App resource, not `site`'s.

To deploy manually instead:

```bash
npm run build
swa deploy ./dist --deployment-token <YOUR_DEPLOYMENT_TOKEN> --env production
```

## How it works

File handling is byte-level and lossless: metadata is read and rewritten by walking JPEG marker segments and the embedded TIFF/EXIF structure directly, without ever touching or re-encoding the compressed image data.

```
src/
  app/              App shell, top-level state
  components/       Header, Footer
  features/
    file-inspection/  Dropzone + metadata findings report
    file-cleaning/     Removal selection, confirm dialog
    clean-result/       Download screen after cleaning
  core/
    files/          File-type registry + validation factory
    jpeg/            JPEG/EXIF parsing, decoding, and rewriting (framework-free)
    privacy/         Plain-language explanations for each metadata category
  styles/           Global CSS
```

Everything under `src/core/` is plain TypeScript with no React dependency or network calls - it takes bytes in and returns structured results, so it can be tested or reused independently of the UI.

### Adding support for a new file type

Add a processor implementing `SupportedFileType` (`src/core/files/types.ts`) - extensions, a max size, and a signature check - and register it in `src/core/files/registry.ts`. See `src/core/jpeg/fileType.ts` for the JPEG example.
