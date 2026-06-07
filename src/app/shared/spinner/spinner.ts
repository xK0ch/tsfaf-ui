import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Wiederverwendbarer Lade-Indikator: drei pulsierende Punkte in der
 * Primary-Farbe plus generischer Begleittext. Wird seitenuebergreifend
 * fuer alle "Daten werden vom Backend geholt"-Zustaende eingesetzt,
 * damit das Ladeverhalten ueberall einheitlich aussieht.
 *
 * A11y: das aeussere <div> ist `role="status"` mit `aria-live="polite"`,
 * damit Screenreader die Statusaenderung mitbekommen. Die Punkte selbst
 * sind `aria-hidden`, weil sie rein dekorativ sind.
 *
 * Beispiele:
 *   <app-spinner />                        Default: zeigt "Wird geladen…"
 *   <app-spinner label="Kurse laden..." /> Eigener Text
 *   <app-spinner label="" />               Nur die Punkte, kein Text
 */
@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Spinner {
  readonly label = input<string>('Wird geladen…');
}
