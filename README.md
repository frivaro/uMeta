# uMeta

Vite + React + TypeScript app that inspects a file's hidden metadata (EXIF/GPS/author/software/etc.), lets you pick what to remove, and gives you back a cleaned copy - entirely in the browser. Nothing is ever uploaded: there's no backend, no analytics, and no network requests. Closing or refreshing the tab discards everything.

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

The workflows authenticate with the `AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret - get a fresh value from this project's own Static Web App resource in the Azure Portal (Overview → Manage deployment token) if it ever needs rotating. This must be a token from uMeta's own Static Web App resource, not `site`'s.

To deploy manually instead:

```bash
npm run build
swa deploy ./dist --deployment-token <YOUR_DEPLOYMENT_TOKEN> --env production
```

## How it works

File handling is byte-level and lossless: metadata is read and rewritten by walking each format's own structure directly (JPEG marker segments + embedded TIFF/EXIF, PNG chunks), without ever touching or re-encoding the actual image data.

```
src/
  app/              App shell, top-level state
  components/       Header, Footer
  features/
    file-inspection/  Dropzone + metadata findings report
    file-cleaning/     Removal selection, confirm dialog
    clean-result/       Download screen after cleaning
  core/
    files/           File-type registry, validation factory, shared byte/image helpers
    metadata/         Shared types: MetadataField, InspectionResult, CleaningResult, ...
    filetypes/
      jpeg/            JPEG/EXIF parsing, decoding, and rewriting
      png/             PNG chunk parsing and rewriting
    privacy/         Plain-language explanations for each metadata category
  styles/           Global CSS
```

Everything under `src/core/` is plain TypeScript with no React dependency or network calls - it takes bytes in and returns structured results, so it can be tested or reused independently of the UI.

### Adding support for a new file type

Each file type is fully self-contained under `src/core/filetypes/<type>/` - adding one should never require touching code outside that folder plus one registration line.

1. **Create the folder**: `src/core/filetypes/<type>/` (e.g. `webp/`, `heic/`, `pdf/`).
2. **Write the format logic**, split however makes sense for that format (mirror `jpeg/` or `png/` for a rough shape):
   - A signature check (magic bytes) to confirm a file really is this type.
   - `inspect(fileName, bytes): Promise<InspectionResult>` - parse the format's own metadata structures and emit `MetadataField[]` (from `src/core/metadata/types.ts`), each assigned one of the existing `MetadataCategory` values (`location`, `device`, `datetime`, `author`, `software`, `thumbnail`, `other`). Reuse categories rather than inventing new ones - `CATEGORY_EXPLANATIONS` in `src/core/privacy/explain.ts` is shared across all file types and already covers all seven.
   - `clean(bytes, selection, fields): CleaningResult` - rebuild the file losslessly, dropping only the metadata structures matching selected categories. Never touch the actual content/pixel/stream data, only the surrounding metadata containers.
   - Reuse shared helpers instead of duplicating: `src/core/files/bytes.ts` (`toArrayBuffer`, `concatUint8Arrays`) and `src/core/files/dimensions.ts` (`readImageDimensions`, for image formats). If your new type shares an underlying structure with an existing one (e.g. a TIFF-based format), import directly from that type's folder (see how `png/inspect.ts` reuses `jpeg/tiff.ts` and `jpeg/tiffToFields.ts` for PNG's `eXIf` chunk).
3. **Export a `fileType.ts`** implementing `SupportedFileType` (`src/core/files/types.ts`): `id`, `label`, `extensions`, `mimeType`, `maxBytes`, `matchesSignature`, `inspect`, `clean`. See `src/core/filetypes/jpeg/fileType.ts` or `png/fileType.ts` for examples.
4. **Register it**: add one line to the `SUPPORTED_FILE_TYPES` array in `src/core/files/registry.ts`. The file picker's `accept` filter, the "Supported files" hint, and validation error messages all update automatically from that array - no UI changes needed.
