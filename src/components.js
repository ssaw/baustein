if (typeof window === 'undefined') {
    throw new Error('components requires an environment with a window');
}

var win = window;
var doc = win.document;
var slice = [].slice;
var filter = [].filter;
var map = [].map;

/**
 * Map of event name -> handlers for that event
 * @type {Object}
 */
var globalHandlers = {};

/**
 * Map of event name -> flag indicating whether or not to use useCapture
 * @type {Object}
 */
var allEvents = {
    click: false,
    dblclick: false,
    mousedown: false,
    mouseup: false,
    mousemove: false,
    mouseleave: true,
    mouseenter: true,
    touchstart: false,
    touchmove: false,
    touchend: false,
    keyup: false,
    keydown: false,
    error: true,
    blur: true,
    focus: true,
    scroll: true,
    submit: true,
    change: true,
    resize: true,
    load: true
};

/**
 * Returns the 'inner' type of `obj`.
 * @param {*} obj
 * @returns {String}
 */
function type(obj) {
    return Object.prototype.toString.call(obj).match(/\[object (.*?)\]/)[1].toLowerCase();
}

/**
 * Returns true if `obj` is an Object.
 * @param {*} obj
 * @returns {Boolean}
 */
function isObject(obj) {
    return type(obj) === 'object';
}

/**
 * Returns true if `fn` is a function.
 * @param fn
 * @returns {Boolean}
 */
function isFunction(fn) {
    return type(fn) === 'function';
}

/**
 * Returns true if `el` is an element.
 * @param el
 * @returns {Boolean}
 */
function isElement(el) {
    return el && (el.nodeType === 1 || el.nodeType === 9);
}

/**
 * Returns true if `str` is a string.
 * @param {*} str
 * @returns {Boolean}
 */
function isString(str) {
    return type(str) === 'string';
}

/**
 * Returns `this`. Used as a placeholder method.
 * @returns {*}
 */
function noop() {
    return this;
}

/**
 * Returns a camel-cased version of `str`.
 * @param {String} str
 * @returns {String}
 */
function toCamelCase(str) {
    return str.replace(/\-(.)/g, function (a, b) {
        return b.toUpperCase();
    });
}

/**
 * Mixes all arguments after `target` into `target` and returns `target`.
 * @param {Object} target
 * @returns {Object}
 */
function extend(target) {

    slice.call(arguments, 1).forEach(function (source) {
        if (isObject(source)) {
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    target[key] = source[key];
                }
            }
        }
    });

    return target;
}

/**
 * Returns the closest element to el that matches the given selector.
 * @param {HTMLElement} el
 * @param {String} selector
 * @returns {HTMLElement|Null}
 */
function closestElement(el, selector) {

    while (el && el !== doc.body) {

        if (matches(el, selector)) {
            return el;
        }

        el = el.parentElement;
    }

    return null;
}

/**
 * Wrapper around the HTMLElement.prototype.matches
 * method to support vendor prefixed versions.
 * @param {HTMLElement} el
 * @param {String} selector
 * @returns {Boolean}
 */
function matches(el, selector) {

    var method = 'MatchesSelector';
    var matchesSelector = el['webkit' + method] ||
        el['moz' + method] ||
        el['ms' + method] ||
        el['o' + method] ||
        el.matchesSelector ||
        el.matches;

    return matchesSelector.call(el, selector);
}

/**
 * Returns the nearest Component instance for the passed element.
 * @param {HTMLElement} element
 * @returns {HTMLElement[]}
 */
function parentComponents(element) {

    var result = [];

    // Quick return for window or document
    if (element === win || element === doc) {
        return [];
    }

    while (isElement(element)) {

        if (isComponent(element)) {
            result.push(element);
        }

        element = element.parentElement;
    }

    return result;
}

/**
 * Returns the Component instance for the passed element or null.
 * If a component instance has already been created for this element
 * then it is returned, if not a new instance of the correct Component is created.
 * @param {HTMLElement} el
 */
export function fromElement(el) {

    if (!isComponent(el)) {
        return null;
    }

    return el;
}

/**
 * Given an array of Component instances invokes 'method' on each one.
 * Any additional arguments are passed to the method.
 * @param {HTMLElement[]|HTMLElement} components
 * @param {String} method
 */
