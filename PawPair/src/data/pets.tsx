export type PetTrait = {
  icon: number;     
  listIcon: number;  
  text: string;
  size: number;      
};

export type Pet = {
  id: number;
  name: string;
  age: string;
  image: string;
  about: string;
  traits: PetTrait[];
  loves: string[];
  email: string;
};

const childrenIcon = require("../../assets/images/children-icon.png");
const outdoorsIcon = require("../../assets/images/outdoors-icon.png");
const babyIcon = require("../../assets/images/baby.png");
const tentIcon = require("../../assets/images/tent.png");

export const PETS_DATA: Pet[] = [
  {
    id: 1,
    name: "Buddy",
    age: "2.5 years",
    image: "https://i.pinimg.com/736x/65/cb/b0/65cbb0e43c50b5486da05e02e5c53172.jpg",
    about:
      "I am a golden retriever who has a golden heart! I love to run, play, and eat tons of yummy, healthy meals! I love hugs & am very good with children and the great outdoors!",
    traits: [
      { icon: childrenIcon, listIcon: babyIcon, text: "Great with kids", size: 14 },
      { icon: outdoorsIcon, listIcon: tentIcon, text: "Loves the outdoors", size: 24 },
    ],
    loves: ["Peanut Butter", "Hugs & cuddles"],
    email: "shelter@gmail.com",
  },
  {
    id: 2,
    name: "Luna",
    age: "1.5 years",
    image: "https://i.pinimg.com/736x/43/b8/f7/43b8f757efbe31ed48e6875165f3ee5d.jpg",
    about:
      "I am the kindest cat ever who loves to play, eat, and sleep! I also suprisingly love to go on walks and take baths!",
    traits: [
      { icon: childrenIcon, listIcon: babyIcon, text: "Gentle nature", size: 14 },
      { icon: outdoorsIcon, listIcon: tentIcon, text: "Indoor explorer", size: 24 },
    ],
    loves: ["Toys", "Sleeping"],
    email: "shelter@gmail.com",
  },
];

export const getPet = (id: number) => PETS_DATA.find((p) => p.id === id);