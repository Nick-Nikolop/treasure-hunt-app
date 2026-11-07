import {
  Alegreya_SC,
  Bona_Nova,
  Brygada_1918,
  Cardo,
  Caudex,
  EB_Garamond,
  GFS_Didot,
  Literata,
  Manrope,
  Noto_Serif_Display,
  Ysabeau_Office,
} from "next/font/google"

const notoSerifDisplay = Noto_Serif_Display({ subsets: ["greek", "latin"], display: "swap", preload: false })
const bonaNova = Bona_Nova({ subsets: ["greek", "latin"], display: "swap", preload: false, weight: ["400", "700"] })
const caudex = Caudex({ subsets: ["greek", "latin"], display: "swap", preload: false, weight: ["400", "700"] })
const ebGaramond = EB_Garamond({ subsets: ["greek", "latin"], display: "swap", preload: false })
const manrope = Manrope({ subsets: ["greek", "latin"], display: "swap", preload: false })
const brygada = Brygada_1918({ subsets: ["greek", "latin"], display: "swap", preload: false })
const gfsDidot = GFS_Didot({ subsets: ["greek", "latin"], display: "swap", preload: false, weight: "400" })
const ysabeauOffice = Ysabeau_Office({ subsets: ["greek", "latin"], display: "swap", preload: false })
const alegreyaSC = Alegreya_SC({ subsets: ["greek", "latin"], display: "swap", preload: false, weight: ["400", "700", "900"] })
const literata = Literata({ subsets: ["greek", "latin"], display: "swap", preload: false })
const cardo = Cardo({ subsets: ["greek", "latin"], display: "swap", preload: false, weight: ["400", "700"] })


export type CrownFont = { id: string; name: string; mood: string; family: string | null }

/** Fonts with Greek glyphs to audition on the hero title and subtitle. `family: null` = the site's own Alegreya. */
export const CROWN_FONTS: CrownFont[] = [
  { id: "alegreya", name: "Alegreya", mood: "Τωρινό, ζεστό λογοτεχνικό", family: null },
  { id: "noto-display", name: "Noto Serif Display", mood: "Μεγάλη αντίθεση, σαν χαραγμένο σε χρυσό", family: notoSerifDisplay.style.fontFamily },
  { id: "didot", name: "GFS Didot", mood: "Κλασική ελληνική τυπογραφία", family: gfsDidot.style.fontFamily },
  { id: "bona-nova", name: "Bona Nova", mood: "Στολισμένο, σαν πρόσκληση παλατιού", family: bonaNova.style.fontFamily },
  { id: "garamond", name: "EB Garamond", mood: "Παλιό βιβλίο με παραμύθια", family: ebGaramond.style.fontFamily },
  { id: "caudex", name: "Caudex", mood: "Μεσαιωνικό, σαν πάπυρος", family: caudex.style.fontFamily },
  { id: "brygada", name: "Brygada 1918", mood: "Αφίσα παλιού τυπογραφείου", family: brygada.style.fontFamily },
  { id: "alegreya-sc", name: "Alegreya SC", mood: "Μικρά κεφαλαία, επίσημο χρονικό", family: alegreyaSC.style.fontFamily },
  { id: "cardo", name: "Cardo", mood: "Ακαδημαϊκό, σαν αρχείο ιστορικού", family: cardo.style.fontFamily },
  { id: "literata", name: "Literata", mood: "Σύγχρονο serif, πολύ ευανάγνωστο", family: literata.style.fontFamily },
  { id: "ysabeau", name: "Ysabeau", mood: "Λεπτό και κομψό", family: ysabeauOffice.style.fontFamily },
  { id: "manrope", name: "Manrope", mood: "Καθαρό sans, μοντέρνο", family: manrope.style.fontFamily },
]