function invoke(components, method) {

    var args = slice.call(arguments, 2);
    var i = 0;
    var length;

    if (isComponent(components)) {
        components = [components];
    }

    if (!components) {
        return this;
    }

    for (length = components.length; i < length; i++) {
        if (isFunction(components[i][method])) {
            components[i][method].apply(components[i], args);
        }
    }

    return this;
}

/**
 * Given an element returns an object containing all the attributes parsed as JSON.
 *
 * Runs all values through JSON.parse() so it is possible to pass
 * structured data to component instances through data-* attributes.
 * @param {HTMLElement} el
 * @returns {Object}
 */
function parseAttributes(el) {

    var result = {};
    var name;
    var value;

    for (var i = 0; i < el.attributes.length; i++) {

        name = toCamelCase(el.attributes[i].name);
        value = el.attributes[i].value;

        try {
            value = JSON.parse(value);
        }
        catch (e) {
        }

        result[name] = value;

    }

    return result;
}

/**
 * Returns true if component is an instance of Component.
 * @param el
 * @returns {boolean}
 */
export function isComponent(el) {
    return isElement(el) && !!el.getAttribute('is');
}

/**
 * Handles all events - both standard DOM events and custom Component events.
 *
 * Finds all component instances that contain the 'target' and if they have an event
 * handler for this event it is called. Components closer to the target are called first.
 *
 * If the event is a DOM event then the event target is the 'target' property of the event.
 * If the event is a custom Component event then the target is the component that emitted the event.
 *
 * @param {Event} event
 * @param {HTMLElement[]} [componentsChain] Only used internally when a chain of
 *                                          Components is already available.
 */
export function handleEvent(event, componentsChain) {

    // this will be a DOM element or a Component
    // component event objects are created in Component.prototype.emit
    var target = event.target;

    // we need to know if the target is a DOM element or a component instance
    var targetIsComponent = isComponent(target);

    // if it is a component instance we need the name
    var targetComponentName = targetIsComponent ? target.getAttribute('is') : null;

    // this will be the name of the event
    var eventName = event.type;

    var component, events, closest, selector;
    var eventType, method, handlers, i, j, length, eventsLength;

    // We now need to make sure we have the chain of components above the target,
    // There are three cases here:
    // 1. We already have a component chain (internal use)
    // 2. The target is a component, in which case we get the element from the 'el' property
    // 3. The target is a DOM element
    // The second argument passed to parentComponents tells it whether or not to include
    // in the returned array the Component instance attached to the root element. If this is
    // a component triggered event we do not want to try and find a handler on the same instance.
    if (!componentsChain) {
        componentsChain = parentComponents(
            targetIsComponent ? target.el : target
        );
    }

    for (i = 0, length = componentsChain.length; i < length; i++) {

        component = componentsChain[i];
        events = component._events;

        // if component has no events continue to next component
        if (!events) {
            continue;
        }

        for (j = 0, eventsLength = events.length; j < eventsLength; j++) {

            eventType = events[j][0];
            selector = events[j][1];
            method = events[j][2];

            // if event doesn't match then go to next component
            if (eventType !== eventName) {
                continue;
            }

            // if there is no selector just invoke the handler and move on
            if (!selector) {
                method.call(component, event);
                continue;
            }

            // if this is a component event then the
            // selector just needs to match the component name
            if (targetIsComponent) {

                // if component name matches call the handler
                if (selector === targetComponentName) {
                    method.call(component, event);
                }

            }
            else {

                // see if the selector matches the event target
                closest = closestElement(target, selector);

                // if it does then call the handler passing the matched element
                if (closest) {
                    method.call(component, event, closest);
                }

            }

        }

    }

    // Now all component events have been handled we need to handler 'global'
    // events that have been subscribed to using 'setGlobalHandler'.
    // This is supported for components that need to listen to events on the body/document/window.
    handlers = globalHandlers[eventName];

    // if there are no handlers we are done
    if (!handlers) {
        return;
    }

    // call the global handlers
    for (i = 0, length = handlers.length; i < length; i++) {
        handlers[i].fn.call(handlers[i].ctx, event, doc.body);
    }
}

/**
 * Registers a new Component.
 * @param {String|Object} name
 * @param {Object} [impl] The implementation methods / properties.
 * @returns {Function}
 */
