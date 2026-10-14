import { TableModel } from '../recipe/outputs';
import { ExtractResult, Recipe } from '../recipe/types';
import { isEnum, isNonArrayObject } from '../utils/is-it';

export enum TabMessageEvent {
  ExtractRecipe = 'OLA_EXTRACT_RECIPE',
  PinTable = 'OLA_PIN_TABLE',
  StartPicker = 'OLA_START_PICKER',
}

// Reads the page with a recipe
export type ExtractRecipe = Readonly<{
  event: TabMessageEvent.ExtractRecipe;
  recipe: Recipe;
}>;

// Shows a table in a floating window on the page
export type PinTable = Readonly<{
  event: TabMessageEvent.PinTable;
  title: string;
  table: TableModel;
}>;

// Starts the interactive field picker for a recipe stored in the extension
export type StartPicker = Readonly<{
  event: TabMessageEvent.StartPicker;
  recipeId: string;
}>;

export type TabMessage = ExtractRecipe | PinTable | StartPicker;

export type TabMessageResponse = {
  [TabMessageEvent.ExtractRecipe]: ExtractResult;
  [TabMessageEvent.PinTable]: void;
  [TabMessageEvent.StartPicker]: void;
};

const isTabMessageEvent = isEnum(TabMessageEvent);

// Every extension message reaches every listener, so only handle messages that are ours
export const isTabMessage = (message: unknown): message is TabMessage =>
  isNonArrayObject(message) && isTabMessageEvent(message.event);
