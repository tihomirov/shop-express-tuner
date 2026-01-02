export type Typeguard<T extends InitialT, InitialT = unknown> = (obj: InitialT) => obj is T;
