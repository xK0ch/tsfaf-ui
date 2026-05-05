import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

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

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pseudoRandom(seed: number, i: number): number {
  return (((seed * 1664525 + i * 22695477 + 1013904223) >>> 0) % 100) / 100;
}

@Component({
  selector: 'app-news-cover',
  template: `
    <svg
      viewBox="0 0 800 400"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      class="news-cover-svg"
    >
      <defs>
        <radialGradient
          [id]="'news-grad-1-' + id()"
          [attr.cx]="geometry().grad1Cx + '%'"
          [attr.cy]="geometry().grad1Cy + '%'"
          r="60%"
        >
          <stop offset="0%"   [attr.stop-color]="geometry().c1" stop-opacity="0.35" />
          <stop offset="100%" [attr.stop-color]="geometry().bg" stop-opacity="0" />
        </radialGradient>
        <radialGradient
          [id]="'news-grad-2-' + id()"
          [attr.cx]="geometry().grad2Cx + '%'"
          [attr.cy]="geometry().grad2Cy + '%'"
          r="55%"
        >
          <stop offset="0%"   [attr.stop-color]="geometry().c2" stop-opacity="0.28" />
          <stop offset="100%" [attr.stop-color]="geometry().bg" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="400" [attr.fill]="geometry().bg" />
      <rect width="800" height="400" [attr.fill]="'url(#news-grad-1-' + id() + ')'" />
      <rect width="800" height="400" [attr.fill]="'url(#news-grad-2-' + id() + ')'" />
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
    .news-cover-svg { display: block; width: 100%; height: 100%; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsCover {
  readonly id = input.required<string>();
  readonly orange = input<boolean>(true);

  protected readonly geometry = computed<CoverGeometry>(() => {
    const seed = hashSeed(this.id());
    const r = (n: number): number => pseudoRandom(seed, n);
    const orange = this.orange();
    const c1 = orange ? '#DC8C50' : '#64B4C8';
    const c2 = orange ? '#64B4C8' : '#DC8C50';
    const bg = orange ? '#2A2520' : '#1A2A30';

    const path1 = `M ${-40 + r(5) * 100} ${300 + r(6) * 80} ` +
      `C ${100 + r(7) * 150} ${80 + r(8) * 150}, ${350 + r(9) * 200} ${30 + r(10) * 120}, ${600 + r(11) * 200} ${120 + r(12) * 150} ` +
      `C 750 200, 780 300, ${700 + r(13) * 100} 340 ` +
      `C ${500 + r(14) * 150} 390, 200 ${370 + r(15) * 30}, ${-40 + r(5) * 100} ${300 + r(6) * 80} Z`;

    const path2 = `M ${400 + r(17) * 300} ${-20 + r(18) * 60} ` +
      `C ${650 + r(19) * 150} ${80 + r(20) * 100}, 820 ${250 + r(21) * 100}, 780 380 ` +
      `C 750 420, ${680 + r(22) * 100} 390, ${620 + r(23) * 100} 340 ` +
      `C 540 280, ${500 + r(24) * 100} 160, ${480 + r(25) * 200} 80 ` +
      `C ${450 + r(26) * 150} 20, 380 -30, ${400 + r(17) * 300} ${-20 + r(18) * 60} Z`;

    return {
      bg,
      c1,
      c2,
      grad1Cx: 20 + r(1) * 40,
      grad1Cy: 20 + r(2) * 60,
      grad2Cx: 60 + r(3) * 35,
      grad2Cy: r(4) * 80,
      path1,
      path2,
      opacity1: 0.13 + r(16) * 0.07,
      opacity2: 0.10 + r(27) * 0.06,
    };
  });
}
