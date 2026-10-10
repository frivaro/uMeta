import type { MetadataCategory } from "../jpeg/types";

export interface CategoryExplanation {
  headline: string;
  detail: string;
}

// Calm, factual language throughout - we describe what's present and let the person
// decide, rather than framing findings as alarms.
export const CATEGORY_EXPLANATIONS: Record<MetadataCategory, CategoryExplanation> = {
  location: {
    headline: "This image contains a capture location.",
    detail:
      "The exact GPS coordinates of where this photo was taken are embedded in the file. Anyone who receives the original can see precisely where it was taken.",
  },
  device: {
    headline: "This image identifies the device that took it.",
    detail:
      "The camera or phone make and model (and sometimes a serial number) are embedded, which can help identify which device - and potentially which person - captured the photo.",
  },
  datetime: {
    headline: "This image records when it was taken.",
    detail:
      "The exact date and time the photo was captured are embedded, which can reveal when you were at a particular place.",
  },
  author: {
    headline: "This image names an author or owner.",
    detail: "An author, artist, or copyright name is embedded, which can tie the image directly to a person.",
  },
  software: {
    headline: "This image names the software used to create or edit it.",
    detail: "The editing software and version used on this image is embedded. Usually low-risk on its own.",
  },
  thumbnail: {
    headline: "This image contains a hidden embedded thumbnail.",
    detail:
      "A smaller preview image is embedded separately from the visible photo. If the photo was cropped or edited, this hidden thumbnail can sometimes still show the original version.",
  },
  other: {
    headline: "This image contains additional technical metadata.",
    detail:
      "Camera settings like exposure, focal length, and color space are embedded. These are usually not personally identifying on their own.",
  },
};

export const GENERIC_RECOMMENDATION = "Consider removing this before sharing publicly.";
