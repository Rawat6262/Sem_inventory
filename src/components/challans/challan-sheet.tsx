"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Button, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useChallanPrint, type Direction, type PrintableChallan } from "@/lib/challans";

// The SEM letter (page 1) and delivery challan (page 2) for one challan, laid
// out on A4 to match the company's Word templates point for point:
//   outgoing → transport letter ("Permission for the carrying ...")
//   incoming → return letter ("Intimation for return ..."), and the challan
//              page gains a "Return Venue" line.
// All sizes are in pt and were measured from those PDFs. They were US Letter,
// so the same 468pt-wide text column is centred on A4 (every line wraps
// exactly as in the originals) and the footer keeps its distance from the
// bottom edge.

const DEFAULT_GST = "03CAQPK9502D1ZU";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HEADER_ALT = "Sportz Entertainment Media, 10-A Link Road Industrial Estate, Dholewal, Ludhiana, Punjab";
const NB = " "; // keeps the double spaces the templates use

// Items per delivery-challan page: the last page also needs room for the
// total and the stamp. Only very long challans spill onto a third page.
const LAST_PAGE_ROWS = 19;
const PAGE_ROWS = 29;

const LIST_HREF: Record<Direction, string> = { outgoing: "/modules/outgoing", incoming: "/modules/incoming" };
const LIST_LABEL: Record<Direction, string> = { outgoing: "Outgoing challans", incoming: "Incoming challans" };

export function ChallanPrint({ dir }: { dir: Direction }) {
  const { id } = useParams<{ id: string }>();
  const autoPrint = useSearchParams().get("print") === "1";
  const challan = useChallanPrint(dir, id);
  const printed = useRef(false);

  const c = challan.data;

  // Name the saved PDF after the challan, e.g. "SEM-113-26-27 Hero Asian ...".
  useEffect(() => {
    if (c) document.title = `${c.document_number.replaceAll("/", "-")} ${c.exhibition_name}`;
  }, [c]);

  // Opened right after creating a challan: print once images and fonts are in.
  useEffect(() => {
    if (!c || !autoPrint || printed.current) return;
    printed.current = true;
    const images = Array.from(document.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((done) => img.addEventListener("load", () => done(), { once: true })),
    );
    void Promise.all([document.fonts.ready, ...images]).then(() => window.print());
  }, [c, autoPrint]);

  if (challan.isPending) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Loading challan" />
      </div>
    );
  }

  if (challan.error || !c) {
    const status = challan.error instanceof ApiError ? challan.error.status : 0;
    const message =
      status === 404 || status === 400
        ? "This challan doesn't exist. It may have been deleted."
        : status === 403
          ? "You can only print challans you created."
          : (challan.error?.message ?? "Couldn't load this challan.");
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted">{message}</p>
        <Link href={LIST_HREF[dir]} className="text-sm font-medium text-accent hover:underline">
          Back to {LIST_LABEL[dir].toLowerCase()}
        </Link>
      </div>
    );
  }

  return (
    <div className="dc-root">
      <div className="dc-toolbar border-b border-line bg-surface print:hidden">
        <Link href={LIST_HREF[dir]} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          {LIST_LABEL[dir]}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted">In the print window choose &ldquo;Save as PDF&rdquo; and paper size A4.</span>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <ChallanSheets dir={dir} c={c} />
    </div>
  );
}

/** The A4 pages themselves (letter, then the challan), with their styles. */
export function ChallanSheets({ dir, c }: { dir: Direction; c: PrintableChallan }) {
  const pages = challanPages(dir, c.items);
  return (
    <div className="dc-pages">
      <style>{SHEET_CSS}</style>
      {dir === "incoming" ? <ReturnLetter c={c} /> : <TransportLetter c={c} />}
      {pages.map((rows, i) => (
        <DeliveryChallan key={i} dir={dir} c={c} rows={rows} last={i === pages.length - 1} />
      ))}
    </div>
  );
}

// ─── Page 1 (outgoing): transport letter ───────────────────────────────────

