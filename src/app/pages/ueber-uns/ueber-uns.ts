import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamCard } from './team-card/team-card';

export type ColorVariant = 'orange' | 'teal';

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly qualifications: readonly string[];
  readonly bio: string;
  readonly variant: ColorVariant;
}

interface HeroStat {
  readonly value: string;
  readonly label: string;
}

interface IntroStat {
  readonly label: string;
  readonly value: string;
  readonly variant: ColorVariant;
}

interface ValueCard {
  readonly icon: string;
  readonly label: string;
  readonly desc: string;
  readonly orange: boolean;
}

interface Room {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly icon: string;
  readonly orange: boolean;
}

@Component({
  selector: 'app-ueber-uns',
  imports: [RouterLink, TeamCard],
  templateUrl: './ueber-uns.html',
  styleUrl: './ueber-uns.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UeberUns {
  protected readonly heroStats: readonly HeroStat[] = [
    { value: '20+',    label: 'Jahre Erfahrung' },
    { value: '950 m²', label: 'Tanzfläche' },
    { value: '3 Säle', label: 'mit moderner Technik' },
    { value: '5',      label: 'qualifizierte Lehrkräfte' },
  ];

  protected readonly introStats: readonly IntroStat[] = [
    { label: 'Tanzstile im Angebot', value: '7+',  variant: 'orange' },
    { label: 'Kurse pro Woche',      value: '15+', variant: 'teal'   },
    { label: 'Altersgruppen',        value: '4',   variant: 'orange' },
    { label: 'Spezialgruppen',       value: '3',   variant: 'teal'   },
  ];

  protected readonly values: readonly ValueCard[] = [
    { icon: '🤝', label: 'Gemeinschaft',   desc: 'Bei uns tanzt du nie allein. Wir sind eine Gemeinschaft aus allen Altersgruppen und Tanzlevels.',                                              orange: true  },
    { icon: '📜', label: 'ADTV-Qualität',  desc: 'Als ADTV-zertifizierte Tanzschule stehen wir für geprüfte Ausbildung und höchste Lehrqualität.',                                              orange: false },
    { icon: '🌈', label: 'Für alle',       desc: 'Von 3 bis 90: unser Angebot reicht von den Minis bis zur Parkinson-Gruppe, niemand wird ausgelassen.',                                        orange: true  },
    { icon: '📍', label: 'Neumünster',     desc: '950 m² in der Kieler Straße 54: moderne Säle, Foyer mit Bar, Licht- und Soundtechnik auf dem neuesten Stand.',                                orange: false },
    { icon: '❤️', label: 'Mit Herz',       desc: 'Seit über 20 Jahren tanzen wir mit Leidenschaft und freuen uns über jeden neuen Tanzschüler.',                                                orange: true  },
    { icon: '🎓', label: 'Weiterbildung',  desc: 'Unser Team bildet sich kontinuierlich weiter: neue Stile, neue Methoden, immer auf dem neuesten Stand.',                                      orange: false },
  ];

  protected readonly rooms: readonly Room[] = [
    { id: 'r-saal-1',   name: 'Saal 1',    detail: 'ca. 200 m² · Spiegelfronten',     icon: '🎭', orange: true  },
    { id: 'r-saal-2',   name: 'Saal 2',    detail: 'ca. 180 m² · Holzparkett',        icon: '🎵', orange: false },
    { id: 'r-saal-3',   name: 'Saal 3',    detail: 'ca. 120 m² · Fitness und Kanga',  icon: '💪', orange: true  },
    { id: 'r-foyer',    name: 'Foyer',     detail: 'Bar und Loungebereich',           icon: '🥂', orange: false },
    { id: 'r-garderobe', name: 'Garderobe', detail: 'Umkleiden und Schließfächer',     icon: '👗', orange: true  },
  ];

  protected readonly team: readonly TeamMember[] = [
    {
      id: 't-1',
      name: 'Uwe Höftmann',
      role: 'Inhaber und ADTV-Tanzlehrer',
      qualifications: ['ADTV-Tanzlehrer', 'Step-Instructor', 'Dance-4-Fans-Instructor', 'ZUMBA-Instructor', 'Agilando-Instructor'],
      bio: 'Uwe leitet die Tanzschule seit der Gründung und unterrichtet mit Leidenschaft alle Altersgruppen. Sein Schwerpunkt liegt im Standardtanz und Discofox.',
      variant: 'orange',
    },
    {
      id: 't-2',
      name: 'Tabea Höftmann',
      role: 'ADTV-Tanzlehrerin',
      qualifications: ['ADTV-Kindertanzlehrerin', 'Dance-4-Fans-Instructor', 'Agilando-Instructor', 'staatl. gepr. Gymnastiklehrerin', 'Kanga-Trainerin'],
      bio: 'Tabea ist spezialisiert auf Kindertanz und Kanga. Sie bringt Bewegung und Freude zusammen, von den Minis bis zur Kanga-Gruppe.',
      variant: 'teal',
    },
    {
      id: 't-3',
      name: 'Alena Jeschke',
      role: 'ADTV-Tanzlehrerin',
      qualifications: ['ADTV-Kindertanzlehrerin', 'ZUMBA-Instructor', 'Bokwa-Instructor', 'Dance-4-Fans-Instructor', 'HipHop-Instructor'],
      bio: 'Alena bringt frische Energie in jede Stunde, ob HipHop, Zumba oder Kindertanz. Mit ihr wird jeder Kurs zum Erlebnis.',
      variant: 'orange',
    },
    {
      id: 't-4',
      name: 'Annika Behm',
      role: 'ADTV-Tanzlehrerin',
      qualifications: ['Kindertanzlehrerin', 'Dance-4-Fans-Instructor', 'ZUMBA-Instructor', 'Contemporary-Instructor', 'Salsa-Instructor'],
      bio: 'Annika unterrichtet Contemporary, Salsa und Kindertanz. Ihre Stunden verbinden Technik mit viel Herzlichkeit.',
      variant: 'teal',
    },
    {
      id: 't-5',
      name: 'Finja Prien',
      role: 'ADTV-Tanzlehrerin in der Ausbildung',
      qualifications: ['ADTV-Kindertanzlehrerin'],
      bio: 'Finja ist die jüngste im Team und begeistert die Minis mit Geduld und frischen Ideen.',
      variant: 'orange',
    },
  ];
}
