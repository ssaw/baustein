interface EmittableEvent {
    target?: EventTarget | Component;
    [key: string]: any;
}

interface BausteinEvent {
    type: string;
    target: EventTarget | Component;
    [key: string]: any;
}

interface CustomEvent {
    customEvent: true;
    stopPropagation(): void;
    preventDefault(): void;
    propagationStopped: boolean;
    defaultPrevented: boolean;
}

type EventHandler = (
    event: Event | (BausteinEvent & CustomEvent),
    target: Component | HTMLElement
) => void;

export class Component<O = {}, C = {}, E extends HTMLElement = HTMLDivElement> {
    constructor(options: Partial<O>);
    constructor(element: E, options: Partial<O>);

    options: O;
    defaultOptions: Partial<O> | (() => Partial<O>);

    el: E;
    /**
     * Convenience for accessing this components root element wrapped
     * in whatever `domWrapper` returns.
     */
    $el: unknown;

    name: string;
    tagName: E["tagName"];

    /**
     * If provided this will be used to render the component when `render()` is called. It should
     * be a function that accepts a single argument, which will be the return value of `getRenderContext()`.
     * It must return a valid HTML string and represent the entire component, including the root node.
     */
    template?: (context: C) => string;

    /**
     * The init function will be called when the Component is created.
     * This maybe be through the parsing of DOM or through directly creating the component.
     */
    init(): this;

    /**
     * Registers an event that this component would like to listen to.
     */
    registerEvent(event: string, selector: string, handler: EventHandler): this;
    registerEvent(event: string, handler: EventHandler): this;

    /**
     * Release an event or all events from this component.
     * @example
     *  releaseEvent('click', '.image-thumbnail, this._onImageThumbnailClick);
     *  // releases the specific click event handler on an object
     *
     * @example
     *  releaseEvent('click', '.image-thumbnail');
     *  // release all click events on the object
     *
     * @example
     *  releaseEvent('click'); // releases all click events on the component
     *
     * @param {String} event - the event to release
     * @param {String} [selector] - the selector of the object to release the event
     * @param {Function} [handler] - the handler to release off the object
     */
    releaseEvent(
        event: string,
        selector?: string,
        handler?: EventHandler
    ): void;

    /**
     * Set a global event handler. This is useful when you
     * need to listen to events that happen outside this component.
     */
    setGlobalHandler(event: string, fn: EventHandler): this;

    /**
     * Release a global event handler that was previously set with setGlobalHandler().
     */
    releaseGlobalHandler(event: string, fn: EventHandler): this;

    /**
     * Releases all global handles that this component has registered using `setGlobalHandler`.
     */
    releaseAllGlobalHandlers(): void;

    /**
     * Sets up any events required on the component, called during component initialisation.
     * @example
     *  setupEvents: function(add) {
     *      add('click', '.image-thumbnail', this._onImageThumbnailClick);
     *      add('mouseover', '.image', this._onImageMouseOverClick);
     *  }
     * @param add - use this function to add any events to the component
     */
    setupEvents(foo: this["registerEvent"]): void;

    /**
     * Renders the component using `template`. This method performs a destructive render e.g. all
     * child components will first be destroyed.
     */
    render(): this;

    /**
     * Sets all the values in `context` into the components render context. If this results in any
     * changes to the context `render()` will be called.
     */
    setRenderContext(context: Partial<C>): void;

    /**
     * Replaces the current render context with `context`. If this results in a different render
     * context then `render()` will be called.
     */
    replaceRenderContext(context: C): void;

    /**
     * Returns a clone of the current render context.
     */
    getRenderContext(): C;

    /**
     * Called by the constructor to get the initial render context.
     */
    getInitialRenderContext(): C;

    /**
     * Updates this components options. If calling this method results in the options changing then
     * `onOptionsChanged` will be called with the previous options.
     */
    updateOptions(options: O): this;

    /**
     * Called when options are changed via a call to `updateOptions`.
     */
    onOptionsChange(previousOptions: O): void;

    /**
     * Emits an event that parent Components can listen to.
     * @param name The name of the event to emit
     * @param data Event data
     */
    emit(name: string, data?: EmittableEvent): EmittableEvent;

    /**
     * Inserts this component before another element.
     * @param el the element to go before
     */
    insertBefore(el: HTMLElement | Component): this;

    /**
     * Inserts this component after another element.
     * @param el the element to go after
     */
    insertAfter(el: HTMLElement | Component): this;