export function register(name, impl) {

    impl = impl || {};

    var extendsTag = impl.extends || 'div';

    // get the base proto
    var htmlProto = Object.getPrototypeOf(document.createElement(extendsTag));

    // create the custom elements prototype from the base prototype
    var proto = Object.create(htmlProto);

    // copy across base methods / properties
    Object.keys(customElementBase).forEach(function (key) {
        var propDescriptor = Object.getOwnPropertyDescriptor(customElementBase, key);
        Object.defineProperty(proto, key, propDescriptor);
    });

    // copy across the implementation methods / properties
    Object.keys(impl).forEach(function (key) {
        if (key === 'extends') {
            return;
        }
        var propDescriptor = Object.getOwnPropertyDescriptor(impl, key);
        Object.defineProperty(proto, key, propDescriptor);
    });

    return document.registerElement(name, {
        prototype: proto,
        'extends': extendsTag
    });
}

/**
 * Initialises the components library by parsing the DOM and binding events.
 */
export function init() {
    var key, el;

    for (key in allEvents) {

        // special case for resize and scroll event to listen on window
        el = ['resize', 'scroll'].indexOf(key) !== -1 ? window : doc.body;

        el.addEventListener(key, handleEvent, !!allEvents[key]);
    }
}

/**
 * @param {string} name
 * @returns {Object}
 */
export function getInstanceOf(name) {
    return getInstancesOf(name)[0];
}

/**
 * @param {string} name
 * @returns {Array}
 */
export function getInstancesOf(name) {
    return slice.call(document.querySelectorAll('[is="' + name + '"]'));
}

/**
 * @param {string} name
 */
export function destroy(name) {
    getInstancesOf(name).forEach(function (instance) {
        instance.destroy();
    });

    return this;
}

