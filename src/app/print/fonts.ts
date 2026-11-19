import { Carlito, Tinos } from "next/font/google";

// Stand-ins with the same letter widths as Calibri and Times New Roman (the
// fonts the original Word documents use), for computers that don't have them.
const carlito = Carlito({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-carlito" });
const tinos = Tinos({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-tinos" });

/** Class names that define --font-carlito and --font-tinos for the print sheets. */
export const sheetFonts = `${carlito.variable} ${tinos.variable}`;
