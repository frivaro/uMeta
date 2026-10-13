import type { CleaningResult } from "../../core/metadata/types";

interface ResultPanelProps {
  fileName: string;
  cleanedDownloadUrl: string;
  cleaningResult: CleaningResult;
  onStartOver: () => void;
}

function cleanedFileName(originalName: string): string {
  const dotIndex = originalName.lastIndexOf(".");
  const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const extension = dotIndex > 0 ? originalName.slice(dotIndex) : ".jpg";
  return `${base}-cleaned${extension}`;
}

export default function ResultPanel({ fileName, cleanedDownloadUrl, cleaningResult, onStartOver }: ResultPanelProps) {
  return (
    <div className="card">
      <p className="section-title">Done</p>
      <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "#8b8f98", lineHeight: 1.6 }}>
        Removed {cleaningResult.removedFields.length} field{cleaningResult.removedFields.length === 1 ? "" : "s"},
        kept {cleaningResult.keptFields.length}. The cleaned copy is a separate file - your original is untouched.
      </p>

      <div className="result-actions">
        <a className="button button-primary" href={cleanedDownloadUrl} download={cleanedFileName(fileName)}>
          Download
        </a>
        <button type="button" className="button" onClick={onStartOver}>
          Start Over
        </button>
      </div>
    </div>
  );
}