    /**
     * Appends this Component to an element.
     */
    appendTo(el: HTMLElement | Component): this;

    /**
     * Called after the Component is inserted into the DOM.
     */
    onInsert(): void;

    /**
     * Removes this component from the DOM.
     */
    remove(): this;

    /**
     * Called after this Component is removed from the DOM.
     */
    onRemove(): void;

    /**
     * Removes this Component from the DOM and deletes the instance from the instances pool.
     * Null is returned for convenience so it is easy to get rid of references to a Component.
     *    this.component = this.component.destroy();
     */
    destroy(): null;

    /**
     * In the case that this Component is created directly by invoking the constructor with
     * no element this method will be called to create the root element.
     */
    createRootElement(): E;

    /**
     * Convenience method for performing querySelector within
     * the context of this Component.
     * Uses domQuery.
     */
    find(selector: string): unknown;

    /**
     * Returns the first component with 'name' within this Component or null.
     */
    findComponent(name: string): Component | null;

    /**
     * Returns all components with 'name' within this component.
     * If no components exist with this name an empty array will be returned.
     */
    findComponents(name: string): Component[];

    /**
     * Given an array of Component instances invokes 'method' on each one.
     * Any additional arguments are passed to the method.
     */
    invoke(
        components: Component[] | Component,
        method: string,
        ...args: any[]
    ): this;

    /**
     * true if the component is currently destroying itself.
     */
    isDestroying(): boolean;

    /**
     * true if the component has been destroyed.
     */
    isDestroyed(): boolean;

    /**
     * true if the component is attached to the DOM.
     */
    isAttached(): boolean;

    /**
     * rue if the component is detached from the DOM.
     */
    isDetached(): boolean;
}

/**
 * Registers a new Component.
 * @param name
 * @param impl The implementation methods / properties.
 */
export function register<
    I extends Partial<Component<O, C, E>>,
    O = {},
    C = {},
    E extends HTMLElement = HTMLDivElement
>(name: string, impl: I): Component & I;

/**
 * Un-registers a Component class and destroys any existing instances.
 */
export function unregister(name: string): void;

/**
 * Returns the Component instance for the passed element or null.
 * If a component instance has already been created for this element
 * then it is returned, if not a new instance of the correct Component is created.
 */
export function fromElement(el: HTMLElement): Component | null;

/**
 * Returns true if component is an instance of Component.
 */
export function isComponent(component: any): component is Component;

/**
 * Handles all events - both standard DOM events and custom Component events.
 *
 * Finds all component instances that contain the 'target' and adds a job to the `handleEventsQueue` for each one.
 *
 * If the event is a DOM event then the event target is the 'target' property of the event.
 * If the event is a custom Component event then the target is the component that emitted the event.
 */
export function handleEvent(event: BausteinEvent | Event): void;

/**
 * Parses the given element or the root element and creates Component instances.
 * @param node If not provided then the <body> will be parsed.
 * @param ignoreRootNode If `true` then the root not will not be parsed or returned. Default `false`
 */
export function parse(
    node?: HTMLElement,
    ignoreRootNode?: boolean
): Component<any, any, HTMLElement>[];

type DOMQuery = (el: HTMLElement, selector: string) => unknown;
type DOMWrapper = (els: HTMLElement[] | NodeListOf<HTMLElement>) => unknown;

/**
 * Initialises the components library by parsing the DOM and binding events.
 * @param options.domQuery A custom function to use to make DOM queries.
 * @param options.domWrapper A custom function to use to wrap the results of DOM queries.
 */
export function init(options: {
    domQuery?: DOMQuery;
    domWrapper?: DOMWrapper;
}): void;

/**
 * Opposite of `init`. Destroys all component instances and un-registers all components.
 * Resets the `domQuery` and `domWrapper` functions to their defaults.
 */
export function reset(): void;

export function getInstanceOf(name: string): Component | undefined;
export function getInstancesOf(name: string): Component[];

export function destroy(name: string): void;

declare const _default: {
    fromElement: typeof fromElement;
    isComponent: typeof isComponent;
    handleEvent: typeof handleEvent;
    parse: typeof parse;
    register: typeof register;
    unregister: typeof unregister;
    init: typeof init;
    reset: typeof reset;
    getInstanceOf: typeof getInstanceOf;
    getInstancesOf: typeof getInstancesOf;
    destroy: typeof destroy;
    Component: typeof Component;
};
export default _default;
