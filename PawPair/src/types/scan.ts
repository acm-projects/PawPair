export type PetType = "dog" | "cat" | "small_animal" | "bird";

export type ScanStatus = "uploaded" | "processing" | "done" | "error";

export type Hazard = {
  id: number;
  label: string;
  title: string;
  severity: "high" | "medium" | "low";
  confidence: number;
  box: [number, number, number, number];
  reason: string;
  suggestion: string;
  rooms: string[];
  frame_index: number;
};

export type Snapshot = {
  index: number;
  jpeg: string;
  width: number;
  height: number;
};

export type ScanDoc = {
  uid: string;
  name?: string;
  status: ScanStatus;
  pet_type: PetType;
  frame_count: number;
  hazard_count?: number;
  frames_checked?: number;
  hazards?: Hazard[];
  snapshots?: Snapshot[];
  error?: string;
};