import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useRouter } from "expo-router";

const pawWatermark = require("../../../assets/images/paw-watermark.png");

const ROUTES = {
  swipe: "/swiping",
} as const;

const LEAVE_MS = 350;

let enterPlayed = false;

function loadFont() {
  if (typeof document === "undefined") return;
  if (document.getElementById("open-sans-font")) return;
  const link = document.createElement("link");
  link.id = "open-sans-font";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap";
  document.head.appendChild(link);
}

type Question = {
  questionNum: number;
  question: string;
  options: string[];
};

type QuizProps = {
  onFinish?: (answers: string[]) => void;
};

const QUESTIONS: Question[] = [
  {
    questionNum: 1,
    question: "What type of home do you live in?",
    options: ["Townhouse", "Apartment", "House with no yard", "House with yard"],
  },
  {
    questionNum: 2,
    question: "How active is your lifestyle?",
    options: ["Not active", "Fairly active", "Active", "Very active"],
  },
  {
    questionNum: 3,
    question: "How much time are you home each day?",
    options: ["Less than 3 hours", "3 to 7 hours", "7 to 12 hours", "Almost always"],
  },
  {
    questionNum: 4,
    question: "Do you have any other pets at home?",
    options: ["No pets", "Cats", "Dogs", "Other animals"],
  },
];

const PINK = "#F5C0B3";
const CORAL = "#E98F78";
const CREAM = "#F6F3F1";
const FONT = "'Open Sans', system-ui, sans-serif";

function Paw({ style }: { style?: CSSProperties }) {
  return (
    <img
      src={pawWatermark}
      alt=""
      aria-hidden="true"
      style={{ position: "absolute", width: 64, height: "auto", pointerEvents: "none", ...style }}
    />
  );
}

export default function Quiz({ onFinish = () => {} }: QuizProps) {
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [playEnter] = useState(() => !enterPlayed);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadFont();
    enterPlayed = true;
    return () => clearTimeout(timer.current);
  }, []);

  const current = QUESTIONS[index];
  const selected = answers[index];
  const isLast = index === QUESTIONS.length - 1;

  // Play the exit animation, then navigate once it finishes.
  const goToSwipe = () => {
    if (leaving) return; // prevent double taps
    enterPlayed = false; // let the fade-in play again next time the quiz opens
    setLeaving(true);
    timer.current = setTimeout(() => router.replace(ROUTES.swipe), LEAVE_MS);
  };

  const choose = (option: string) =>
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = option;
      return next;
    });

  const next = () => {
    if (isLast) {
      onFinish(answers);
      goToSwipe();
      return;
    }
    setIndex((i) => i + 1);
  };

  // Only slide questions in after the first one (the screen fade-in covers question 1).
  const slideClass = index > 0 ? "q-in" : undefined;

  return (
    <div style={styles.page}>
      <style>{`
        .quiz-btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

        /* screen enter / exit */
        .phone-enter { animation: phoneIn ${LEAVE_MS}ms cubic-bezier(.2,.8,.2,1) both; }
        .phone-leave { animation: phoneOut ${LEAVE_MS}ms cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes phoneIn  { from { opacity: 0; transform: translateY(16px); } }
        @keyframes phoneOut { to   { opacity: 0; transform: translateY(-24px) scale(.97); } }

        /* question-to-question slide */
        .q-in { animation: qIn 260ms cubic-bezier(.2,.8,.2,1) both; }
        @keyframes qIn { from { opacity: 0; transform: translateX(24px); } }

        @media (prefers-reduced-motion: reduce) {
          .phone-enter, .phone-leave, .q-in { animation-duration: 1ms; }
        }
      `}</style>

      <div
        className={leaving ? "phone-leave" : playEnter ? "phone-enter" : undefined}
        style={{ ...styles.phone, pointerEvents: leaving ? "none" : "auto" }}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.pill}>Question {current.questionNum}</div>
          <h1 key={index} className={slideClass} style={styles.title}>
            {current.question}
          </h1>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <Paw style={{ top: "3%", right: "14%" }} />
          <Paw style={{ top: "14%", right: -14, transform: "rotate(25deg)" }} />
          <Paw style={{ top: "38%", left: "34%", transform: "rotate(-10deg)" }} />
          <Paw style={{ bottom: "26%", left: -6, transform: "rotate(-20deg)" }} />
          <Paw style={{ bottom: "14%", right: "6%", transform: "rotate(15deg)" }} />

          {/* Options (scrolls only if the window is very short) */}
          <div style={styles.content}>
            <div key={index} className={slideClass} style={styles.options}>
              {current.options.map((option) => {
                const active = selected === option;
                return (
                  <button
                    key={option}
                    className="quiz-btn"
                    onClick={() => choose(option)}
                    aria-pressed={active}
                    style={{
                      ...styles.option,
                      background: active ? CORAL : PINK,
                      boxShadow: active ? "inset 0 0 0 2px #ffffff88" : "0 2px 4px #00000012",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next button (always visible) */}
          <div style={styles.nextWrap}>
            <button
              className="quiz-btn"
              onClick={next}
              disabled={!selected}
              style={{
                ...styles.next,
                opacity: selected ? 1 : 0.6,
                cursor: selected ? "pointer" : "default",
              }}
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <button className="quiz-btn" onClick={goToSwipe} style={styles.skip}>
          Skip Quiz
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "flex",
    justifyContent: "center",
    background: "#f2f2f2",
    fontFamily: FONT,
    overflow: "hidden",
  },
  phone: {
    position: "relative",
    width: "100%",
    maxWidth: 390,
    alignSelf: "stretch",
    maxHeight: 844,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background: CORAL,
    boxSizing: "border-box",
  },
  header: {
    flex: "0 0 auto",
    textAlign: "center",
    padding: "18px 24px 40px",
    background: `linear-gradient(180deg, ${PINK} 0%, ${CORAL} 100%)`,
  },
  pill: {
    display: "inline-block",
    background: CREAM,
    color: "#222",
    fontSize: 18,
    padding: "8px 40px",
    borderRadius: 999,
  },
  title: {
    margin: "14px auto 0",
    maxWidth: "11.5em",
    color: "#fff",
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.3,
  },
  card: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    background: CREAM,
    borderRadius: "30px 30px 0 0",
    overflow: "hidden",
    paddingBottom: 44,
    display: "flex",
    flexDirection: "column",
  },
  content: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "24px 40px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  options: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  option: {
    flex: "1 1 0",
    minHeight: 30,
    maxHeight: 38,
    border: "none",
    borderRadius: 14,
    fontSize: 14,
    fontFamily: FONT,
    color: "#222",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  nextWrap: {
    position: "relative",
    zIndex: 1,
    flex: "0 0 auto",
    padding: "8px 0 12px",
    display: "flex",
    justifyContent: "center",
  },
  next: {
    border: "none",
    background: PINK,
    color: "#222",
    fontFamily: FONT,
    fontSize: 14,
    padding: "8px 32px",
    borderRadius: 12,
    boxShadow: "0 2px 4px #00000012",
  },
  skip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    zIndex: 2,
    border: "none",
    borderRadius: "16px 16px 0 0",
    background: `linear-gradient(90deg, ${PINK}, ${CORAL})`,
    color: "#fff",
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 600,
    textAlign: "right",
    padding: "0 20px",
    cursor: "pointer",
  },
};