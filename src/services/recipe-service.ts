import browser from 'webextension-polyfill';
import { createShopExpressRecipe } from '../recipe/builtin-shop-express';
import { readLegacySettings } from '../recipe/legacy-settings';
import { normalizeRecipes } from '../recipe/normalize';
import { ExtractResult, Recipe } from '../recipe/types';
import { isNonArrayObject } from '../utils/is-it';

const RECIPES_KEY = 'recipes';
const LAST_RESULTS_KEY = 'lastResults';
const LEGACY_SETTINGS_KEY = 'settings';

export class RecipeService {
  // The first run creates the built-in recipe, keeping what the old options page had
  static async list(): Promise<Recipe[]> {
    const stored = await browser.storage.local.get(RECIPES_KEY);
    if (stored[RECIPES_KEY] !== undefined) {
      return normalizeRecipes(stored[RECIPES_KEY]);
    }

    const legacy = await browser.storage.sync.get(LEGACY_SETTINGS_KEY);
    const recipes = [createShopExpressRecipe(readLegacySettings(legacy[LEGACY_SETTINGS_KEY]))];
    await browser.storage.local.set({ [RECIPES_KEY]: recipes });
    return recipes;
  }

  static async get(id: string): Promise<Recipe | undefined> {
    return (await RecipeService.list()).find(recipe => recipe.id === id);
  }

  static async saveAll(recipes: ReadonlyArray<Recipe>): Promise<void> {
    await browser.storage.local.set({ [RECIPES_KEY]: recipes });
  }

  // Adds the recipe or replaces the one with the same id
  static async save(recipe: Recipe): Promise<void> {
    const recipes = await RecipeService.list();
    const exists = recipes.some(({ id }) => id === recipe.id);
    await RecipeService.saveAll(exists ? recipes.map(item => (item.id === recipe.id ? recipe : item)) : [...recipes, recipe]);
  }

  static async remove(id: string): Promise<void> {
    await RecipeService.saveAll((await RecipeService.list()).filter(recipe => recipe.id !== id));
  }

  // Parses a JSON file with one recipe or a list of them; throws on a malformed file
  static parseImport(json: string): Recipe[] {
    const parsed: unknown = JSON.parse(json);
    const recipes = Array.isArray(parsed) ? normalizeRecipes(parsed) : normalizeRecipes([parsed]);
    if (recipes.length === 0) {
      throw new Error('The file has no recipes');
    }
    return recipes;
  }

  // Calls the listener with fresh recipes whenever they change; returns an unsubscribe function
  static subscribe(listener: (recipes: Recipe[]) => void): () => void {
    const onChanged = (changes: Record<string, browser.Storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && RECIPES_KEY in changes) {
        listener(normalizeRecipes(changes[RECIPES_KEY].newValue));
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }

  // The last result read with a recipe, to preview its outputs in the editor
  static async saveLastResult(recipeId: string, result: ExtractResult): Promise<void> {
    const stored = await browser.storage.local.get(LAST_RESULTS_KEY);
    const all = isNonArrayObject(stored[LAST_RESULTS_KEY]) ? stored[LAST_RESULTS_KEY] : {};
    await browser.storage.local.set({ [LAST_RESULTS_KEY]: { ...all, [recipeId]: result } });
  }

  static async getLastResult(recipeId: string): Promise<ExtractResult | undefined> {
    const stored = await browser.storage.local.get(LAST_RESULTS_KEY);
    const all = stored[LAST_RESULTS_KEY];
    const result = isNonArrayObject(all) ? all[recipeId] : undefined;
    return isNonArrayObject(result) && isNonArrayObject(result.values) ? (result as ExtractResult) : undefined;
  }
}
