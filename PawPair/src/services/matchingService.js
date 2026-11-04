
import { weightFor } from "./quizWeights.js";

// Helper functions
const normalize = x =>
  String(x ?? "").trim().toLowerCase();

const isPresent = x =>
  x !== undefined && x !== null;

const between01 = n =>
  Math.max(0, Math.min(1, n));

const restrictedBreeds = text =>
  String(text ?? "")
    .split(",")
    .map(normalize)
    .filter(Boolean);

const speciesMatch = (userType, petType) => {
  if (userType === "Not sure yet") return true;

  if (userType.startsWith("Small animal")) {
    return [
      "small animal",
      "rabbit",
      "hamster",
      "guinea pig"
    ].includes(normalize(petType));
  }

  return normalize(userType) === normalize(petType);
};

// STEP 1: Check hard restrictions
function exclusionReason(pet, answers) {
  const m = pet.matching ?? {};

  if (
    answers.q1 &&
    !speciesMatch(answers.q1, pet.species)
  ) {
    return "Different species from requested pet type";
  }

  const restrictions = answers.q4;

  if (restrictions?.choice === "Size or weight limits") {
    const max = Number(restrictions.maxWeightLbs);

    if (!(max > 0)) {
      return "Owner restriction needs a weight limit";
    }

    if (!isPresent(m.weightLbs)) {
      return "Animal weight is unverified for housing limit";
    }

    if (Number(m.weightLbs) > max) {
      return "Exceeds home weight limit";
    }
  }

  if (
    restrictions?.choice === "Certain breeds or species"
  ) {
    const disallowed = restrictedBreeds(
      restrictions.disallowedText
    );

    if (
      disallowed.includes(normalize(pet.species)) ||
      disallowed.includes(normalize(pet.breed))
    ) {
      return "Breed or species prohibited by housing restrictions";
    }
  }

  // Children and other animals require verified compatibility
  const household = answers.q5 ?? [];
  const otherPets = answers.q6 ?? [];

  if (
    household.includes("Kids under 5") &&
    m.goodWithYoungKids !== true
  ) {
    return "Compatibility with children under 5 not confirmed";
  }

  if (
    household.includes("Kids 5 and older") &&
    m.goodWithOlderKids !== true
  ) {
    return "Compatibility with older children not confirmed";
  }

  if (
    otherPets.includes("Dog") &&
    m.goodWithDogs !== true
  ) {
    return "Compatibility with dogs not confirmed";
  }

  if (
    otherPets.includes("Cat") &&
    m.goodWithCats !== true
  ) {
    return "Compatibility with cats not confirmed";
  }

  if (
    otherPets.includes("Small animals or birds") &&
    m.goodWithSmallAnimals !== true
  ) {
    return "Compatibility with small animals or birds not confirmed";
  }

  if (
    answers.q18 === "No" &&
    m.specialNeeds !== false
  ) {
    return "Special-needs status has not been confirmed as acceptable";
  }

  return null;
}

