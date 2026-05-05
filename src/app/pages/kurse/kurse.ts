import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { AnmeldeModal } from './anmelde-modal/anmelde-modal';

export type CourseStatus = 'open' | 'fewSeats' | 'full';

export type TargetGroupId =
  | 'erwachsene'
  | 'jugendliche'
  | 'kinder'
  | 'senioren'
  | 'discofox'
  | 'kanga'
  | 'zumba';

export interface Course {
  readonly id: string;
  readonly targetGroup: TargetGroupId;
  readonly category: string;
  readonly name: string;
  readonly description: string;
  readonly weekday: string;
  readonly startTime: string;
  readonly duration: number;
  readonly startDate: string;
  readonly instructor: string;
  readonly capacity: number;
  readonly available: number;
  readonly price: number;
  readonly priceLabel: string;
  readonly status: CourseStatus;
}

interface TargetGroup {
  readonly id: TargetGroupId;
  readonly label: string;
  readonly icon: string;
}

interface StatusInfo {
  readonly label: string;
  readonly cls: string;
  readonly accent: string;
}

const ALL_CATEGORIES = 'Alle';

const COURSES: readonly Course[] = [
  { id: 'c-001', targetGroup: 'erwachsene',  category: 'Gesellschaftstanz',     name: 'Welttanzprogramm Teil 1', description: 'Die ersten Schritte in den wichtigsten Gesellschaftstänzen.',         weekday: 'Mittwoch',   startTime: '19:30', duration: 60, startDate: '03.09.2025', instructor: 'Tabea Höftmann',  capacity: 20, available:  8, price: 96, priceLabel: 'pro Person, 8 Termine',  status: 'open'     },
  { id: 'c-002', targetGroup: 'erwachsene',  category: 'Discofox',              name: 'Discofox Grundkurs',     description: 'Action und Spaß zu zweit.',                                            weekday: 'Donnerstag', startTime: '20:30', duration: 60, startDate: '04.09.2025', instructor: 'Uwe Höftmann',    capacity: 16, available:  2, price: 96, priceLabel: 'pro Person, 8 Termine',  status: 'fewSeats' },
  { id: 'c-003', targetGroup: 'erwachsene',  category: 'Gesellschaftstanz',     name: 'Welttanzprogramm Teil 2', description: 'Aufbaukurs für Fortgeschrittene: mehr Tänze, mehr Technik.',          weekday: 'Dienstag',   startTime: '20:00', duration: 60, startDate: '02.09.2025', instructor: 'Uwe Höftmann',    capacity: 16, available:  0, price: 96, priceLabel: 'pro Person, 8 Termine',  status: 'full'     },
  { id: 'c-004', targetGroup: 'erwachsene',  category: 'Zumba',                 name: 'Zumba Fitness',           description: 'Lateinamerikanische Rhythmen und Fitness im Taktschritt.',            weekday: 'Montag',     startTime: '19:00', duration: 60, startDate: '01.09.2025', instructor: 'Alena Jeschke',   capacity: 20, available: 14, price: 60, priceLabel: 'pro Person, 10 Termine', status: 'open'     },
  { id: 'c-005', targetGroup: 'jugendliche', category: 'Hip Hop',               name: 'HipHop Level 1',          description: 'Basicsteps und coole Moves für Einsteiger ab 13 Jahre.',              weekday: 'Dienstag',   startTime: '17:00', duration: 60, startDate: '02.09.2025', instructor: 'Alena Jeschke',   capacity: 20, available:  0, price: 80, priceLabel: 'pro Person, 10 Termine', status: 'full'     },
  { id: 'c-006', targetGroup: 'jugendliche', category: 'Hip Hop',               name: 'HipHop Level 2',          description: 'Für alle, die Level 1 beherrschen und weitermachen wollen.',          weekday: 'Donnerstag', startTime: '17:00', duration: 60, startDate: '04.09.2025', instructor: 'Alena Jeschke',   capacity: 16, available:  5, price: 80, priceLabel: 'pro Person, 10 Termine', status: 'open'     },
  { id: 'c-007', targetGroup: 'jugendliche', category: 'Videoclip-Dancing',     name: 'Videoclip-Dancing',       description: 'Aktuelle Choreografien aus Musikvideos nachgetanzt.',                 weekday: 'Mittwoch',   startTime: '17:30', duration: 60, startDate: '03.09.2025', instructor: 'Annika Behm',     capacity: 18, available:  7, price: 80, priceLabel: 'pro Person, 10 Termine', status: 'open'     },
  { id: 'c-008', targetGroup: 'kinder',      category: 'Kindertanz',            name: 'Minis (3 & 4 Jahre)',     description: 'Erste Tanzerfahrungen mit viel Spiel und Bewegung.',                  weekday: 'Montag',     startTime: '16:00', duration: 45, startDate: '01.09.2025', instructor: 'Finja Prien',     capacity: 14, available:  4, price: 60, priceLabel: 'pro Kind, 10 Termine',   status: 'open'     },
  { id: 'c-009', targetGroup: 'kinder',      category: 'Kindertanz',            name: 'Kindertanz (5 bis 7 Jahre)', description: 'Rhythmus, Koordination und Teamgeist für die Kleinen.',           weekday: 'Dienstag',   startTime: '16:00', duration: 60, startDate: '02.09.2025', instructor: 'Finja Prien',     capacity: 14, available:  2, price: 60, priceLabel: 'pro Kind, 10 Termine',   status: 'fewSeats' },
  { id: 'c-010', targetGroup: 'kinder',      category: 'Kindertanz',            name: 'Kindertanz (8 bis 12 Jahre)', description: 'Gesellschaftstanz und Freestyle für Schulkinder.',                weekday: 'Mittwoch',   startTime: '16:00', duration: 60, startDate: '03.09.2025', instructor: 'Tabea Höftmann',  capacity: 16, available:  9, price: 60, priceLabel: 'pro Kind, 10 Termine',   status: 'open'     },
  { id: 'c-011', targetGroup: 'senioren',    category: 'Zumba Gold',            name: 'Zumba Gold',              description: 'Sanfte Fitness und Freude an der Bewegung für Best Ager.',            weekday: 'Freitag',    startTime: '10:00', duration: 60, startDate: '05.09.2025', instructor: 'Tabea Höftmann',  capacity: 18, available: 11, price: 60, priceLabel: 'pro Person, 10 Termine', status: 'open'     },
  { id: 'c-012', targetGroup: 'senioren',    category: 'Parkinson-Tanzgruppe',  name: 'Parkinson-Tanzgruppe',    description: 'Tanz und Bewegung als Therapiebegleitung, mit viel Freude.',          weekday: 'Mittwoch',   startTime: '15:00', duration: 60, startDate: '03.09.2025', instructor: 'Annika Behm',     capacity: 15, available:  7, price:  0, priceLabel: 'Stempelkarte',           status: 'open'     },
  { id: 'c-013', targetGroup: 'kanga',       category: 'Kanga',                 name: 'Kanga',                   description: 'Fitnesstraining für Mütter, mit Baby in der Trage.',                  weekday: 'Freitag',    startTime: '10:00', duration: 60, startDate: '05.09.2025', instructor: 'Tabea Höftmann',  capacity: 12, available:  5, price: 60, priceLabel: 'pro Person, 6 Termine',  status: 'open'     },
  { id: 'c-014', targetGroup: 'zumba',       category: 'Zumba',                 name: 'Zumba Party',             description: 'Volle Energie, voller Spaß: Lateinrhythmen pur.',                     weekday: 'Donnerstag', startTime: '19:00', duration: 60, startDate: '04.09.2025', instructor: 'Alena Jeschke',   capacity: 24, available:  3, price: 60, priceLabel: 'pro Person, 10 Termine', status: 'fewSeats' },
  { id: 'c-015', targetGroup: 'discofox',    category: 'Discofox',              name: 'Discofox Aufbaukurs',     description: 'Für alle, die den Grundkurs beherrschen und weitermachen wollen.',     weekday: 'Freitag',    startTime: '19:30', duration: 60, startDate: '05.09.2025', instructor: 'Uwe Höftmann',    capacity: 14, available:  6, price: 96, priceLabel: 'pro Person, 8 Termine',  status: 'open'     },
];

