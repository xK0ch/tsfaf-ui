import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TeamCard } from './team-card/team-card';
import { TeamStore, type TeamMember } from './ueber-uns-data';

export type ColorVariant = 'orange' | 'teal';

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
  private readonly teamStore = inject(TeamStore);

  /**
   * Team-Mitglieder aus Joomla (Kategorie "Team", id 13). Sortiert per
   * Joomla-Ordering. Im Loading wird ein kleiner Hinweis gezeigt.
   */
  protected readonly team = computed<readonly TeamMember[]>(
    () => this.teamStore.members() ?? [],
  );
  protected readonly teamLoading = this.teamStore.loading;
  protected readonly teamEmpty = computed(
    () => !this.teamLoading() && this.team().length === 0,
  );

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
    { icon: '📍', label: 'Neumünster',     desc: '950 m² in der Georg-Fuhg-Straße 6: moderne Säle, Foyer mit Bar, Licht- und Soundtechnik auf dem neuesten Stand.',                              orange: false },
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

}
