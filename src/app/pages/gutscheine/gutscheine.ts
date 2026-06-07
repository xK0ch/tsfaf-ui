import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { CotasApiService } from '../../core/services/cotas-api.service';
import { CotasVoucher } from '../../core/models/cotas.models';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-gutscheine',
  imports: [RouterLink, Spinner],
  templateUrl: './gutscheine.html',
  styleUrl: './gutscheine.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gutscheine {
  private readonly api = inject(CotasApiService);

  /**
   * Voucher-Vorlagen direkt vom Backend. Initial-Value null fuer den
   * Loading-State im Template. Bei API-Fehler bleibt der Wert null und
   * der User sieht den Fehler-Empty-State.
   */
  protected readonly vouchers = toSignal<readonly CotasVoucher[] | null>(
    this.api.listVouchers(),
    { initialValue: null },
  );
}