// STEP 2: Calculate compatibility for individual questions
function compatibilityFor(q, answers, pet) {
  const m = pet.matching ?? {};

  const yes = (value, label) => ({
    compatibility: between01(value),
    label
  });

  switch (q) {
    case "q1":
      return answers.q1 === "Not sure yet"
        ? null
        : yes(
            speciesMatch(answers.q1, pet.species) ? 1 : 0,
            "Preferred species"
          );

    case "q2": {
      if (answers.q2?.mode === "none") return null;
      if (!pet.breed) return null;

      const prefs = [
        ...(answers.q2?.breeds ?? []),
        ...(answers.q2?.other ? [answers.q2.other] : [])
      ];

      return yes(
        prefs.some(b => normalize(b) === normalize(pet.breed))
          ? 1 : 0,
        "Preferred breed"
      );
    }

    case "q3":
      if (!Array.isArray(m.suitableHomes)) return null;

      return yes(
        m.suitableHomes.includes(answers.q3) ? 1 : 0.2,
        "Home environment"
      );

    case "q4":
      return (
        answers.q4?.choice === "Size or weight limits" ||
        answers.q4?.choice === "Certain breeds or species"
      )
        ? yes(1, "Housing restrictions")
        : null;

    case "q5": {
      const choices = answers.q5 ?? [];

      if (
        choices.includes("Kids under 5") ||
        choices.includes("Kids 5 and older")
      ) {
        return yes(1, "Children compatibility");
      }

      if (
        choices.includes("Partner or roommates") &&
        isPresent(m.comfortableWithRoommates)
      ) {
        return yes(
          m.comfortableWithRoommates ? 1 : 0.3,
          "Shared household"
        );
      }

      return null;
    }

    case "q6":
      return (answers.q6 ?? []).some(x => x !== "None")
        ? yes(1, "Other-pet compatibility")
        : null;

    // Allergies require individual verification
    case "q7":
      return null;

    case "q8": {
      if (!isPresent(m.maxAloneHours)) return null;

      const hours = {
        "Under 4": 3,
        "4–6": 6,
        "6–8": 8,
        "More than 8": 9
      }[answers.q8];

      return yes(
        m.maxAloneHours >= hours
          ? 1
          : Math.max(0.1, m.maxAloneHours / hours),
        "Time alone"
      );
    }

    case "q9": {
      if (!m.energyLevel) return null;

      const target = {
        "Mostly relaxing": 0,
        "Occasional walks": 1,
        "Regular exercise": 2,
        "Very active": 3
      }[answers.q9];

      const actual = {
        Low: 0,
        Moderate: 1,
        High: 2,
        "Very high": 3
      }[m.energyLevel];

      if (
        !isPresent(target) ||
        !isPresent(actual)
      ) {
        return null;
      }

      const diff = Math.abs(target - actual);

      return yes(
        diff === 0 ? 1 : diff === 1 ? 0.6 : 0.2,
        "Activity level"
      );
    }

    case "q10": {
      if (!isPresent(m.canTravelWithOwner)) return null;

      return yes(
        ["Monthly", "Frequently"].includes(answers.q10)
          ? (m.canTravelWithOwner ? 1 : 0.4)
          : 1,
        "Travel routines"
      );
    }

    case "q11":
      if (!Array.isArray(m.activityTags)) return null;

      return yes(
        m.activityTags.includes(answers.q11) ? 1 : 0.4,
        "Weekend activities"
      );

    case "q12":
      if (!isPresent(m.beginnerFriendly)) return null;

      return yes(
        ["Never", "As a kid"].includes(answers.q12)
          ? (m.beginnerFriendly ? 1 : 0.2)
          : 1,
        "Pet ownership experience"
      );

    case "q13": {
      if (!m.trainingNeeds) return null;

      const available = {
        "Very little": 0,
        "A few minutes a day": 1,
        Regularly: 2,
        "I'm excited to train": 3
      }[answers.q13];

      const need = {
        Low: 0,
        Moderate: 1,
        High: 2
      }[m.trainingNeeds];

      if (!isPresent(need)) return null;

      return yes(
        available >= need
          ? 1
          : available === need - 1 ? 0.5 : 0.1,
        "Training time"
      );
    }

    case "q14": {
      const max = {
        "Under $50": 50,
        "$50–100": 100,
        "$100–200": 200,
        "Over $200": Infinity
      }[answers.q14];

      if (!(Number(m.monthlyCostEstimate) > 0)) {
        return null;
      }

      return yes(
        m.monthlyCostEstimate <= max
          ? 1
          : max / m.monthlyCostEstimate,
        "Estimated care budget"
      );
    }

    case "q15":
      if (!Array.isArray(m.temperamentTags)) return null;

      return yes(
        m.temperamentTags.includes(answers.q15)
          ? 1 : 0.3,
        "Companion personality"
      );

    case "q16": {
      if (!m.groomingNeeds) return null;

      const grooming = {
        Low: 0,
        Moderate: 1,
        High: 2
      }[m.groomingNeeds];

      if (!isPresent(grooming)) return null;

      if (answers.q16 === "Doesn't bother me") {
        return yes(1, "Grooming tolerance");
      }

      return yes(
        answers.q16 === "Some is fine"
          ? (grooming <= 1 ? 1 : 0.3)
          : (grooming === 0 ? 1 : grooming === 1 ? 0.3 : 0.1),
        "Grooming tolerance"
      );
    }

    case "q17":
      if (
        answers.q17 === "No preference" ||
        !m.ageGroup
      ) {
        return null;
      }

      return yes(
        answers.q17 === m.ageGroup ? 1 : 0.2,
        "Preferred age group"
      );

    case "q18":
      if (!isPresent(m.specialNeeds)) return null;

      return yes(
        answers.q18 === "Yes"
          ? 1
          : answers.q18 === "Maybe"
            ? (m.specialNeeds ? 0.7 : 1)
            : 1,
        "Special-needs preference"
      );

    // Distance matching comes later
    case "q19":
    case "q20":
      return null;

    default:
      return null;
  }
}

