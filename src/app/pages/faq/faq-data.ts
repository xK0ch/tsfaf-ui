export interface FaqItem {
  readonly id: string;
  readonly q: string;
  readonly a: string;
}

export interface FaqGroup {
  readonly category: string;
  readonly items: readonly FaqItem[];
}

export const FAQ_GROUPS: readonly FaqGroup[] = [
  {
    category: 'Anmeldung',
    items: [
      {
        id: 'faq-probestunde',
        q: 'Kann ich eine Probestunde machen?',
        a: '<p>In den Gesellschaftstanzkursen bieten wir aus organisatorischen Gründen keine Probestunden an. In Kindertanz, Videoclip-Dancing, Zumba, Kanga etc. sind Probestunden möglich. Ruf uns am besten kurz an: 04321 – 1 49 00.</p>',
      },
      {
        id: 'faq-anmeldung-wie',
        q: 'Wie melde ich mich an?',
        a: '<p>Du kannst dich telefonisch unter 04321 – 1 49 00, per E-Mail oder direkt an der Tanzschule anmelden. Für einige Kurse ist auch eine Online-Anmeldung über unser Buchungssystem möglich.</p>',
      },
      {
        id: 'faq-partner',
        q: 'Brauche ich einen Tanzpartner?',
        a: '<p>In den meisten Paartanzkursen ist ein Partner willkommen, aber kein Muss. Wir vermitteln gerne Tanzpartner innerhalb unserer Schule. Frag einfach beim Anmelden nach.</p>',
      },
      {
        id: 'faq-alter',
        q: 'Gibt es Altersbeschränkungen?',
        a: '<p>Nein, wir haben Kurse für alle Altersgruppen ab 3 Jahren. Kinder, Jugendliche, Erwachsene und Senioren sind alle herzlich willkommen.</p>',
      },
    ],
  },
  {
    category: 'Bezahlung',
    items: [
      {
        id: 'faq-bezahlung',
        q: 'Wie kann ich bezahlen?',
        a: '<p>Die Kurse sollten bis zur 2. Stunde bezahlt sein. Du kannst vor Ort in bar, per Überweisung oder per SEPA-Lastschrift zahlen.</p>',
      },
      {
        id: 'faq-rueckerstattung',
        q: 'Was passiert, wenn ich einen Kurs abbrechen muss?',
        a: '<p>Bitte sprich uns direkt an. In besonderen Situationen finden wir gemeinsam eine Lösung. Die genauen Bedingungen erfährst du bei der Anmeldung.</p>',
      },
      {
        id: 'faq-gutschein-einloesen',
        q: 'Kann ich einen Gutschein einlösen?',
        a: '<p>Ja, Tanzgutscheine können für alle Kurse und Veranstaltungen eingelöst werden. Auch Bildungsgutscheine der Agentur für Arbeit werden akzeptiert. Ruf vorher kurz an.</p>',
      },
    ],
  },
  {
    category: 'Praktisches',
    items: [
      {
        id: 'faq-kleidung',
        q: 'Was soll ich anziehen?',
        a: '<p>Im Kurs trägst du, was dir gefällt: Jeans, Stoffhose, Hemd, T-Shirt. Hauptsache, du fühlst dich wohl. Im Fitnessbereich (Zumba, Kanga) ist ein Sportoutfit hilfreich.</p>',
      },
      {
        id: 'faq-schuhe',
        q: 'Brauche ich spezielle Tanzschuhe?',
        a: '<p>Zum Einstieg reichen normale Schuhe mit glatter Sohle. Für Fortgeschrittene empfehlen wir Tanzschuhe. Wir können dir gerne Bezugsquellen nennen.</p>',
      },
      {
        id: 'faq-parkplatz',
        q: 'Gibt es Parkmöglichkeiten?',
        a: '<p>Ja, vor der Tanzschule sind ausreichend Parkplätze vorhanden. Mit dem Bus erreichst du uns über die Linien 9, 4 und 33, Haltestelle Kieler Straße.</p>',
      },
      {
        id: 'faq-kinder',
        q: 'Können Eltern beim Kindertanz zuschauen?',
        a: '<p>Aus pädagogischen Gründen bitten wir Eltern, während des Unterrichts im Foyer zu warten. So können die Kinder sich besser konzentrieren und lösen sich schneller vom Elternteil.</p>',
      },
    ],
  },
  {
    category: 'Kursinhalte',
    items: [
      {
        id: 'faq-welttanz',
        q: 'Was ist das Welttanzprogramm?',
        a: '<p>Das Welttanzprogramm des ADTV umfasst die wichtigsten Gesellschaftstänze: Langsamer Walzer, Foxtrott, Discofox, Cha Cha Cha, Rumba und weitere. Es ist der ideale Einstieg ins Paartanzen.</p>',
      },
      {
        id: 'faq-kanga-baby',
        q: 'Ab wann kann mein Baby am Kanga-Kurs teilnehmen?',
        a: '<p>Kanga ist geeignet für Babys ab etwa 6 Wochen bis zum Ende der Tragezeit (ca. 12 bis 18 Monate). Wichtig ist, dass das Baby stabil in der Trage sitzt.</p>',
      },
      {
        id: 'faq-parkinson',
        q: 'Für wen ist die Parkinson-Tanzgruppe?',
        a: '<p>Die Gruppe richtet sich an Menschen mit Parkinson-Erkrankung. Tanz und Rhythmus können die Motorik und das Wohlbefinden positiv beeinflussen. Eine ärztliche Freigabe ist empfehlenswert.</p>',
      },
    ],
  },
];

export const ALL_CATEGORY = 'Alle';

export const TOTAL_ITEM_COUNT = FAQ_GROUPS.reduce(
  (sum, g) => sum + g.items.length,
  0,
);
