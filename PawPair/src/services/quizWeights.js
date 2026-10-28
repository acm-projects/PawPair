
export const WEIGHTS = {
  q1: {
    "Dog": 1.0,
    "Cat": 1.0,
    "Small animal (rabbit, hamster, etc.)": 1.0,
    "Bird": 1.0,
    "Not sure yet": 0.0
  },

  q2: {
    selected: 0.8,
    none: 0.0,
    other: 0.8
  },

  q3: {
    "Apartment": 0.9,
    "Townhouse": 0.7,
    "House with no yard": 0.8,
    "House with yard": 0.5
  },

  q4: {
    "No restrictions": 0.0,
    "Size or weight limits": 1.0,
    "Certain breeds or species": 1.0,
    "Not sure": 0.5
  },

  q5: {
    "Just me": 0.3,
    "Partner or roommates": 0.6,
    "Kids under 5": 1.0,
    "Kids 5 and older": 0.9
  },

  q6: {
    "None": 0.2,
    "Dog": 1.0,
    "Cat": 1.0,
    "Small animals or birds": 0.9
  },

  q7: {
    "Yes": 1.0,
    "No": 0.0,
    "Not sure": 0.6
  },

  q8: {
    "Under 4": 0.5,
    "4–6": 0.7,
    "6–8": 0.9,
    "More than 8": 1.0
  },

  q9: {
    "Mostly relaxing": 0.9,
    "Occasional walks": 0.8,
    "Regular exercise": 0.8,
    "Very active": 0.9
  },

  q10: {
    "Rarely": 0.3,
    "A few times a year": 0.5,
    "Monthly": 0.8,
    "Frequently": 1.0
  },

  q11: {
    "Cozy at home": 0.6,
    "Running errands": 0.4,
    "Outdoor adventures": 0.8,
    "Social events": 0.6
  },

  q12: {
    "Never": 0.9,
    "As a kid": 0.7,
    "Yes, as an adult": 0.4,
    "Yes, many": 0.3
  },

  q13: {
    "Very little": 1.0,
    "A few minutes a day": 0.9,
    "Regularly": 0.7,
    "I'm excited to train": 0.5
  },

  q14: {
    "Under $50": 1.0,
    "$50–100": 0.9,
    "$100–200": 0.7,
    "Over $200": 0.4
  },

  q15: {
    "Cuddly": 0.9,
    "Playful and energetic": 0.9,
    "Independent": 0.9,
    "Loyal and protective": 0.9
  },

  q16: {
    "Must be minimal": 1.0,
    "Some is fine": 0.6,
    "Doesn't bother me": 0.1
  },

  q17: {
    "Baby": 0.9,
    "Adult": 0.9,
    "Senior": 0.9,
    "No preference": 0.0
  },

  q18: {
    "Yes": 0.7,
    "Maybe": 0.6,
    "No": 1.0
  },

  q19: {
    "Use my current location": 1.0,
    "Enter a ZIP code": 1.0
  },

  q20: {
    "10 miles": 1.0,
    "25 miles": 0.9,
    "50 miles": 0.7,
    "100 miles": 0.5,
    "Doesn't matter": 0.0
  }
};

// Get the importance weight for an answer
export function weightFor(id, answer) {
  if (answer == null) return 0;

  if (id === "q2") {
    return WEIGHTS.q2[answer.mode] ?? 0;
  }

  if (id === "q4" || id === "q19") {
    return WEIGHTS[id][answer.choice] ?? 0;
  }

  if (Array.isArray(answer)) {
    return Math.max(
      0,
      ...answer.map(x => WEIGHTS[id]?.[x] ?? 0)
    );
  }

  return WEIGHTS[id]?.[answer] ?? 0;
}
