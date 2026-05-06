import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { seededRand } from '../galerie-data';

interface CoverGeometry {
  readonly bg: string;
  readonly c1: string;
  readonly c2: string;
  readonly grad1Cx: number;
  readonly grad1Cy: number;
  readonly grad2Cx: number;
  readonly grad2Cy: number;
  readonly path1: string;
  readonly path2: string;
  readonly opacity1: number;
  readonly opacity2: number;
}

@Component({
  selector: 'app-album-cover',
  template: `
    <svg
      viewBox="0 0 300 300"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      class="album-cover-svg"
    >
      <defs>
        <radialGradient
          [id]="'album-grad-1-' + seed()"
          [attr.cx]="geometry().grad1Cx + '%'"
          [attr.cy]="geometry().grad1Cy + '%'"
          r="65%"
        >
          <stop offset="0%"   [attr.stop-color]="geometry().c1" stop-opacity="0.35" />
          <stop offset="100%" [attr.stop-color]="geometry().bg" stop-opacity="0" />
        </radialGradient>
        <radialGradient
          [id]="'album-grad-2-' + seed()"
          [attr.cx]="geometry().grad2Cx + '%'"
          [attr.cy]="geometry().grad2Cy + '%'"
          r="55%"
        >
          <stop offset="0%"   [attr.stop-color]="geometry().c2" stop-opacity="0.25" />
          <stop offset="100%" [attr.stop-color]="geometry().bg" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="300" [attr.fill]="geometry().bg" />
      <rect width="300" height="300" [attr.fill]="'url(#album-grad-1-' + seed() + ')'" />
      <rect width="300" height="300" [attr.fill]="'url(#album-grad-2-' + seed() + ')'" />
      <path
        [attr.d]="geometry().path1"
        [attr.fill]="geometry().c1"
        [attr.opacity]="geometry().opacity1"
      />
      <path
        [attr.d]="geometry().path2"
        [attr.fill]="geometry().c2"
        [attr.opacity]="geometry().opacity2"
      />
    </svg>
  `,
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    .album-cover-svg { display: block; width: 100%; height: 100%; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumCover {
  readonly seed = input.required<number>();

  protected readonly geometry = computed<CoverGeometry>(() => {
    const seed = this.seed();
    const r = (n: number): number => (seededRand(seed, n) % 100) / 100;
    const orange = r(1) > 0.5;
    const c1 = orange ? '#DC8C50' : '#64B4C8';
    const c2 = orange ? '#64B4C8' : '#DC8C50';
    const bg = orange ? '#2A2520' : '#1E2E32';

    const size = 300;
    const path1 =
      `M ${Math.round(r(6) * size * 0.3)} ${Math.round(size * 0.7 + r(7) * size * 0.2)} ` +
      `C ${Math.round(size * 0.1 + r(8) * size * 0.3)} ${Math.round(size * 0.1 + r(9) * size * 0.3)}, ` +
      `${Math.round(size * 0.5 + r(10) * size * 0.4)} ${Math.round(r(11) * size * 0.3)}, ` +
      `${Math.round(size * 0.7 + r(12) * size * 0.3)} ${Math.round(size * 0.2 + r(13) * size * 0.4)} ` +
      `C ${Math.round(size * 0.9)} ${Math.round(size * 0.4)}, ` +
      `${Math.round(size * 0.85)} ${Math.round(size * 0.6)}, ` +
      `${Math.round(size * 0.7)} ${Math.round(size * 0.65)} ` +
      `C ${Math.round(size * 0.4)} ${Math.round(size * 0.75)}, ` +
      `${Math.round(size * 0.1)} ${Math.round(size * 0.7)}, ` +
      `${Math.round(r(14) * size * 0.3)} ${Math.round(size * 0.7 + r(15) * size * 0.2)} Z`;

    const path2 =
      `M ${Math.round(size * 0.6 + r(17) * size * 0.3)} ${Math.round(r(18) * size * 0.2)} ` +
      `C ${Math.round(size * 0.8 + r(19) * size * 0.2)} ${Math.round(size * 0.3 + r(20) * size * 0.2)}, ` +
      `${Math.round(size * 0.9)} ${Math.round(size * 0.6 + r(21) * size * 0.2)}, ` +
      `${Math.round(size * 0.7 + r(22) * size * 0.2)} ${Math.round(size * 0.8 + r(23) * size * 0.15)} ` +
      `C ${Math.round(size * 0.5)} ${Math.round(size * 0.95)}, ` +
      `${Math.round(size * 0.7)} ${Math.round(size * 0.7)}, ` +
      `${Math.round(size * 0.6 + r(24) * size * 0.3)} ${Math.round(r(25) * size * 0.2)} Z`;

    return {
      bg,
      c1,
      c2,
      grad1Cx: Math.round(r(2) * 100),
      grad1Cy: Math.round(r(3) * 100),
      grad2Cx: Math.round(100 - r(4) * 60),
      grad2Cy: Math.round(r(5) * 100),
      path1,
      path2,
      opacity1: 0.12 + r(16) * 0.08,
      opacity2: 0.10 + r(26) * 0.07,
    };
  });
}
