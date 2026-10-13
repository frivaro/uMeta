import { useRef, useState, type DragEvent } from "react";
import { getAcceptAttribute, getSupportedTypesLabel } from "../../core/files/registry";

interface DropzoneProps {
  onFileSelected: (file: File) => void;
}

export default function Dropzone({ onFileSelected }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`dropzone${isDragActive ? " dropzone-active" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
    >
      <p className="dropzone-title">Drop a file here, or click to choose one</p>
      <p className="dropzone-hint">Supported files: {getSupportedTypesLabel()}</p>
      <input
        ref={inputRef}
        type="file"
        accept={getAcceptAttribute()}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}
