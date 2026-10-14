import { isTabMessage, TabMessageEvent } from '../common/tab-message';

test('isTabMessage accepts only our messages', () => {
  expect(isTabMessage({ event: TabMessageEvent.StartPicker, recipeId: 'x' })).toBe(true);
  expect(isTabMessage({ event: 'SOMETHING_ELSE' })).toBe(false);
  expect(isTabMessage('OLA_START_PICKER')).toBe(false);
  expect(isTabMessage(undefined)).toBe(false);
});
