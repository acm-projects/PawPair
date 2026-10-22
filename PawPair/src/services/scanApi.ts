import { signInAnonymously } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import * as FileSystem from "expo-file-system/legacy";

import { SERVER_URL } from "@/constants/config";
import { auth, db } from "@/firebase";
import type { PetType, ScanDoc } from "@/types/scan";


export async function uploadScan(videoUri: string, petType: PetType): Promise<string> {
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  const token = await user.getIdToken();

  let res: FileSystem.FileSystemUploadResult;
  try {
    res = await FileSystem.uploadAsync(`${SERVER_URL}/scan-video`, videoUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "video",
      mimeType: "video/mp4",
      parameters: { pet_type: petType },
      headers: { Authorization: `Bearer ${token}` },
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    });
  } catch (e: any) {
    throw new Error(`Couldn't reach ${SERVER_URL} (${e?.message ?? "unknown error"})`);
  }

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Scan failed (${res.status}): ${res.body}`);
  }

  const { scan_id } = JSON.parse(res.body);
  return scan_id;
}

export function listenToScan(scanId: string, onChange: (scan: ScanDoc | null) => void) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return onSnapshot(doc(db, "users", user.uid, "scans", scanId), (snap) =>
    onChange(snap.exists() ? (snap.data() as ScanDoc) : null)
  );
}