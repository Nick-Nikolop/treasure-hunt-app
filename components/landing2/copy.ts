export const REEL_COPY = {
  el: {
    nav: { label: "Κύρια πλοήγηση", home: "Αρχική", hunts: "Αποστολές", how: "Πώς παίζεται", faq: "Ερωτήσεις", cta: "Ειδοποίησέ με" },
    intro: { skip: "Παράλειψη" },
    billboard: {
      kind: "Παιχνίδι μυστηρίου",
      scroll: "ΚΑΝΕ SCROLL",
      badge: "Νέα αποστολή σύντομα",
      meta: ["2026", "Ομαδικό", "Με το κινητό"],
      rating: "Καλαμάτα",
      more: "Πληροφορίες",
      start: "Παίξε το τρέιλερ",
      pause: "Παύση τρέιλερ",
      resume: "Συνέχεια τρέιλερ",
      replay: "Ξανά το τρέιλερ",
      mute: "Σίγαση ήχου",
      unmute: "Ενεργοποίηση ήχου",
    },
    rows: { hunts: "Οι αποστολές", top: "Top 3 · Το ταξίδι του Πυθέα", prev: "Προηγούμενα", next: "Επόμενα" },
    hunts: {
      notify: "Ειδοποίησέ με",
      standings: "Δες την κατάταξη",
      details: "Περισσότερες πληροφορίες",
      tags: { "#2": ["Νέα ιστορία", "Καλαμάτα", "Ομαδικό"], "#1": ["10 σταθμοί", "Ένα ημερολόγιο", "Ένας θησαυρός"] },
    },
    board: {
      label: "Ο πίνακας των υποθέσεων",
      hint: "Διάλεξε έναν φάκελο για να τον ανοίξεις",
      case: "Υπόθεση",
      open: "Άνοιξε τον φάκελο",
      close: "Κλείσε τον φάκελο",
      evidence: "Στοιχεία",
      more: "Όλες οι πληροφορίες",
      unknown: "Τι κρύβει;",
      prize: "Έπαθλο",
    },
    top: {
      title: "500 € για τις τρεις πρώτες ομάδες.",
      body: "Η πρώτη αποστολή ήταν δωρεάν για όλους. Οι τρεις ομάδες που έφτασαν πρώτες στο τέλος μοιράστηκαν το χρηματικό έπαθλο.",
      stations: "Σταθμοί",
      share: "του επάθλου",
      podium: "Οι νικητές",
    },
    episodes: { step: "Βήμα", count: "4 βήματα" },
    modal: {
      close: "Κλείσιμο",
      genres: "Είδος",
      genresValue: "Μυστήριο, γρίφοι, εξερεύνηση",
      where: "Πού",
      whereValue: "Στους δρόμους της Καλαμάτας",
      need: "Τι χρειάζεσαι",
    },
    faq: { title: "Συχνές ερωτήσεις" },
    signup: {
      line: "Θέλεις να μάθεις πρώτος την επόμενη αποστολή; Γράψε μας και θα σε ειδοποιήσουμε.",
      cta: "Ειδοποίησέ με",
      subject: "Ειδοποίησέ με για το επόμενο Hunt",
    },
    footer: { questions: "Ερωτήσεις; Γράψε μας στο", language: "Γλώσσα", current: "Ελληνικά", standings: "Κατάταξη Pythea" },
  },
  en: {
    nav: { label: "Main navigation", home: "Home", hunts: "Hunts", how: "How it works", faq: "FAQ", cta: "Notify me" },
    intro: { skip: "Skip" },
    billboard: {
      kind: "Mystery game",
      scroll: "Scroll",
      badge: "New Hunt coming soon",
      meta: ["2026", "Team game", "On your phone"],
      rating: "Kalamata",
      more: "More info",
      start: "Play the trailer",
      pause: "Pause trailer",
      resume: "Resume trailer",
      replay: "Replay trailer",
      mute: "Mute",
      unmute: "Unmute",
    },
    rows: { hunts: "The Hunts", top: "Top 3 · The Journey of Pytheas", prev: "Previous", next: "Next" },
    hunts: {
      notify: "Notify me",
      standings: "See the standings",
      details: "More info",
      tags: { "#2": ["New story", "Kalamata", "Team game"], "#1": ["10 stations", "One journal", "One treasure"] },
    },
    board: {
      label: "The case board",
      hint: "Pick a folder to open it",
      case: "Case",
      open: "Open the folder",
      close: "Close the folder",
      evidence: "Evidence",
      more: "All the details",
      unknown: "What is it hiding?",
      prize: "Prize",
    },
    top: {
      title: "500 € for the top three teams.",
      body: "The first Hunt was free for everyone. The three teams that reached the end first shared the cash prize.",
      stations: "Stations",
      share: "of the prize",
      podium: "The winners",
    },
    episodes: { step: "Step", count: "4 steps" },
    modal: {
      close: "Close",
      genres: "Genre",
      genresValue: "Mystery, puzzles, exploration",
      where: "Where",
      whereValue: "On the streets of Kalamata",
      need: "What you need",
    },
    faq: { title: "Frequently asked questions" },
    signup: {
      line: "Want to be the first to hear about the next Hunt? Write to us and we will let you know.",
      cta: "Notify me",
      subject: "Notify me about the next Hunt",
    },
    footer: { questions: "Questions? Write to us at", language: "Language", current: "English", standings: "Pythea standings" },
  },
}

export type ReelCopy = (typeof REEL_COPY)["el"]

export type HuntRef = "#2" | "#1"
export type ModalId = "show" | HuntRef

export const HUNT_IMAGES: Record<HuntRef, string> = {
  "#2": "/landing2/mission-carnival.webp",
  "#1": "/landing2/mission-pythea.webp",
}

export const BILLBOARD = "/landing2/billboard.webp"
