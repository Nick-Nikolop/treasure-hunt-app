import type { ChapterId } from "./timeline"

export type RiddleOption = { id: "harbour" | "square" | "castle"; label: string; correct?: boolean }

export type ExplainerCopy = {
  eyebrow: string
  title: string
  answer: string
  hint: string
  region: string
  start: string
  play: string
  pause: string
  replay: string
  how: string
  youPlay: string
  chapters: Record<ChapterId, string>
  mission: {
    captions: [string, string]
    city: string
    team: [string, string, string, string]
    time: string
    date: string
    app: string
    now: string
    noteTitle: string
    noteBody: string
  }
  riddle: {
    step: string
    clue: string
    placeholder: string
    question: string
    pick: string
    options: RiddleOption[]
    wrongTag: string
    wrong: string
    right: string
    captions: { before: string; after: string }
  }
  route: { captions: [string, string]; start: string; target: string; church: string; castle: string }
  scan: { captions: { before: string; prompt: string; after: string }; button: string; noteTitle: string; noteBody: string }
  ending: { captions: [string, string] }
  end: { label: string }
  credits: { label: string; photo: string; map: string; engraving: string }
}

/** Sources of the real Kalamata imagery used in the video (licences require visible credit). */
export const EXPLAINER_CREDIT_LINKS = {
  photo: "https://commons.wikimedia.org/wiki/File:Very_Long_Exposure_Of_Kalamata_Port_(224478827).jpeg",
  map: "https://www.openstreetmap.org/copyright",
  engraving: "https://commons.wikimedia.org/wiki/File:Kalamata_1686.jpg",
} as const

