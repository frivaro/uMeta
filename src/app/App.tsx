import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Dropzone from "../features/file-inspection/Dropzone";
import InspectionReport from "../features/file-inspection/InspectionReport";
import CleaningPanel from "../features/file-cleaning/CleaningPanel";
import ResultPanel from "../features/clean-result/ResultPanel";
import { validateFile } from "../core/files/validate";
import type { SupportedFileType } from "../core/files/types";
import type { CleaningResult, CleaningSelection, InspectionResult, MetadataCategory } from "../core/metadata/types";

const EMPTY_SELECTION: CleaningSelection = {
  location: false,
  device: false,
  datetime: false,
  author: false,
  software: false,
  thumbnail: false,
  other: false,
};

const FULL_SELECTION: CleaningSelection = {
  location: true,
  device: true,
  datetime: true,
  author: true,
  software: true,
  thumbnail: true,
  other: true,
};

export default function App() {
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [fileType, setFileType] = useState<SupportedFileType | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<InspectionResult | null>(null);
  const [selection, setSelection] = useState<CleaningSelection>(EMPTY_SELECTION);
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [cleanedDownloadUrl, setCleanedDownloadUrl] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setValidationError(null);
    setInspection(null);
    setCleaningResult(null);
    setCleanedDownloadUrl(null);
    setSelection(FULL_SELECTION);

    const buffer = new Uint8Array(await file.arrayBuffer());
    const validation = validateFile(file.name, buffer);

    if (!validation.valid || !validation.fileType) {
      setValidationError(validation.reason ?? "This file couldn't be read.");
      return;
    }

    setOriginalBytes(buffer);
    setFileType(validation.fileType);
    setFileName(file.name);

    const result = await validation.fileType.inspect(file.name, buffer);
    setInspection(result);
  };

  const handleToggleCategory = (category: MetadataCategory) => {
    setSelection((current) => ({ ...current, [category]: !current[category] }));
  };

  const handleCleaned = (result: CleaningResult, downloadUrl: string) => {
    setCleaningResult(result);
    setCleanedDownloadUrl(downloadUrl);
  };

  const handleStartOver = () => {
    if (cleanedDownloadUrl) URL.revokeObjectURL(cleanedDownloadUrl);
    setOriginalBytes(null);
    setFileType(null);
    setFileName("");
    setValidationError(null);
    setInspection(null);
    setSelection(EMPTY_SELECTION);
    setCleaningResult(null);
    setCleanedDownloadUrl(null);
  };

  return (
    <>
      <Header />
      <main
        className={`app-main${!inspection || !inspection.hasAnyMetadata || !!cleaningResult ? " app-main-centered" : ""}`}
      >
        <div className="hero">
          <h1 className="hero-title">See what your file reveals.</h1>
          <p className="hero-subtitle">
            Inspect a file's hidden metadata, choose what to remove, and download a cleaned copy - all inside your
            browser. Open-source by Frivaro.
          </p>
        </div>

        {!inspection && <Dropzone onFileSelected={handleFileSelected} />}

        {validationError && <div className="error-banner">{validationError}</div>}

        {inspection && !cleaningResult && (
          <div className="card">
            <InspectionReport
              result={inspection}
              selection={selection}
              onToggleCategory={handleToggleCategory}
              onRemoveFile={handleStartOver}
              headerActions={
                originalBytes && fileType && inspection.hasAnyMetadata ? (
                  <CleaningPanel
                    originalBytes={originalBytes}
                    fileType={fileType}
                    inspection={inspection}
                    selection={selection}
                    onCleaned={handleCleaned}
                  />
                ) : undefined
              }
            />
          </div>
        )}

        {cleaningResult && cleanedDownloadUrl && (
          <ResultPanel
            fileName={fileName}
            cleanedDownloadUrl={cleanedDownloadUrl}
            cleaningResult={cleaningResult}
            onStartOver={handleStartOver}
          />
        )}

        {!inspection && (
          <div className="info-note">
            <strong>How this works:</strong> your file is read directly in your browser's memory using the File API.
            It is never sent over the network - Frivaro makes no analytics or tracking requests, and has no
            backend to upload to. Closing or refreshing this tab discards everything.
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
