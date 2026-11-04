
export const QUIZ_QUESTIONS = [
  {
    id: "q1",
    title: "What kind of pet are you looking for?",
    options: [
      "Dog", "Cat",
      "Small animal (rabbit, hamster, etc.)",
      "Bird", "Not sure yet"
    ]
  },
  {
    id: "q2",
    title: "Any breeds you prefer?",
    type: "breeds",
    note: "Choose breeds from available listings, enter other breeds, or select No preference. Shown only if you chose a pet type."
  },
  {
    id: "q3",
    title: "What type of home do you live in?",
    options: [
      "Apartment", "Townhouse",
      "House with no yard", "House with yard"
    ]
  },
  {
    id: "q4",
    title: "Does your building or landlord have pet restrictions?",
    type: "restrictions",
    options: [
      "No restrictions", "Size or weight limits",
      "Certain breeds or species", "Not sure"
    ]
  },
  {
    id: "q5",
    title: "Who else lives with you?",
    type: "multi",
    exclusive: "Just me",
    options: [
      "Just me", "Partner or roommates",
      "Kids under 5", "Kids 5 and older"
    ]
  },
  {
    id: "q6",
    title: "Do you have any other pets?",
    type: "multi",
    exclusive: "None",
    options: [
      "None", "Dog", "Cat",
      "Small animals or birds"
    ]
  },
  {
    id: "q7",
    title: "Does anyone in your home have pet allergies?",
    options: ["Yes", "No", "Not sure"]
  },
  {
    id: "q8",
    title: "How many hours a day would your pet be alone?",
    options: [
      "Under 4", "4–6", "6–8", "More than 8"
    ]
  },
  {
    id: "q9",
    title: "How active are you in a typical week?",
    options: [
      "Mostly relaxing", "Occasional walks",
      "Regular exercise", "Very active"
    ]
  },
  {
    id: "q10",
    title: "How often do you travel or stay away overnight?",
    options: [
      "Rarely", "A few times a year",
      "Monthly", "Frequently"
    ]
  },
  {
    id: "q11",
    title: "What does a typical weekend look like?",
    options: [
      "Cozy at home", "Running errands",
      "Outdoor adventures", "Social events"
    ]
  },
  {
    id: "q12",
    title: "Have you owned a pet before?",
    options: [
      "Never", "As a kid",
      "Yes, as an adult", "Yes, many"
    ]
  },
  {
    id: "q13",
    title: "How much time can you spend on training?",
    options: [
      "Very little", "A few minutes a day",
      "Regularly", "I'm excited to train"
    ]
  },
  {
    id: "q14",
    title: "What's your monthly budget for pet care?",
    options: [
      "Under $50", "$50–100",
      "$100–200", "Over $200"
    ]
  },
  {
    id: "q15",
    title: "What kind of companion are you looking for?",
    options: [
      "Cuddly", "Playful and energetic",
      "Independent", "Loyal and protective"
    ]
  },
  {
    id: "q16",
    title: "How do you feel about shedding and grooming?",
    options: [
      "Must be minimal", "Some is fine",
      "Doesn't bother me"
    ]
  },
  {
    id: "q17",
    title: "What age pet would you prefer?",
    options: [
      "Baby", "Adult", "Senior",
      "No preference"
    ]
  },
  {
    id: "q18",
    title: "Would you consider a pet with special needs or a medical condition?",
    options: ["Yes", "Maybe", "No"]
  },
  {
    id: "q19",
    title: "Where should we look for pets near you?",
    type: "location",
    options: [
      "Use my current location",
      "Enter a ZIP code"
    ],
    note: "We only save your ZIP code; never store precise coordinates."
  },
  {
    id: "q20",
    title: "How far would you travel to meet a pet?",
    options: [
      "10 miles", "25 miles", "50 miles",
      "100 miles", "Doesn't matter"
    ]
  }
];

export const isApplicable = (question, answers) =>
  question.id !== "q2" ||
  (!!answers.q1 && answers.q1 !== "Not sure yet");

export const getVisibleQuestions = (answers) =>
  QUIZ_QUESTIONS.filter(question =>
    isApplicable(question, answers)
  );
