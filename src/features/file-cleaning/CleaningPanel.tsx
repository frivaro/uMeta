import { useMemo, useState } from "react";
import type { CleaningResult, CleaningSelection, InspectionResult } from "../../core/metadata/types";
import type { SupportedFileType } from "../../core/files/types";
import { toArrayBuffer } from "../../core/files/bytes";
import ConfirmDialog from "./ConfirmDialog";

interface CleaningPanelProps {
  originalBytes: Uint8Array;
  fileType: SupportedFileType;
  inspection: InspectionResult;
  selection: CleaningSelection;
  onCleaned: (result: CleaningResult, downloadUrl: string) => void;
}

export default function CleaningPanel({ originalBytes, fileType, inspection, selection, onCleaned }: CleaningPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const removedCount = useMemo(
    () => inspection.fields.filter((field) => selection[field.category]).length,
    [inspection.fields, selection],
  );

  const handleConfirm = () => {
    const result = fileType.clean(originalBytes, selection, inspection.fields);
    const blob = new Blob([toArrayBuffer(result.cleanedBytes)], { type: fileType.mimeType });
    const url = URL.createObjectURL(blob);
    setShowConfirm(false);
    onCleaned(result, url);
  };

  return (
    <>
      <button type="button" className="button button-primary button-compact" onClick={() => setShowConfirm(true)}>
        Create Cleaned Copy
      </button>

      {showConfirm && (
        <ConfirmDialog
          removedCount={removedCount}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
