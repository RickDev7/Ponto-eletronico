import type pt from "../messages/pt.json";

type Messages = typeof pt;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}

export type MessageNamespace = keyof Messages;