var customElementBase = {

    createdCallback: function () {

        this._events = [];

        // legacy support
        this.el = this;


        // Options are built from optional default options - this can
        // be a property or a function that returns an object, the
        // element attributes, and finally any options passed to the constructor
        this.opts = extend(
            {},
            isFunction(this.defaultOptions) ? this.defaultOptions() : this.defaultOptions,
            parseAttributes(this)
        );

        this.init();
        this.setupEvents(this.registerEvent.bind(this));
        this.render();
    },

    attachedCallback: function () {
        this.onInsert();
        this.emit('inserted');
    },

    detachedCallback: function () {
        this.onRemove();
    },

    setOptions: function (options) {
        extend(this.opts, options);
        return this;
    },

    /**
     * If set to a function it will be called with the
     * component as both 'this' and as the first argument.
     */
    template: null,

    /**
     * The init function will be called when the Component is created.
     * This maybe be through the parsing of DOM or through directly creating the component.
     * @returns {HTMLElement}
     */
    init: noop,

    /**
     * Sets up any events required on the component, called during component initialisation.
     * @example
     *  setupEvents: function(add) {
     *      add('click', '.image-thumbnail', this._onImageThumbnailClick);
     *      add('mouseover', '.image', this._onImageMouseOverClick);
     *  }
     * @param {Function} add - use this function to add any events to the component
     */
    setupEvents: noop,

    /**
     * Renders the contents of the component into the root element.
     * @returns {HTMLElement}
     */
    render: function () {
        var template = this.template;
        var templateIsFunction = isFunction(template);
        var templateIsString = isString(template);

        if (templateIsFunction || templateIsString) {
            this.innerHTML = templateIsFunction ? template.call(this, this) : template;
        }

        return this;
    },

    /**
     * Emits an event that parent Components can listen to.
     * @param name The name of the event to emit
     * @param [data] Event data
     * @param [chain] Array of parent Components
     */
    emit: function (name, data, chain) {

        data = data || {};
        data.target = data.target || this;
        data.type = name;
        data.customEvent = true;

        handleEvent(data, chain);
    },

    /**
     * Inserts this component before another element.
     * @param {HTMLElement} el the element to go before
     * @returns {HTMLElement}
     */
    insertBefore: function (el) {

        el = isElement(el) ? el : null;

        if (!el) {
            return this;
        }

        var parent = el.parentElement;
        if (parent) {
            parent.insertBefore(this, el);
        }

        return this;
    },

    /**
     * Inserts this component after another element.
     * @param {HTMLElement} el the element to go after
     * @returns {HTMLElement}
     */
    insertAfter: function (el) {

        el = isElement(el) ? el : null;

        if (!el) {
            return this;
        }

        // no insertAfter, so insert before the next sibling
        // null case automatically handled
        var parent = el.parentNode;
        if (parent) {
            parent.insertBefore(this, el.nextSibling);
        }

        return this;
    },

    /**
     * Appends this Component to an element.
     * @param {HTMLElement} el
     * @returns {HTMLElement}
     */
    appendTo: function (el) {

        if (!isElement(el)) {
            return this;
        }

        el.appendChild(this);
        return this;
    },

    /**
     * Called after the Component is inserted into the DOM.
     */
    onInsert: noop,

    /**
     * Removes this component from the DOM.
     * @returns {HTMLElement}
     */
    remove: function () {

        // cannot be removed if no element or no parent element
        if (!this.parentElement) {
            return this;
        }

        this.beforeRemove();
        invoke(this.find('[is]'), 'beforeRemove');

        this.emit('remove');

        // remove the element
        this.parentElement.removeChild(this);
        return this;
    },

    beforeRemove: noop,

    /**
     * Called after this Component is removed from the DOM.
     */
    onRemove: noop,

    beforeDestroy: noop,

    /**
     * Removes this Component from the DOM and deletes the instance from the instances pool.
     * Null is returned for convenience so it is easy to get rid of references to a Component.
     *    this.component = this.component.destroy();
     * @returns {null}
     */
    destroy: function () {
        var thisEl = this;

        this.beforeDestroy();
        invoke(this.find('[is]'), 'beforeDestroy');

        this.remove();

        return null;
    },

    /**
     * Convenience method for performing querySelector within
     * the context of this Component.
     * @param {String} selector
     * @returns {Array}
     */
    find: function (selector) {
        return slice.call(this.querySelectorAll(selector));
    },

    /**
     * Returns the first component with 'name' within this Component or null.
     * @param {String} name
     * @returns {HTMLElement|Null}
     */
    findComponent: function (name) {
        return fromElement(
            this.find('[is=' + name + ']')[0]
        );
    },

    /**
     * Returns all components with 'name' within this component.
     * If no components exist with this name an empty array will be returned.
     * @param name
     * @returns {HTMLElement[]}
     */
    findComponents: function (name) {
        return map.call(
            this.find('[is=' + name + ']'),
            fromElement
        );
    },

    invoke: invoke,

    /**
     * Registers an event that this component would like to listen to.
     * @param {string} event
     * @param {string|function} selector
     * @param {function} [handler]
     * @returns {HTMLElement}
     */
    registerEvent: function (event, selector, handler) {

        if (arguments.length === 2) {
            handler = selector;
            selector = null;
        }

        this._events.push([event, selector, handler]);
        return this;
    },

    /**
     * Release an event or all events off an object.
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
    releaseEvent: function (event, selector, handler) {

        if (isFunction(selector) && !handler) {
            handler = selector;
            selector = null;
        }

        if (!isFunction(handler)) {
            handler = null;
        }

        if (typeof(selector) === 'undefined') {
            selector = null;
        }

        this._events = filter.call(this._events, function (ev) {
            var eventName = ev[0];
            var eventSelector = ev[1];
            var eventHandler = ev[2];

            if (!handler) {
                // we don't care what handler, just get rid of it
                return !(eventName === event && eventSelector === selector);
            }
            else {
                return !(eventName === event && eventSelector === selector &&
                    eventHandler === handler);
            }

        });

    },

    /**
     * Set a global event handler. This is useful when you
     * need to listen to events that happen outside this component.
     * @param {String} event
     * @param {Function} fn
     * @returns {HTMLElement}
     */
    setGlobalHandler: function (event, fn) {
        globalHandlers[event] = globalHandlers[event] || [];

        globalHandlers[event].push({
            fn: fn,
            ctx: this
        });

        return this;
    },

    /**
     * Release a global event handler that was previously set with setGlobalHandler().
     * @param {String} event
     * @param {Function} fn
     * @returns {HTMLElement}
     */
    releaseGlobalHandler: function (event, fn) {

        var handlers = globalHandlers[event];
        var ctx = this;

        if (!handlers) {
            return this;
        }

        // filter out entries with the same function and context
        globalHandlers[event] = filter.call(handlers, function (handler) {
            return handler.fn !== fn || handler.ctx !== ctx;
        });

        return this;
    }

};
