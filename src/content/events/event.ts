import { TabMessage, TabMessageEvent, TabMessageResponse } from '../../common/tab-message';

export abstract class MessageEvent<T extends TabMessage, K extends TabMessageResponse[TabMessageEvent]> {
  constructor(protected readonly _message: T) {}
  abstract run(): K;
}
