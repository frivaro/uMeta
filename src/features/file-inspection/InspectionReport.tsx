import type { ReactNode } from "react";
import type { CleaningSelection, InspectionResult, MetadataCategory, MetadataField } from "../../core/metadata/types";
import { CATEGORY_EXPLANATIONS, GENERIC_RECOMMENDATION } from "../../core/privacy/explain";

interface InspectionReportProps {
  result: InspectionResult;
  selection: CleaningSelection;
  onToggleCategory: (category: MetadataCategory) => void;
  onRemoveFile: () => void;
  headerActions?: ReactNode;
}

const CATEGORY_ORDER: MetadataCategory[] = ["location", "device", "datetime", "author", "software", "thumbnail", "other"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldValue({ field }: { field: MetadataField }) {
  return (
    <div className="finding-value-row">
      <span className="finding-value-label">{field.label}:</span>
      <span className="finding-value">{field.value}</span>
    </div>
  );
}

function Finding({
  category,
  fields,
  selection,
  onToggleCategory,
}: {
  category: MetadataCategory;
  fields: MetadataField[];
  selection: CleaningSelection;
  onToggleCategory: (category: MetadataCategory) => void;
}) {
  const explanation = CATEGORY_EXPLANATIONS[category];

  return (
    <label className="finding">
      <input
        type="checkbox"
        className="finding-checkbox"
        checked={selection[category]}
        onChange={() => onToggleCategory(category)}
      />
      <div className="finding-body">
        <p className="finding-headline">{explanation.headline}</p>
        <p className="finding-detail">
          {explanation.detail} {GENERIC_RECOMMENDATION}
        </p>
        {fields.map((field) => (
          <FieldValue field={field} key={field.key} />
        ))}
      </div>
    </label>
  );
}

/**
 * Splits categories into two columns using the "largest first" greedy heuristic (sort by
 * size descending, then always place the next item in whichever column is currently
 * shorter). Sorting by size first matters - processing in a fixed category order and
 * assigning greedily can leave one column far overloaded once a large bucket (like
 * "other", which is always last and often huge) finally gets placed.
 */
function splitIntoColumns(
  categories: MetadataCategory[],
  fieldsByCategory: Map<MetadataCategory, MetadataField[]>,
): [MetadataCategory[], MetadataCategory[]] {
  const columns: [MetadataCategory[], MetadataCategory[]] = [[], []];
  const columnHeights = [0, 0];

  const bySizeDescending = [...categories].sort(
    (a, b) => fieldsByCategory.get(b)!.length - fieldsByCategory.get(a)!.length,
  );

  for (const category of bySizeDescending) {
    const shorterColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;
    columns[shorterColumn].push(category);
    columnHeights[shorterColumn] += fieldsByCategory.get(category)!.length + 1; // +1 for the headline/detail block
  }

  // Bin-packing by size scrambles reading order - restore each column's original priority
  // order (location, device, datetime, ...) now that the balanced split is decided.
  const orderIndex = new Map(categories.map((category, index) => [category, index]));
  columns[0].sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!);
  columns[1].sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!);

  return columns;
}

export default function InspectionReport({
  result,
  selection,
  onToggleCategory,
  onRemoveFile,
  headerActions,
}: InspectionReportProps) {
  const fieldsByCategory = new Map<MetadataCategory, MetadataField[]>();
  for (const field of result.fields) {
    const list = fieldsByCategory.get(field.category) ?? [];
    list.push(field);
    fieldsByCategory.set(field.category, list);
  }

  const presentCategories = CATEGORY_ORDER.filter((category) => fieldsByCategory.has(category));
  const [leftColumn, rightColumn] = splitIntoColumns(presentCategories, fieldsByCategory);

  return (
    <>
      <div className="file-summary" style={{ marginBottom: "1.25rem" }}>
        <div>
          <div className="file-summary-name">{result.fileName}</div>
          <div className="file-summary-meta">
            {formatBytes(result.fileSizeBytes)}
            {result.width && result.height ? ` · ${result.width}×${result.height}px` : ""}
          </div>
        </div>
        {result.hasAnyMetadata && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {headerActions}
            <button type="button" className="button button-danger button-compact" onClick={onRemoveFile}>
              Remove
            </button>
          </div>
        )}
      </div>

      {!result.hasAnyMetadata ? (
        <div>
          <p className="no-metadata-note" style={{ padding: 0, textAlign: "left", marginBottom: "0.75rem" }}>
            No embedded metadata was found in this file - there's nothing to clean.
          </p>
          <button type="button" className="button button-primary button-compact" onClick={onRemoveFile}>
            Check Another File
          </button>
        </div>
      ) : (
        <div className="finding-columns">
          <div className="finding-list">
            {leftColumn.map((category) => (
              <Finding
                key={category}
                category={category}
                fields={fieldsByCategory.get(category)!}
                selection={selection}
                onToggleCategory={onToggleCategory}
              />
            ))}
          </div>
          <div className="finding-list">
            {rightColumn.map((category) => (
              <Finding
                key={category}
                category={category}
                fields={fieldsByCategory.get(category)!}
                selection={selection}
                onToggleCategory={onToggleCategory}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
