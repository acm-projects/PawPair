import { signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "@/firebase";
import type { PetType, ScanDoc } from "@/types/scan";

const DEFAULT_SCAN_NAME = "Environment Scan";


async function getUser() {
  return auth.currentUser ?? (await signInAnonymously(auth)).user;
}

export async function getNextScanName(): Promise<string> {
  try {
    const user = await getUser();
    const mine = query(collection(db, "scans"), where("uid", "==", user.uid));
    const count = (await getCountFromServer(mine)).data().count;
    return `${DEFAULT_SCAN_NAME} ${count + 1}`;
  } catch (e) {
    console.warn("Couldn't count previous scans", e);
    return DEFAULT_SCAN_NAME;
  }
}

export async function uploadScan(frames: string[], petType: PetType, name: string): Promise<string> {
  const user = await getUser();

  const scanRef = doc(collection(db, "scans"));
  const batch = writeBatch(db);

  batch.set(scanRef, {
    uid: user.uid,
    name: name.trim() || DEFAULT_SCAN_NAME,
    pet_type: petType,
    status: "uploaded",
    frame_count: frames.length,
    created_at: serverTimestamp(),
  });
  frames.forEach((jpeg, index) => {
    batch.set(doc(scanRef, "frames", String(index).padStart(3, "0")), { index, jpeg });
  });

  try {
    await batch.commit();
  } catch (e: any) {
    throw new Error(`Couldn't save the scan to Firestore (${e?.code ?? e?.message})`);
  }
  return scanRef.id;
}

export async function renameScan(scanId: string, name: string): Promise<void> {
  await updateDoc(doc(db, "scans", scanId), { name: name.trim() });
}

export function listenToScan(scanId: string, onChange: (scan: ScanDoc | null) => void) {
  return onSnapshot(
    doc(db, "scans", scanId),
    (snap) => onChange(snap.exists() ? (snap.data() as ScanDoc) : null),
    (error) => console.error("Couldn't read scan results:", error.code)
  );
}