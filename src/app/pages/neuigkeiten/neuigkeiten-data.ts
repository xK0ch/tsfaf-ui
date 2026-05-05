export interface NewsArticle {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly date: Date;
  readonly dateLong: string;
  readonly dateShort: string;
  readonly excerpt: string;
  readonly bodyHtml: string;
  readonly orange: boolean;
}

interface RawNews {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  bodyHtml: string;
  orange: boolean;
}

const RAW: readonly RawNews[] = [
  {
    id: '171',
    slug: 'gruppenrabatte',
    title: 'Gruppenrabatte für Neukunden',
    date: '2024-09-10T00:00:00Z',
    excerpt: 'Nach den Herbstferien starten die neuen Kurse, und neu sind unsere Gruppenrabatte für Neukunden.',
    bodyHtml: `<p>Nach den Herbstferien starten die neuen Kurse und neu sind auch unsere Gruppenrabatte für Neukunden:</p>
<ul>
  <li>ab 3 Paaren <strong>10 % pro Person</strong></li>
  <li>ab 5 Paaren <strong>15 % pro Person</strong></li>
  <li>ab 10 Paaren <strong>20 % pro Person</strong></li>
</ul>
<p>Der Rabatt gilt für alle Gesellschaftstanzkurse und HipHop-Kurse, die ab Oktober 2024 beginnen. Ihr müsst euch gemeinsam anmelden, am besten telefonisch unter 04321 – 1 49 00.</p>
<p>Wir freuen uns, wenn ihr gemeinsam tanzen lernt.</p>`,
    orange: true,
  },
  {
    id: '170',
    slug: 'sommerpause-2025',
    title: 'Sommerpause vom 15. Juli bis 12. August',
    date: '2024-07-01T00:00:00Z',
    excerpt: 'Wir machen eine kleine Pause, danach geht es mit frischer Energie weiter.',
    bodyHtml: `<p>Vom 15. Juli bis 12. August bleibt die Tanzschule geschlossen. Ab dem 13. August sind wir wieder für euch da.</p>
<p>In dieser Zeit könnt ihr uns per E-Mail erreichen, wir antworten so schnell wie möglich.</p>
<p>Wir wünschen euch eine erholsame Sommerzeit.</p>`,
    orange: false,
  },
  {
    id: '169',
    slug: 'hiphop-erwachsene',
    title: 'Neue HipHop-Kurse für Erwachsene',
    date: '2024-06-15T00:00:00Z',
    excerpt: 'Endlich auch für Erwachsene: HipHop Level 1 startet im September.',
    bodyHtml: `<p>Auf vielfache Nachfrage hin starten wir im September einen HipHop-Kurs für Erwachsene ab 18 Jahren.</p>
<p>Der Kurs findet dienstags von 20:00 bis 21:00 Uhr statt und richtet sich an absolute Einsteiger. Vorkenntnisse sind nicht nötig: nur Lust auf Bewegung und gute Musik.</p>
<p>Anmeldung ab sofort möglich: telefonisch unter 04321 – 1 49 00 oder direkt an der Tanzschule.</p>`,
    orange: true,
  },
  {
    id: '168',
    slug: 'abschlussball-fotos',
    title: 'Fotos vom Abschlussball sind online',
    date: '2024-05-20T00:00:00Z',
    excerpt: 'Der Abschlussball war ein voller Erfolg, die Fotos findet ihr jetzt in der Galerie.',
    bodyHtml: `<p>Was für ein Abend. Der Abschlussball 2024 war einer der schönsten in der Geschichte unserer Tanzschule. Über 120 Tanzschülerinnen und Tanzschüler haben gezeigt, was sie gelernt haben.</p>
<p>Die Fotos sind jetzt in der Galerie verfügbar. Schaut rein und teilt eure Lieblingsmomente.</p>`,
    orange: false,
  },
  {
    id: '167',
    slug: 'kanga-kurs-neu',
    title: 'Kanga-Kurs startet wieder',
    date: '2024-04-01T00:00:00Z',
    excerpt: 'Der beliebte Kanga-Kurs für Mütter mit Baby in der Trage startet im April neu.',
    bodyHtml: `<p>Nach einer kurzen Pause startet unser Kanga-Kurs wieder: freitags von 10:00 bis 11:00 Uhr.</p>
<p>Kanga ist ein Fitnessprogramm speziell für Mütter mit Baby in der Trage. Die Kurse sind für Babys ab etwa 6 Wochen bis zum Ende der Tragezeit geeignet.</p>
<p>Probestunde möglich, ruf einfach kurz an: 04321 – 1 49 00.</p>`,
    orange: true,
  },
  {
    id: '166',
    slug: 'zumba-party-maerz',
    title: 'Zumba-Party im März',
    date: '2024-03-05T00:00:00Z',
    excerpt: 'Eine Stunde pure Zumba-Energy mit DJ, kostenlos für alle Kursteilnehmenden.',
    bodyHtml: `<p>Am 22. März laden wir alle Zumba-Teilnehmenden und Interessierten zu einer besonderen Zumba-Party ein.</p>
<p>Eine Stunde lang tanzen wir gemeinsam zu DJ-Beats, kostenlos für alle aktiven Kursteilnehmenden, 5 € Eintritt für alle anderen.</p>
<p>Einfach vorbeikommen, keine Anmeldung nötig.</p>`,
    orange: false,
  },
];

function buildArticle(raw: RawNews): NewsArticle {
  const date = new Date(raw.date);
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    date,
    dateLong: date.toLocaleDateString('de-DE', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    dateShort: date.toLocaleDateString('de-DE', {
      month: 'short', year: '2-digit',
    }),
    excerpt: raw.excerpt,
    bodyHtml: raw.bodyHtml,
    orange: raw.orange,
  };
}

export const NEWS_ARTICLES: readonly NewsArticle[] = RAW
  .map(buildArticle)
  .sort((a, b) => b.date.getTime() - a.date.getTime());

export const NEWS_PER_PAGE = 6;

export function findArticleBySlug(slug: string): NewsArticle | undefined {
  return NEWS_ARTICLES.find(a => a.slug === slug);
}