// STEP 3: Define questions used in scoring
const scoreableQuestions = Array.from(
  { length: 18 },
  (_, i) => `q${i + 1}`
).filter(q => q !== "q7");

// STEP 4: Match and rank pets
export function matchPets(pets, answers, maxResults = 5) {
  const excluded = [];
  const matches = [];

  const relevantQuestions = scoreableQuestions.filter(
    q =>
      q !== "q2" ||
      (answers.q1 && answers.q1 !== "Not sure yet")
  );

  const totalPossibleWeight = relevantQuestions.reduce(
    (sum, q) => sum + weightFor(q, answers[q]),
    0
  );

  for (const pet of pets) {
    const reason = exclusionReason(pet, answers);

    if (reason) {
      excluded.push({
        id: pet.id,
        name: pet.name,
        reason
      });
      continue;
    }

    let weightedScore = 0;
    let evaluatedWeight = 0;

    const contributions = [];

    for (const q of relevantQuestions) {
      const weight = weightFor(q, answers[q]);

      if (!weight) continue;

      const match = compatibilityFor(
        q,
        answers,
        pet
      );

      if (!match) continue;

      const contribution =
        weight * match.compatibility;

      weightedScore += contribution;
      evaluatedWeight += weight;

      contributions.push({
        question: q,
        label: match.label,
        compatibility: match.compatibility,
        weight,
        contribution
      });
    }

    const score = evaluatedWeight
      ? Math.round(
          100 * weightedScore / evaluatedWeight
        )
      : null;

    const coverage = totalPossibleWeight
      ? Math.round(
          100 * evaluatedWeight / totalPossibleWeight
        )
      : 0;

    const reasons = contributions
      .filter(
        x =>
          x.compatibility >= 0.8 &&
          x.weight >= 0.5
      )
      .sort(
        (a, b) =>
          b.contribution - a.contribution
      )
      .slice(0, 3)
      .map(x => x.label);

    matches.push({
      pet,
      score,
      coverage,
      reasons
    });
  }

  // Highest scores first
  matches.sort(
    (a, b) =>
      (b.score ?? -1) - (a.score ?? -1) ||
      b.coverage - a.coverage
  );

  const notices = [
    "Scores are preliminary and based only on documented animal traits. Missing traits are excluded from scoring; review the evidence coverage.",
    "Distance is not yet verified: ZIP and travel radius are saved but not used until shelter location data/geocoding is integrated."
  ];

  if (
    answers.q7 === "Yes" ||
    answers.q7 === "Not sure"
  ) {
    notices.push(
      "Allergy compatibility is NOT established. There is no guaranteed hypoallergenic breed; consult a qualified clinician and meet the individual animal before adopting."
    );
  }

  if (answers.q4?.choice === "Not sure") {
    notices.push(
      "Confirm landlord/building restrictions before adoption."
    );
  }

  if (
    ["Monthly", "Frequently"].includes(answers.q10)
  ) {
    notices.push(
      "Arrange appropriate pet care for overnight travel."
    );
  }

  return {
    matches: matches.slice(0, maxResults),
    excluded,
    notices
  };
}
