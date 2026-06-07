import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { Seo } from './seo';

/**
 * Angular-TitleStrategy, die bei jeder Navigation den Seo-Service
 * fuettert: Title kommt aus dem `title`-Feld der Route, Description
 * aus `data.description`. Das ersetzt die Default-TitleStrategy von
 * Angular, die nur das <title>-Element setzt.
 *
 * Provider-Registrierung in app.config.ts:
 *   { provide: TitleStrategy, useClass: SeoTitleStrategy }
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(Seo);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    const description = this.deepest(snapshot, 'description');
    const image = this.deepest(snapshot, 'image');

    this.seo.set({ title, description, image });
  }

  /**
   * Sucht den tiefsten aktivierten Route-Knoten, der `key` in seinem
   * data-Bag definiert hat, und gibt den Wert zurueck. Damit kann eine
   * Eltern-Route eine Default-Description setzen, die ein Kind ueber-
   * schreibt.
   */
  private deepest(snapshot: RouterStateSnapshot, key: string): string | undefined {
    let route: ActivatedRouteSnapshot | null = snapshot.root;
    let value: unknown = route.data[key];
    while (route.firstChild) {
      route = route.firstChild;
      if (route.data[key] !== undefined) {
        value = route.data[key];
      }
    }
    return typeof value === 'string' ? value : undefined;
  }
}
