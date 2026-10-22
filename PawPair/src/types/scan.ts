export type PetType = "dog" | "cat" | "small_animal" | "bird";

export type ScanStatus = "processing" | "done" | "error";

export type Hazard = {
  id: number;
  label: string;
  title: string;
  severity: "high" | "medium" | "low";
  confidence: number;
  box: [number, number, number, number];
  reason: string;
  suggestion: string;
  frame_width: number;
  frame_height: number;
  frame_jpeg: string;
};

export type ScanDoc = {
  status: ScanStatus;
  pet_type: PetType;
  hazard_count?: number;
  frames_checked?: number;
  hazards?: Hazard[];
  error?: string;
};