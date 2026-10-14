import { Recipe } from './types';

const escapeRegExp = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

// `*` matches any characters; the pattern must match the whole URL, ignoring the case
export function matchesUrl(pattern: string, url: string): boolean {
  const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`, 'i');
  return regex.test(url);
}

export const findRecipes = (recipes: ReadonlyArray<Recipe>, url: string): Recipe[] =>
  recipes.filter(recipe => recipe.match.some(pattern => matchesUrl(pattern, url)));

// A pattern for "this kind of page": same site, any path
export function suggestMatchPattern(url: string): string {
  try {
    return `${new URL(url).origin}/*`;
  } catch {
    return '*';
  }
}
