interface ConfirmDialogProps {
  removedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ removedCount, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-dialog">
        <p className="confirm-dialog-title">Create cleaned copy?</p>
        <p className="confirm-dialog-text">
          {removedCount === 0
            ? "No fields are selected for removal, so the cleaned copy will be identical to the original."
            : `This will remove ${removedCount} metadata field${removedCount === 1 ? "" : "s"} and create a new, separate file. Your original file is never modified.`}{" "}
          The image's pixel data is never re-compressed, so there's no quality loss.
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="button button-compact" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="button button-primary button-compact" onClick={onConfirm}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