const TARGET_GROUPS: readonly TargetGroup[] = [
  { id: 'erwachsene',  label: 'Erwachsene',  icon: '👫' },
  { id: 'jugendliche', label: 'Jugendliche', icon: '🎤' },
  { id: 'kinder',      label: 'Kinder',      icon: '⭐' },
  { id: 'senioren',    label: 'Senioren',    icon: '🌿' },
  { id: 'discofox',    label: 'Discofox',    icon: '🕺' },
  { id: 'kanga',       label: 'Kanga',       icon: '👶' },
  { id: 'zumba',       label: 'Zumba',       icon: '🌀' },
];

const STATUS_MAP: Readonly<Record<CourseStatus, StatusInfo>> = {
  open:     { label: 'Plätze frei',   cls: 'badge-open', accent: '#4A8A6E' },
  fewSeats: { label: 'Wenige Plätze', cls: 'badge-few',  accent: '#C77B3F' },
  full:     { label: 'Ausgebucht',    cls: 'badge-full', accent: '#A8453F' },
};

@Component({
  selector: 'app-kurse',
  imports: [AnmeldeModal],
  templateUrl: './kurse.html',
  styleUrl: './kurse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kurse {
  protected readonly targetGroups = TARGET_GROUPS;
  protected readonly statusMap = STATUS_MAP;
  protected readonly allCategoriesLabel = ALL_CATEGORIES;

  protected readonly activeGroup = signal<TargetGroupId>('erwachsene');
  protected readonly activeCategory = signal<string>(ALL_CATEGORIES);
  protected readonly bookCourse = signal<Course | null>(null);

  protected readonly groupCounts = ((): Readonly<Record<TargetGroupId, number>> => {
    const counts = {} as Record<TargetGroupId, number>;
    for (const g of TARGET_GROUPS) {
      counts[g.id] = COURSES.filter(c => c.targetGroup === g.id).length;
    }
    return counts;
  })();

  protected readonly categories = computed<readonly string[]>(() => {
    const group = this.activeGroup();
    const cats = COURSES.filter(c => c.targetGroup === group).map(c => c.category);
    return [ALL_CATEGORIES, ...Array.from(new Set(cats))];
  });

  protected readonly filtered = computed<readonly Course[]>(() => {
    const group = this.activeGroup();
    const cat = this.activeCategory();
    return COURSES.filter(c => c.targetGroup === group && (cat === ALL_CATEGORIES || c.category === cat));
  });

  protected readonly filteredCount = computed(() => this.filtered().length);

  protected selectGroup(id: TargetGroupId): void {
    this.activeGroup.set(id);
    this.activeCategory.set(ALL_CATEGORIES);
  }

  protected selectCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  protected resetCategory(): void {
    this.activeCategory.set(ALL_CATEGORIES);
  }

  protected openBooking(course: Course): void {
    if (course.status === 'full') {
      return;
    }
    this.bookCourse.set(course);
  }

  protected closeBooking(): void {
    this.bookCourse.set(null);
  }

  protected availabilityFillPercent(course: Course): number {
    if (course.status === 'full') {
      return 100;
    }
    if (course.capacity <= 0) {
      return 0;
    }
    const pct = Math.round((course.available / course.capacity) * 100);
    return 100 - pct;
  }

  protected availabilityColor(status: CourseStatus): string {
    return this.statusMap[status].accent;
  }
}