function TransportLetter({ c }: { c: PrintableChallan }) {
  const name = c.exhibition_name;
  const venue = fullVenue(c);
  const dates = dateRange(c.exhibition_date, c.exhibition_endingdate, false, true);
  return (
    <Sheet>
      <Img src="/challan/sem-header-letter.png" alt={HEADER_ALT} style={{ top: "21.6pt", width: "224.8pt", height: "85.7pt" }} />

      <p className="dc-times dc-bold dc-at dc-right" style={{ top: "107.8pt", right: "var(--dc-right-37)" }}>
        Date: {letterDate(c.date)}
      </p>
      <p className="dc-times dc-bold dc-at dc-center dc-u" style={{ top: "133.7pt" }}>
        TO WHOM IT MAY CONCERN
      </p>

      <div className="dc-flow" style={{ top: "160.1pt" }}>
        <p className="dc-h16">
          <b>Subject: -</b>
          <span className="dc-11">
            {" "}Permission for the carrying Exhibition Material to <b>{name}</b>, <b>FROM{NB} {dates}</b>
          </span>
        </p>
        <p className="dc-h16" style={{ marginTop: "11.8pt" }}>
          <b>Respected Sir/Madam,</b>
        </p>
        <p className="dc-para" style={{ marginTop: "11.4pt" }}>
          You are requested to permit the carrying used /Exhibition/Conference Material &amp; Display such as for the Exhibition named <b>{name},</b> (scheduled to be held{" "}
          <b>
            {venue}, from {dates}
          </b>
        </p>
        <p className="dc-para" style={{ marginTop: "9.9pt" }}>
          The material will be back after the Exhibition is over and all these materials are ONLY for display basic, NOT FOR SALE &amp; as such it does not attract sales tax, octroi duty or any such other applicable duty. Kindly permit these materials and oblige.
        </p>

        <p className="dc-line dc-bold" style={{ marginTop: "36.65pt" }}>
          <span className="dc-u">Exhibition: {name}</span>
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12.1pt" }}>
          <span className="dc-u">Venue:</span>
          {NB} {venue}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
          <span className="dc-u">Exhibition Date:</span>
          {NB}
          {NB} {dates}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12.1pt" }}>
          GSTN Number : {c.gst_number || DEFAULT_GST}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
          Vehicle No: {c.vehicle_no}
        </p>

        <Img src="/challan/sem-stamp.png" alt="Company stamp and signature" flow style={{ marginTop: "11.45pt", width: "96.2pt", height: "67.7pt" }} />

        <p className="dc-line" style={{ marginTop: "12.65pt" }}>
          Thanks &amp; Regards
        </p>
      </div>
    </Sheet>
  );
}

// ─── Page 1 (incoming): return letter ──────────────────────────────────────

function ReturnLetter({ c }: { c: PrintableChallan }) {
  const name = c.exhibition_name;
  const venue = fullVenue(c);
  const dates = longDateRange(c.exhibition_date, c.exhibition_endingdate);
  return (
    <Sheet>
      <Img src="/challan/sem-header-challan.png" alt={HEADER_ALT} style={{ top: "21.6pt", width: "246.1pt", height: "93.8pt" }} />

      <p className="dc-times dc-bold dc-at dc-right" style={{ top: "116.1pt", right: "var(--dc-col)" }}>
        Date: {returnLetterDate(c.date)}
      </p>
      <p className="dc-times dc-bold dc-at dc-center dc-u" style={{ top: "142pt" }}>
        TO WHOM IT MAY CONCERN
      </p>

      <div className="dc-flow" style={{ top: "169pt" }}>
        <p className="dc-h16" style={{ lineHeight: "17.7pt", marginRight: "-2.4pt" }}>
          <b>Subject: -</b>
          {/* Own line height so the 11pt text doesn't stretch the wrapped line past 17.7pt. */}
          <span className="dc-11" style={{ lineHeight: "13.4pt" }}>
            <span className="dc-red">Intimation for return of Exhibition Material after exhibition of{NB} </span>
            <b>{name}</b>
            <b className="dc-red"> from</b>
            <b>
              {NB} {dates}
            </b>
          </span>
        </p>
        <p className="dc-h16" style={{ marginTop: "11.7pt" }}>
          <b>Respected Sir/Madam,</b>
        </p>
        <p className="dc-para" style={{ marginTop: "11.4pt" }}>
          <span className="dc-red">This is to inform you that the exhibition material, display items, and conference goods which were earlier transported for display purpose to </span>
          <b>{name}</b> (scheduled At{NB}{" "}
          <b>
            {venue}) from{NB} {dates}
          </b>
          <b className="dc-red"> are now being returned back after completion of the exhibition.</b>
        </p>
        <p className="dc-para dc-red" style={{ marginTop: "35.2pt" }}>
          The inward movement of goods is only a return of the same material sent earlier for exhibition purposes. These goods were not sold, not transferred, and no supply has taken place during the exhibition all these materials are ONLY for display. Hence, this movement does not attract GST, in accordance with Rule 55 of the CGST Rules, 2017, and is being carried under Delivery Challan. We kindly request you to allow the inward movement of the above-mentioned goods.
        </p>
        <p className="dc-line dc-red" style={{ marginTop: "11.3pt" }}>
          Thanking you.
        </p>

        <p className="dc-line dc-bold" style={{ marginTop: "12.1pt" }}>
          <span className="dc-u">Exhibition:</span> {name}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
          {NB}
          <span className="dc-u">
            Venue:{NB}
            {NB}
          </span>{" "}
          {venue}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
          <span className="dc-u">Exhibition Date:</span>
          {NB} {dates}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12.1pt" }}>
          GSTN Number : {c.gst_number || DEFAULT_GST}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
          Delivery challan: {c.document_number}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12.1pt" }}>
          Vehicle No: {c.vehicle_no}
        </p>

        <Img src="/challan/sem-stamp.png" alt="Company stamp and signature" flow style={{ marginTop: "11.3pt", width: "96.2pt", height: "67.7pt" }} />

        <p className="dc-line" style={{ marginTop: "12.7pt" }}>
          Thanks &amp; Regards
        </p>
      </div>
    </Sheet>
  );
}

// ─── Page 2: delivery challan ──────────────────────────────────────────────

type Row = PrintableChallan["items"][number] & { sno: number; qty: number };

function DeliveryChallan({ dir, c, rows, last }: { dir: Direction; c: PrintableChallan; rows: Row[]; last: boolean }) {
  return (
    <Sheet>
      <Img src="/challan/sem-header-challan.png" alt={HEADER_ALT} style={{ top: "21.6pt", width: "246.1pt", height: "93.8pt" }} />

      <p className="dc-times dc-bold dc-at dc-center dc-u" style={{ top: "115.9pt" }}>
        Delivery Challan
      </p>

      <p className="dc-line dc-bold dc-at" style={{ top: "141.95pt" }}>
        Document Number: {c.document_number}
      </p>
      <p className="dc-line dc-bold dc-at dc-right" style={{ top: "141.95pt", right: "var(--dc-right-34)" }}>
        Date: {challanDate(c.date)}
      </p>
      <p className="dc-line dc-bold dc-at dc-right" style={{ top: "167.45pt", right: "var(--dc-right-32)" }}>
        Date of Exhibition:{NB} {dateRange(c.exhibition_date, c.exhibition_endingdate, true)}
      </p>

      <div className="dc-flow" style={{ top: "192.95pt" }}>
        <p className="dc-line dc-bold">
          <span className="dc-u">Exhibition: {c.exhibition_name}</span>
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
          GST Number: {c.gst_number || DEFAULT_GST}
        </p>
        <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
          EXHIBITION Venue: {fullVenue(c)}
        </p>
        {dir === "incoming" && (
          <p className="dc-line dc-bold" style={{ marginTop: "12pt" }}>
            Return Venue: {returnVenue(c)}
          </p>
        )}
        <p className="dc-line dc-bold" style={{ marginTop: "12.1pt" }}>
          Vehicle No: {c.vehicle_no}
        </p>

        <table className="dc-table dc-times" style={{ marginTop: "11.35pt" }}>
          <colgroup>
            <col style={{ width: "60.6pt" }} />
            <col style={{ width: "201.4pt" }} />
            <col style={{ width: "78pt" }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>S.no</th>
              <th className="dc-left">Item</th>
              <th>HSN CODE</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.item_id}-${r.sno}`}>
                <td>{r.sno}</td>
                <td className="dc-left">{r.item_name}</td>
                <td>{r.hsn_code}</td>
                <td>{qtyLabel(r.qty, r.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {last && (
          <>
            <table className="dc-total" style={{ marginTop: "52pt" }}>
              <tbody>
                <tr>
                  <td>Total value of goods</td>
                  <td>{c.goods_value != null ? `${Math.round(c.goods_value)}/-` : ""}</td>
                </tr>
              </tbody>
            </table>
            <Img src="/challan/sem-stamp.png" alt="Company stamp and signature" flow style={{ marginTop: "25.4pt", marginLeft: "169.1pt", width: "96.2pt", height: "67.7pt" }} />
          </>
        )}
      </div>
    </Sheet>
  );
}

// ─── Shared pieces ─────────────────────────────────────────────────────────

/** One A4 page: border, footer, and whatever goes on it. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <section className="dc-sheet">
      <div className="dc-border" aria-hidden />
      {children}
      <Img src="/challan/sem-footer.png" alt="Phone +91-6280943214, Mail mkt.semgroup@gmail.com, www.semgoup.in" style={{ bottom: "28.8pt", width: "468pt", height: "46.9pt" }} />
    </section>
  );
}

/** Letterhead images. Absolutely placed in the text column unless `flow`. */
function Img({ src, alt, style, flow }: { src: string; alt: string; style: CSSProperties; flow?: boolean }) {
  // Plain <img>: these are fixed print assets, and next/image's lazy loading
  // would race the automatic print.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={flow ? "dc-img" : "dc-img dc-at"} style={style} />;
}

// ─── Formatting ────────────────────────────────────────────────────────────

/**
 * Split items over challan pages, numbering them 1..n across pages. An
 * incoming challan lists what is physically coming back (lost and dead units
 * aren't on the truck), and leaves out items with nothing coming back.
 */
function challanPages(dir: Direction, items: PrintableChallan["items"]): Row[][] {
  const listed = items
    .map((item) => ({ ...item, qty: dir === "incoming" ? (item.received_quantity ?? item.quantity) : item.quantity }))
    .filter((item) => dir === "outgoing" || item.qty > 0);
  let rest: Row[] = listed.map((item, i) => ({ ...item, sno: i + 1 }));
  const pages: Row[][] = [];
  while (rest.length > LAST_PAGE_ROWS) {
    const take = Math.min(PAGE_ROWS, rest.length - 1);
    pages.push(rest.slice(0, take));
    rest = rest.slice(take);
  }
  pages.push(rest);
  return pages;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 07-01-2026 (transport letter) */
function letterDate(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** 7-04-2025 (return letter) */
function returnLetterDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** 02 November, 2026 */
function challanDate(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

/**
 * "9-11 jan, 2026" (transport letter: lowercase month, as the template has it)
 * or "04-05 Nov, 2026" (challan: padded days).
 */
function dateRange(startIso: string, endIso: string, padDays: boolean, lowerMonth = false) {
  const a = new Date(startIso);
  const b = new Date(endIso);
  const day = (d: Date) => (padDays ? pad(d.getDate()) : String(d.getDate()));
  const shortMonth = (d: Date) => (lowerMonth ? MONTHS[d.getMonth()].slice(0, 3).toLowerCase() : MONTHS[d.getMonth()].slice(0, 3));
  if (a.getFullYear() !== b.getFullYear()) return `${day(a)} ${shortMonth(a)}, ${a.getFullYear()} - ${day(b)} ${shortMonth(b)}, ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${day(a)} ${shortMonth(a)} - ${day(b)} ${shortMonth(b)}, ${b.getFullYear()}`;
  if (a.getDate() === b.getDate()) return `${day(a)} ${shortMonth(a)}, ${a.getFullYear()}`;
  return `${day(a)}-${day(b)} ${shortMonth(a)}, ${a.getFullYear()}`;
}

/** "10–12 april 2025" (return letter: full lowercase month, en dash, no comma, as the template has it). */
function longDateRange(startIso: string, endIso: string) {
  const a = new Date(startIso);
  const b = new Date(endIso);
  const month = (d: Date) => MONTHS[d.getMonth()].toLowerCase();
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} ${month(a)} ${a.getFullYear()} – ${b.getDate()} ${month(b)} ${b.getFullYear()}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)} ${b.getFullYear()}`;
  if (a.getDate() === b.getDate()) return `${a.getDate()} ${month(a)} ${a.getFullYear()}`;
  return `${a.getDate()}–${b.getDate()} ${month(a)} ${a.getFullYear()}`;
}

/** "Geeta Jayanti Ground, Theme Park, Kurukshetra- 136118, Haryana" */
function fullVenue(c: PrintableChallan) {
  const ex = c.exhibition;
  let s = (ex?.venue || c.exhibition_venue || "").trim().replace(/[,\s]+$/, "");
  const has = (part: string) => s.toLowerCase().includes(part.toLowerCase());
  if (ex?.city && !has(ex.city)) s += `${s ? ", " : ""}${ex.city}`;
  if (ex?.zipCode && !has(ex.zipCode)) s += `- ${ex.zipCode}`;
  if (ex?.state && !has(ex.state)) s += `, ${ex.state}`;
  return s;
}

/** The warehouse the goods go back to: "PARTAPGARH, LUDHIANA, PUNJAB-141126". */
function returnVenue(c: PrintableChallan) {
  const w = c.warehouse;
  let s = (w?.address ?? "").trim().replace(/[,\s]+$/, "");
  const has = (part: string) => s.toLowerCase().includes(part.toLowerCase());
  if (w?.city && !has(w.city)) s += `${s ? ", " : ""}${w.city}`;
  if (w?.state && !has(w.state)) s += `${s ? ", " : ""}${w.state}`;
  return s;
}

/** "10", or "2 roll" for anything not counted in pieces. */
function qtyLabel(quantity: number, unit: string) {
  return !unit || unit === "pcs" ? String(quantity) : `${quantity} ${unit}`;
}

// ─── Sheet styles (pt, measured from the original PDFs) ────────────────────

const SHEET_CSS = `
@page { size: A4; margin: 0; }

.dc-root { min-height: 100vh; background: #e5e5e5; }
.dc-pages {
  --dc-col: 63.64pt;               /* left edge of the 468pt text column on A4 */
  --dc-right-37: calc(595.28pt - var(--dc-col) - 465pt);   /* text ending at x=537 in the original */
  --dc-right-34: calc(595.28pt - var(--dc-col) - 465.9pt); /* x=537.9 */
  --dc-right-32: calc(595.28pt - var(--dc-col) - 467.9pt); /* x=539.9 */
}
.dc-toolbar {
  position: sticky; top: 0; z-index: 1;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px;
}
.dc-pages { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px 16px; overflow-x: auto; }

.dc-sheet {
  position: relative; flex: none; overflow: hidden;
  width: 595.28pt; height: 841.89pt;
  background: #fff; color: #000;
  font-family: Calibri, var(--font-carlito, Carlito), sans-serif; font-size: 11pt;
  box-shadow: 0 1px 4px rgba(0,0,0,.25);
  -webkit-font-smoothing: auto;
}
/* Self-contained: don't rely on the app's global reset for the measurements. */
.dc-sheet, .dc-sheet * { box-sizing: border-box; }
.dc-sheet p { margin: 0; }
.dc-sheet b, .dc-bold { font-weight: 700; }
/* Drawn over the letterhead image, which overlaps it slightly, as in the original. */
.dc-border { position: absolute; z-index: 1; pointer-events: none; left: 24pt; top: 24pt; right: 24pt; bottom: 24pt; border: 0.5pt solid #000; }

.dc-at { position: absolute; left: var(--dc-col); white-space: nowrap; }
.dc-right { left: auto; }
.dc-center { left: 0; right: 0; text-align: center; }
.dc-flow { position: absolute; left: var(--dc-col); width: 468pt; }
.dc-img { display: block; }

.dc-times { font-family: "Times New Roman", var(--font-tinos, Tinos), serif; font-size: 12pt; line-height: 1.107; }
.dc-red { color: #f00; } /* the return letter's red wording */
.dc-u { text-decoration: underline; text-decoration-thickness: 0.75pt; text-underline-offset: 1.6pt; }
.dc-h16 { font-size: 16pt; line-height: 19.2pt; }
.dc-11 { font-size: 11pt; }
/* Word sets text about 0.5% tighter than browsers, so it fits lines up to ~470.4pt into
   the 468pt column. The same slack here keeps every line break where Word put it. */
.dc-sheet .dc-para { font-size: 11pt; line-height: 15.5pt; text-align: justify; margin-right: -2.4pt; }
.dc-line { font-size: 11pt; line-height: 13.4pt; }

.dc-table { width: 468pt; border-collapse: collapse; table-layout: fixed; }
.dc-table th, .dc-table td {
  height: 15pt; padding: 0 2pt; border: 0.5pt solid #000;
  text-align: center; vertical-align: middle; line-height: 13.3pt;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.dc-table th { font-weight: 700; }
.dc-table .dc-left { text-align: left; padding-left: 5.2pt; }

.dc-total { width: 468pt; border-collapse: collapse; table-layout: fixed; font-size: 11pt; }
.dc-total td { width: 50%; height: 12.9pt; padding: 0; border: 0.5pt solid #000; text-align: center; vertical-align: middle; line-height: 12.9pt; }

@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .dc-root { background: #fff; min-height: 0; }
  .dc-pages { display: block; padding: 0; gap: 0; overflow: visible; }
  .dc-sheet { box-shadow: none; margin: 0; break-after: page; }
  .dc-sheet:last-child { break-after: auto; }
  .dc-sheet, .dc-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
