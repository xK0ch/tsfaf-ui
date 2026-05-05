import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

type LegalTab = 'impressum' | 'datenschutz';

interface TabDef {
  readonly id: LegalTab;
  readonly label: string;
}

@Component({
  selector: 'app-impressum',
  imports: [RouterLink],
  templateUrl: './impressum.html',
  styleUrl: './impressum.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Impressum {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly tabs: readonly TabDef[] = [
    { id: 'impressum',   label: 'Impressum' },
    { id: 'datenschutz', label: 'Datenschutz' },
  ];

  protected readonly activeTab = toSignal(
    this.route.queryParamMap.pipe(
      map(p => (p.get('tab') === 'datenschutz' ? 'datenschutz' : 'impressum') as LegalTab),
    ),
    { initialValue: 'impressum' as LegalTab },
  );

  protected selectTab(tab: LegalTab): void {
    this.router.navigate([], {
      queryParams: { tab: tab === 'impressum' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
