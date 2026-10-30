import React, { createContext, useContext, useState } from "react";

export type SavedPet = {
  id: number;
  name: string;
  image: string;
  traits: { icon: any; text: string; size: number }[];
};

type MatchesContextType = {
  matchedPets: SavedPet[];
  starredPets: SavedPet[];
  addMatch: (pet: SavedPet) => void;
  addStar: (pet: SavedPet) => void;
};

const MatchesContext = createContext<MatchesContextType | undefined>(undefined);

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const [matchedPets, setMatchedPets] = useState<SavedPet[]>([]);
  const [starredPets, setStarredPets] = useState<SavedPet[]>([]);

  const addMatch = (pet: SavedPet) => {
    if (!matchedPets.some((p) => p.id === pet.id)) {
      setMatchedPets((prev) => [...prev, pet]);
    }
  };

  const addStar = (pet: SavedPet) => {
    if (!starredPets.some((p) => p.id === pet.id)) {
      setStarredPets((prev) => [...prev, pet]);
    }
  };

  return (
    <MatchesContext.Provider value={{ matchedPets, starredPets, addMatch, addStar }}>
      {children}
    </MatchesContext.Provider>
  );
}

export function useMatches() {
  const context = useContext(MatchesContext);
  if (!context) throw new Error("useMatches must be used within a MatchesProvider");
  return context;
}