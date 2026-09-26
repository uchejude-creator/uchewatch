import type { RoundKind } from "./types";
export const ACTIVITIES: {
  kind: RoundKind;
  title: string;
  emoji: string;
  description: string;
  prompt: string;
}[] = [
  {
    kind: "ready",
    title: "Ready, baby?",
    emoji: "🎬",
    description: "Both ready. One shared countdown.",
    prompt: "Ready to watch together?",
  },
  {
    kind: "compliment",
    title: "Secret compliments",
    emoji: "💌",
    description: "Two little secrets. One sweet reveal.",
    prompt: "Something I love about you…",
  },
  {
    kind: "prediction",
    title: "What happens next?",
    emoji: "🔮",
    description: "Pause the movie and make your predictions.",
    prompt: "I think the next thing that happens is…",
  },
  {
    kind: "rating",
    title: "Rate the moment",
    emoji: "🥹",
    description: "Choose privately, then see if you match.",
    prompt: "How did that moment make you feel?",
  },
  {
    kind: "rather",
    title: "Would you rather?",
    emoji: "🌙",
    description: "Big adventures or little comforts?",
    prompt:
      "Would you rather take a midnight road trip or stay in for a movie marathon?",
  },
  {
    kind: "thisthat",
    title: "This or that",
    emoji: "✨",
    description: "Discover your tiny differences.",
    prompt: "Sunrise picnic or sunset beach walk?",
  },
  {
    kind: "truths",
    title: "Two truths & a lie",
    emoji: "🤭",
    description: "Trade three statements, then guess on FaceTime.",
    prompt:
      "Write three numbered statements: two true, one a lie. Keep the lie secret until your person guesses.",
  },
  {
    kind: "favorite",
    title: "Favorite part?",
    emoji: "🍿",
    description: "Keep a little piece of tonight.",
    prompt: "My favorite part of tonight was…",
  },
  {
    kind: "goodnight",
    title: "Our goodnight",
    emoji: "🌌",
    description: "Exchange a last note and dim the lights.",
    prompt: "Before we say goodnight…",
  },
];
export const BINGO = [
  "Dramatic entrance",
  "Unexpected kiss",
  "Someone cries",
  "A plot twist",
  "Our favorite song",
  "A terrible decision",
  "We both laugh",
  "A cute animal",
  "A happy ending",
];
export const BINGO_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function hasBingo(marked: string[]) {
  return BINGO_LINES.some((line) =>
    line.every((n) => marked.includes(String(n))),
  );
}
export function countdownSeconds(startsAt: string, now: number) {
  return Math.max(0, Math.ceil((Date.parse(startsAt) - now) / 1000));
}
export function activeEvents<T extends { at: string }>(
  events: T[],
  now: number,
) {
  return events.filter((e) => {
    const age = now - Date.parse(e.at);
    return age >= -1000 && age < 6500;
  });
}
