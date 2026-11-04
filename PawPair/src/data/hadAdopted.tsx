import { statusFor, useStatuses } from "./petStatus";
import { usePetLists } from "../store/petLists";

export const ADOPTED_STAGE = 3;

export function useHadAdopted() {
  const statuses = useStatuses();
  const { matches: matchIds } = usePetLists();

  return matchIds.some((id) => statusFor(statuses, id).stage >= ADOPTED_STAGE);
}

export default useHadAdopted;