/**
 * Typen fuer die Joomla Web Services API (v1).
 *
 * Joomla 5 nutzt einen JSON:API-aehnlichen Stil:
 *   { data: [{ type, id, attributes, relationships }], links?, meta? }
 *
 * Wir definieren generische Wrapper plus konkrete Article-/Category-Modelle,
 * und einen Helper der die rohen Response-Resources in ein flacheres
 * Frontend-Modell (JoomlaArticle) mapped.
 */

// ----- Generische Wrapper -----

export interface JoomlaResourceRef {
  type: string;
  id: string;
}

export interface JoomlaRelationship {
  // Mutable Array damit Array.isArray das Type-Narrowing korrekt anwendet.
  data: JoomlaResourceRef | JoomlaResourceRef[] | null;
}

export interface JoomlaResource<TAttr> {
  type: string;
  id: string;
  attributes: TAttr;
  relationships?: Record<string, JoomlaRelationship | undefined>;
}

export interface JoomlaResponse<T> {
  data: T;
  links?: Record<string, string>;
  meta?: { 'total-pages'?: number; [key: string]: unknown };
}

// ----- Article -----

/**
 * Rohe Attribute eines Joomla-Articles aus /v1/content/articles.
 * Felder verifiziert via curl gegen die Live-Joomla.
 */
export interface JoomlaArticleAttributes {
  id: number;
  asset_id?: number;
  title: string;
  alias: string;
  state: number; // 1 = veroeffentlicht, 0 = unpublished, -2 = papierkorb
  access: number;
  created: string;
  modified: string;
  created_by?: number;
  created_by_alias?: string;
  publish_up: string | null;
  publish_down: string | null;
  featured: number;
  language: string;
  hits?: number;
  note?: string;
  /** Joomla 5 packt introtext + fulltext zusammen in 'text'. */
  text: string;
  images?: {
    image_intro?: string;
    image_intro_alt?: string;
    image_intro_caption?: string;
    image_fulltext?: string;
    image_fulltext_alt?: string;
    image_fulltext_caption?: string;
    float_intro?: string;
    float_fulltext?: string;
    [key: string]: unknown;
  };
  metakey?: string;
  metadesc?: string;
  metadata?: { robots?: string; author?: string; rights?: string; [key: string]: unknown };
  version?: number;
  typeAlias?: string;
  tags?: readonly unknown[];
  [key: string]: unknown;
}

/**
 * Flach gemapptes Article-Modell fuer die Components. ID kommt aus
 * resource.id, categoryId aus relationships.
 */
export interface JoomlaArticle {
  id: string;
  title: string;
  alias: string;
  state: number;
  text: string;
  created: string;
  modified: string;
  publish_up: string | null;
  publish_down: string | null;
  language: string;
  featured: number;
  hits?: number;
  images: NonNullable<JoomlaArticleAttributes['images']>;
  categoryId: string;
  tagIds: readonly string[];
  /** Restliche unbekannte Attribute durchgereicht. */
  [key: string]: unknown;
}

// ----- Category -----

export interface JoomlaCategoryAttributes {
  id: number;
  title: string;
  alias: string;
  parent_id?: number;
  published: number;
  description?: string;
  [key: string]: unknown;
}

export interface JoomlaCategory {
  id: string;
  title: string;
  alias: string;
  parent_id?: string;
  published: number;
  description?: string;
  [key: string]: unknown;
}

// ----- Mapper -----

export function mapArticle(resource: JoomlaResource<JoomlaArticleAttributes>): JoomlaArticle {
  const cat = resource.relationships?.['category']?.data;
  const tagsRel = resource.relationships?.['tags']?.data;
  return {
    ...resource.attributes,
    id: resource.id,
    images: resource.attributes.images ?? {},
    categoryId: cat && !Array.isArray(cat) ? cat.id : '',
    tagIds: Array.isArray(tagsRel)
      ? tagsRel.filter((t): t is JoomlaResourceRef => !!t && typeof t === 'object').map(t => t.id)
      : [],
  };
}

export function mapCategory(resource: JoomlaResource<JoomlaCategoryAttributes>): JoomlaCategory {
  // Joomla 5 liefert parent_id direkt in attributes (Integer). Manche
  // Installationen exponieren das zusaetzlich unter relationships.parent.
  // Wir lesen beides und nehmen Relationship-Wert vor (string), sonst
  // Attribute-Wert (Integer -> String).
  const parentRel = resource.relationships?.['parent']?.data;
  const parentFromRel = parentRel && !Array.isArray(parentRel) ? parentRel.id : undefined;
  const parentFromAttr =
    resource.attributes.parent_id != null ? String(resource.attributes.parent_id) : undefined;
  return {
    ...resource.attributes,
    id: resource.id,
    parent_id: parentFromRel ?? parentFromAttr,
  };
}
