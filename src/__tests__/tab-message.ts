import { isTabMessage, TabMessageEvent } from '../common/tab-message';

test('isTabMessage accepts only our messages', () => {
  expect(isTabMessage({ event: TabMessageEvent.ParseOrder })).toBe(true);
  expect(isTabMessage({ event: 'SOMETHING_ELSE' })).toBe(false);
  expect(isTabMessage('OLA_PARSE_ORDER')).toBe(false);
  expect(isTabMessage(undefined)).toBe(false);
});
