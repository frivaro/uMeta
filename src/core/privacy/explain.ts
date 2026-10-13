import type { MetadataCategory } from "../metadata/types";

export interface CategoryExplanation {
  headline: string;
  detail: string;
}

// Calm, factual language throughout - we describe what's present and let the person
// decide, rather than framing findings as alarms.
export const CATEGORY_EXPLANATIONS: Record<MetadataCategory, CategoryExplanation> = {
  location: {
    headline: "This file contains a capture location.",
    detail:
      "The exact GPS coordinates of where this file was created are embedded in it. Anyone who receives the original can see precisely where it was taken.",
  },
  device: {
    headline: "This file identifies the device that created it.",
    detail:
      "The device make and model (and sometimes a serial number) are embedded, which can help identify which device - and potentially which person - created the file.",
  },
  datetime: {
    headline: "This file records when it was created.",
    detail:
      "The exact date and time this file was created are embedded, which can reveal when you were at a particular place.",
  },
  author: {
    headline: "This file names an author or owner.",
    detail: "An author, artist, or copyright name is embedded, which can tie the file directly to a person.",
  },
  software: {
    headline: "This file names the software used to create or edit it.",
    detail: "The editing software and version used on this file is embedded. Usually low-risk on its own.",
  },
  thumbnail: {
    headline: "This file contains a hidden embedded thumbnail.",
    detail:
      "A smaller preview image is embedded separately from the visible content. If the file was cropped or edited, this hidden thumbnail can sometimes still show the original version.",
  },
  other: {
    headline: "This file contains additional embedded metadata.",
    detail:
      "Technical or descriptive details that don't fit the other categories are embedded. These are usually not personally identifying on their own.",
  },
};

export const GENERIC_RECOMMENDATION = "Consider removing this before sharing publicly.";