export const EXPLAINER_COPY: Record<"el" | "en", ExplainerCopy> = {
  el: {
    eyebrow: "Δες το σε δράση",
    title: "Τι είναι αυτό;",
    answer: "Ένα κυνήγι θησαυρού στους δρόμους της Καλαμάτας, με το κινητό σου.",
    hint: "Πάτα play. Όταν το βίντεο σταματά, παίζεις εσύ.",
    region: "Διαδραστικό βίντεο: τι είναι το The Hunt",
    start: "Πάτα play",
    play: "Αναπαραγωγή",
    pause: "Παύση",
    replay: "Ξαναδές το",
    how: "Δες πώς παίζεται",
    youPlay: "Παίζεις εσύ",
    chapters: { mission: "Η αποστολή", riddle: "Ο γρίφος", route: "Ο δρόμος", scan: "Το QR", ending: "Το τέλος" },
    mission: {
      captions: ["Μαζεύεις την παρέα σου και βγαίνετε στους δρόμους της Καλαμάτας.", "Στο κινητό σας ξεκινά μια ιστορία."],
      city: "ΚΑΛΑΜΑΤΑ",
      team: ["Ν", "Ε", "Μ", "Κ"],
      time: "20:30",
      date: "Σάββατο βράδυ",
      app: "The Hunt",
      now: "τώρα",
      noteTitle: "Η αποστολή ξεκινά",
      noteBody: "Ο πρώτος γρίφος σάς περιμένει.",
    },
    riddle: {
      step: "Γρίφος 1 από 10",
      clue: "Ψάξτε την καρδιά της πόλης. Εκεί που συναντιούνται όλοι οι δρόμοι, ένας πέτρινος τοίχος κρύβει τον επόμενο κωδικό.",
      placeholder: "Η απάντησή σας…",
      question: "Εσύ τι λες; Πού πάτε;",
      pick: "Διάλεξε μία απάντηση.",
      options: [
        { id: "harbour", label: "Στο λιμάνι" },
        { id: "square", label: "Στην κεντρική πλατεία", correct: true },
        { id: "castle", label: "Στο κάστρο" },
      ],
      wrongTag: "Όχι εκεί",
      wrong: "Ξαναδιάβασε τον γρίφο: πού συναντιούνται όλοι οι δρόμοι;",
      right: "Σωστά. Πάμε στην πλατεία.",
      captions: {
        before: "Το κινητό σάς δίνει έναν γρίφο. Τον λύνετε μαζί.",
        after: "Κάθε λύση σάς στέλνει σε ένα πραγματικό σημείο της πόλης.",
      },
    },
    route: {
      captions: ["Περπατάτε μαζί στους δρόμους της Καλαμάτας…", "…μέχρι το σημείο που έδειξε ο γρίφος."],
      start: "Είστε εδώ",
      target: "Κεντρική Πλατεία",
      church: "Υπαπαντή",
      castle: "Κάστρο",
    },
    scan: {
      captions: {
        before: "Εκεί, κάπου κρυμμένο, υπάρχει ένα QR.",
        prompt: "Το βρήκατε. Πάτα το για να το σκανάρεις.",
        after: "Σωστό σημείο. Η ιστορία συνεχίζεται.",
      },
      button: "Σκάναρε",
      noteTitle: "Σωστό σημείο",
      noteBody: "Ξεκλείδωσε ο γρίφος 2 από 10.",
    },
    ending: {
      captions: ["Γρίφο με γρίφο, η ιστορία σάς φέρνει μέχρι το τέλος.", "Σαν escape room, αλλά σε ολόκληρη την πόλη."],
    },
    end: { label: "Με λίγα λόγια" },
    credits: {
      label: "Εικόνες (με προσαρμογή):",
      photo: "Λιμάνι Καλαμάτας, φωτ. Evangelos Gkikopoulos, CC BY 3.0",
      map: "Χάρτης © OpenStreetMap contributors, ODbL",
      engraving: "Καλαμάτα, χαρακτικό V. Coronelli, 1686, CC BY-SA 4.0",
    },
  },
  en: {
    eyebrow: "See it in action",
    title: "So, what is it?",
    answer: "A treasure hunt across the streets of Kalamata, on your phone.",
    hint: "Press play. When the video stops, it's your move.",
    region: "Interactive video: what The Hunt is",
    start: "Press play",
    play: "Play",
    pause: "Pause",
    replay: "Watch again",
    how: "See how it works",
    youPlay: "Your move",
    chapters: { mission: "The mission", riddle: "The puzzle", route: "The route", scan: "The QR code", ending: "The ending" },
    mission: {
      captions: ["You gather your friends and head out into the streets of Kalamata.", "A story begins on your phone."],
      city: "KALAMATA",
      team: ["N", "E", "M", "K"],
      time: "20:30",
      date: "Saturday night",
      app: "The Hunt",
      now: "now",
      noteTitle: "The mission begins",
      noteBody: "Your first puzzle is waiting.",
    },
    riddle: {
      step: "Puzzle 1 of 10",
      clue: "Look for the heart of the city. Where all the streets meet, a stone wall hides the next code.",
      placeholder: "Your answer…",
      question: "What do you think? Where do you go?",
      pick: "Pick an answer.",
      options: [
        { id: "harbour", label: "To the harbour" },
        { id: "square", label: "To the central square", correct: true },
        { id: "castle", label: "To the castle" },
      ],
      wrongTag: "Not there",
      wrong: "Read the puzzle again: where do all the streets meet?",
      right: "Correct. Off to the square.",
      captions: {
        before: "Your phone gives you a puzzle. You solve it together.",
        after: "Every answer sends you to a real place in the city.",
      },
    },
    route: {
      captions: ["You walk the streets of Kalamata together…", "…to the spot the puzzle pointed to."],
      start: "You are here",
      target: "Central Square",
      church: "Ypapanti",
      castle: "Castle",
    },
    scan: {
      captions: {
        before: "There, hidden somewhere, is a QR code.",
        prompt: "You found it. Tap it to scan.",
        after: "Right spot. The story continues.",
      },
      button: "Scan",
      noteTitle: "Right spot",
      noteBody: "Puzzle 2 of 10 unlocked.",
    },
    ending: {
      captions: ["Puzzle by puzzle, the story leads you to the end.", "Like an escape room, but the whole city is the room."],
    },
    end: { label: "In short" },
    credits: {
      label: "Images (adapted):",
      photo: "Kalamata port, photo by Evangelos Gkikopoulos, CC BY 3.0",
      map: "Map © OpenStreetMap contributors, ODbL",
      engraving: "Kalamata, engraving by V. Coronelli, 1686, CC BY-SA 4.0",
    },
  },
}
