export type Childs = ReadonlyArray<
| ComponentFactory<Component>
| NativeElementFactory<keyof HTMLElementTagNameMap, HTMLElementTagNameMap[keyof HTMLElementTagNameMap]>
| TextNodeFactory
| undefined
>;

export type RenderItem = Component | HTMLElement | Text | undefined;

export type Component = {
	childs(): Childs;
	dispose?(): void;
};

export type RenderItemGetter = Readonly<{
	getRenderItem(): RenderItem;
}>;

export type ComponentFactory<T extends Component> = RenderItemGetter & Readonly<{
	props(props: Partial<T>): ComponentFactory<T>;
	computedProps(props: (component: T) => Partial<T>): ComponentFactory<T>;
}>;

export type NativeElementFactory<K extends keyof HTMLElementTagNameMap, E = HTMLElementTagNameMap[K]> = RenderItemGetter & Readonly<{
	props(props: Partial<E>): NativeElementFactory<K, E>;
	computedProps(props: (element: E) => Partial<E>): NativeElementFactory<K, E>;
	style(style: Partial<CSSStyleDeclaration>): NativeElementFactory<K, E>;
	computedStyle(style: (element: E) => Partial<CSSStyleDeclaration>): NativeElementFactory<K, E>;
	childs(childs: Childs): NativeElementFactory<K, E>;
	computedChilds(childs: (element: E, prevChilds?: Childs) => Childs): NativeElementFactory<K, E>;
}>;

export type TextNodeFactory = RenderItemGetter & Readonly<{
	computedContent(content: (element: Text) => string): TextNodeFactory;
}>;
