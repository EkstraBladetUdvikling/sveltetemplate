
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/accordion/Accordion.svelte generated by Svelte v3.42.1 */
    const file$F = "node_modules/@ekstra-bladet/designsystem/src/components/accordion/Accordion.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (9:2) {#each tabs as tab, i}
    function create_each_block(ctx) {
    	let div2;
    	let div0;
    	let span;
    	let t0_value = /*tab*/ ctx[5].title + "";
    	let t0;
    	let t1;
    	let i_1;
    	let t2;
    	let div1;
    	let raw_value = /*tab*/ ctx[5].content + "";
    	let t3;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*i*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			i_1 = element("i");
    			t2 = space();
    			div1 = element("div");
    			t3 = space();
    			attr_dev(span, "class", "fontweight-bold fontsize-medium");
    			add_location(span, file$F, 16, 8, 583);
    			attr_dev(i_1, "class", "fas fa-chevron-down");
    			add_location(i_1, file$F, 17, 8, 656);
    			attr_dev(div0, "class", "accordion-header flex flex-justify--between flex-align--center padding-m");
    			add_location(div0, file$F, 10, 6, 379);
    			attr_dev(div1, "class", "accordion-body padding-m padding-l--rl fontsize-small");
    			add_location(div1, file$F, 19, 6, 709);
    			attr_dev(div2, "class", "accordion-tab margin-m--b");
    			toggle_class(div2, "accordion-expanded", /*$activeTab*/ ctx[3] === /*i*/ ctx[7]);
    			add_location(div2, file$F, 9, 4, 289);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div0, t1);
    			append_dev(div0, i_1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			div1.innerHTML = raw_value;
    			append_dev(div2, t3);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*tabs*/ 4 && t0_value !== (t0_value = /*tab*/ ctx[5].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*tabs*/ 4 && raw_value !== (raw_value = /*tab*/ ctx[5].content + "")) div1.innerHTML = raw_value;
    			if (dirty & /*$activeTab*/ 8) {
    				toggle_class(div2, "accordion-expanded", /*$activeTab*/ ctx[3] === /*i*/ ctx[7]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(9:2) {#each tabs as tab, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$F(ctx) {
    	let div;
    	let each_value = /*tabs*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "data-theme", /*dataTheme*/ ctx[1]);
    			attr_dev(div, "class", "accordion card-mode padding-l ff-secondary width-1of1");
    			add_location(div, file$F, 7, 0, 169);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$activeTab, tabs, undefined*/ 12) {
    				each_value = /*tabs*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*dataTheme*/ 2) {
    				attr_dev(div, "data-theme", /*dataTheme*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$F.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$F($$self, $$props, $$invalidate) {
    	let $activeTab,
    		$$unsubscribe_activeTab = noop,
    		$$subscribe_activeTab = () => ($$unsubscribe_activeTab(), $$unsubscribe_activeTab = subscribe(activeTab, $$value => $$invalidate(3, $activeTab = $$value)), activeTab);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_activeTab());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Accordion', slots, []);
    	
    	const activeTab = writable(undefined);
    	validate_store(activeTab, 'activeTab');
    	$$subscribe_activeTab();
    	let { dataTheme = undefined } = $$props;
    	let { tabs } = $$props;
    	const writable_props = ['dataTheme', 'tabs'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Accordion> was created with unknown prop '${key}'`);
    	});

    	const click_handler = i => {
    		set_store_value(activeTab, $activeTab = $activeTab !== i ? i : undefined, $activeTab);
    	};

    	$$self.$$set = $$props => {
    		if ('dataTheme' in $$props) $$invalidate(1, dataTheme = $$props.dataTheme);
    		if ('tabs' in $$props) $$invalidate(2, tabs = $$props.tabs);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		activeTab,
    		dataTheme,
    		tabs,
    		$activeTab
    	});

    	$$self.$inject_state = $$props => {
    		if ('dataTheme' in $$props) $$invalidate(1, dataTheme = $$props.dataTheme);
    		if ('tabs' in $$props) $$invalidate(2, tabs = $$props.tabs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [activeTab, dataTheme, tabs, $activeTab, click_handler];
    }

    class Accordion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$F, create_fragment$F, safe_not_equal, { activeTab: 0, dataTheme: 1, tabs: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Accordion",
    			options,
    			id: create_fragment$F.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tabs*/ ctx[2] === undefined && !('tabs' in props)) {
    			console.warn("<Accordion> was created without expected prop 'tabs'");
    		}
    	}

    	get activeTab() {
    		return this.$$.ctx[0];
    	}

    	set activeTab(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dataTheme() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dataTheme(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tabs() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tabs(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/graphics/ekstrabladet.svg.svelte generated by Svelte v3.42.1 */

    const file$E = "node_modules/@ekstra-bladet/designsystem/src/components/icon/graphics/ekstrabladet.svg.svelte";

    function create_fragment$E(ctx) {
    	let svg;
    	let g;
    	let path0;
    	let polygon0;
    	let polygon1;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;
    	let rect;
    	let path6;
    	let path7;
    	let path8;
    	let path9;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "logo" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 100 88" },
    		{ "enable-background": "new 0 0 100 88" },
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			polygon0 = svg_element("polygon");
    			polygon1 = svg_element("polygon");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			rect = svg_element("rect");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			path9 = svg_element("path");
    			attr_dev(path0, "fill", "#B30000");
    			attr_dev(path0, "d", "M0-0.9h100V78l-49.5,9.5L0,77.6V-0.9L0-0.9z");
    			add_location(path0, file$E, 4, 1, 223);
    			attr_dev(polygon0, "fill", "#FFFFFF");
    			attr_dev(polygon0, "points", "23,42.3 10.6,42.3 10.6,37.8 20.4,37.8 20.4,34.4 10.6,34.4 10.6,29.8 22.1,29.8 22.1,26.5\n\t\t6.1,26.5 6.1,46.1 23.1,46.1 \t\t");
    			add_location(polygon0, file$E, 6, 1, 295);
    			attr_dev(polygon1, "fill", "#FFFFFF");
    			attr_dev(polygon1, "points", "39.7,46.1 33.7,37.3 38.7,31.9 33.9,31.9 28.7,37.5 28.7,26.5 24.8,26.5 24.8,46.1 28.7,46.1\n\t\t28.7,42.2 31,39.9 34.8,46.1 \t\t");
    			add_location(polygon1, file$E, 8, 1, 462);
    			attr_dev(path1, "fill", "#FFFFFF");
    			attr_dev(path1, "d", "M46.3,43.9c-2.4,0-3.1-0.5-3.5-2h-3.7c0,3.1,2.5,4.9,6.7,4.9c4.7,0,7.5-1.8,7.5-4.8c0-2-1.6-3.7-3.6-4.1\n\t\tL44.1,37c-0.6-0.1-1.2-0.7-1.2-1.4c0-0.8,0.8-1.4,2.3-1.4c3,0,3.5,0.4,3.6,2h3.8v-0.5c0-2.4-2.8-4.5-6.5-4.5\n\t\tc-4.2,0-6.9,1.8-6.9,4.9c0,1.8,1.3,3.6,3,3.8l5.8,1c0.8,0.1,1.3,0.5,1.3,1.2C49.4,43.3,48.5,43.9,46.3,43.9z");
    			add_location(path1, file$E, 10, 1, 631);
    			attr_dev(path2, "fill", "#FFFFFF");
    			attr_dev(path2, "d", "M56.5,42.6c0,2.6,1.7,4.2,4.7,4.2c1.1,0,2-0.2,3.6-1v-1.9c-0.7,0.1-1.7,0.1-2,0.1c-1.6,0-2.2-0.6-2.2-1.8\n\t\tv-7.6h3.8V32h-3.8v-5.4h-2.9l-0.1,1.2C57,31.6,56.9,32,55.8,32h-2.5v2.6h3.4L56.5,42.6z");
    			add_location(path2, file$E, 13, 1, 984);
    			attr_dev(path3, "fill", "#FFFFFF");
    			attr_dev(path3, "d", "M70.8,39.9c0-3.1,1.7-4.8,4.7-4.8h1.7v-3.6H76c-2.3,0-4.1,1.1-5.3,3.2V32h-3.8v14.2h4V39.9z");
    			add_location(path3, file$E, 17, 1, 1213);
    			attr_dev(path4, "fill", "#FFFFFF");
    			attr_dev(path4, "d", "M91,41.5v-3.1v-2.8c0-1.7-0.2-2.3-1-2.8c-1.3-1.1-3.4-1.6-5.8-1.6c-4.3,0-6.3,1.4-6.6,4.8h3.7\n\t\tc0.2-1.6,1-2,3-2c2.2,0,2.9,0.6,2.9,2.3c0,0.7-0.2,1-1.1,1.1l-4.1,0.5c-4.1,0.5-5.6,1.8-5.6,4.6c0,2.6,2,4.2,5.4,4.2\n\t\tc2.5,0,4.1-0.8,5.5-2.9c0.8,2.2,1.8,2.9,3.7,2.9c1,0,1.8-0.2,3.4-1.1v-1.8c-0.8,0.1-1.4,0.1-1.7,0.1C91.5,43.9,91,43.2,91,41.5z\n\t\t M83,43.9c-1.4,0-2.3-0.7-2.3-1.8c0-1.6,0.7-1.9,5.3-2.8l1.2-0.2C87.2,42.3,85.9,43.9,83,43.9z");
    			add_location(path4, file$E, 19, 1, 1341);
    			attr_dev(path5, "fill", "#FFFFFF");
    			attr_dev(path5, "d", "M20.1,58.8c2.8-0.6,4.2-2.2,4.2-4.4c0-2.6-2.4-4.7-5.5-4.7H6.1v19.5h12.5c3.7,0,6.4-2.2,6.4-5.3\n\t\tC25,61.2,23.4,59.7,20.1,58.8z M10.6,52.8h5.9c2.3,0,3.1,0.6,3.1,2.3c0,1.8-0.8,2.4-3.1,2.4h-5.9V52.8z M16.5,65.7h-6v-5.3h6\n\t\tc2.4,0,3.5,0.8,3.5,2.6C20,65.1,19.1,65.7,16.5,65.7z");
    			add_location(path5, file$E, 25, 2, 1808);
    			attr_dev(rect, "x", "26.9");
    			attr_dev(rect, "y", "49.8");
    			attr_dev(rect, "fill", "#FFFFFF");
    			attr_dev(rect, "width", "4.1");
    			attr_dev(rect, "height", "19.5");
    			add_location(rect, file$E, 29, 1, 2117);
    			attr_dev(path6, "fill", "#FFFFFF");
    			attr_dev(path6, "d", "M47.4,64.9l-0.1-6.9c-0.1-2.3-2.5-3.6-6.6-3.6c-5.1,0-6.9,1.2-7.1,4.8h3.8c0.2-1.4,0.8-1.9,2.9-1.9\n\t\tc2.4,0,3.1,0.5,3.1,2.2c0,0.7-0.4,1-1.2,1.1c-0.2,0-1.9,0.1-4.1,0.5c-3.8,0.5-5.4,1.8-5.4,4.6c0,2.6,1.9,4.2,5.3,4.2\n\t\tc2.6,0,4.1-0.7,5.6-2.9c0.7,2,1.8,2.9,3.9,2.9c1,0,1.7-0.2,2.9-0.8v-2c-0.5,0.1-0.8,0.1-1.2,0.1C47.9,67.1,47.4,66.5,47.4,64.9z\n\t\t M39.4,67c-1.7,0-2.5-0.6-2.5-1.7c0-1.3,1-2,3.1-2.4c1.9-0.2,1.8-0.2,3.2-0.6C43.3,65.4,42,67,39.4,67z");
    			add_location(path6, file$E, 31, 1, 2196);
    			attr_dev(path7, "fill", "#FFFFFF");
    			attr_dev(path7, "d", "M61.7,57.3c-1.3-1.9-2.8-2.8-4.9-2.8c-3.8,0-6.7,3.2-6.7,7.6c0,4.8,2.5,7.8,6.6,7.8c2.3,0,3.4-0.6,5.2-2.8\n\t\tv2.3h3.9V49.8h-4V57.3z M57.6,67.1c-2.4,0-3.5-1.7-3.5-4.9c0-3,1.2-4.7,3.5-4.7c2.2,0,3.6,1.9,3.6,4.7\n\t\tC61.2,65.2,59.8,67.1,57.6,67.1z");
    			add_location(path7, file$E, 35, 1, 2673);
    			attr_dev(path8, "fill", "#FFFFFF");
    			attr_dev(path8, "d", "M75.5,54.6c-4.5,0-7.8,3.4-7.8,7.7c0,4.6,3.2,7.8,7.8,7.8c4.4,0,7.2-1.8,7.7-5.1h-3.8\n\t\tc-0.5,1.6-1.3,2-3.4,2c-2.8,0-4.1-1.3-4.1-4h11.3C83.2,58,80.2,54.6,75.5,54.6z M72,60.9c0.2-2.3,1.3-3.5,3.4-3.5\n\t\tc2.2,0,3.2,1.1,3.4,3.5H72z");
    			add_location(path8, file$E, 39, 1, 2950);
    			attr_dev(path9, "fill", "#FFFFFF");
    			attr_dev(path9, "d", "M90.3,65.7v-7.6h4v-2.9h-4v-5.3h-2.9L87.3,51c-0.7,4.2-0.6,4.2-1.7,4.2h-2.3v2.9h3l-0.1,6.9v0.5\n\t\tc0,3.2,1.4,4.7,4.6,4.7c1.6,0,2.4-0.1,3.7-0.8v-2.2c-0.8,0.1-1.7,0.1-2,0.1C90.9,67.2,90.3,66.8,90.3,65.7z");
    			add_location(path9, file$E, 43, 1, 3213);
    			add_location(g, file$E, 2, 0, 217);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$E, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);
    			append_dev(g, path0);
    			append_dev(g, polygon0);
    			append_dev(g, polygon1);
    			append_dev(g, path1);
    			append_dev(g, path2);
    			append_dev(g, path3);
    			append_dev(g, path4);
    			append_dev(g, path5);
    			append_dev(g, rect);
    			append_dev(g, path6);
    			append_dev(g, path7);
    			append_dev(g, path8);
    			append_dev(g, path9);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "logo" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 100 88" },
    				{ "enable-background": "new 0 0 100 88" },
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$E.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$E($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Ekstrabladet_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Ekstrabladet_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$E, create_fragment$E, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ekstrabladet_svg",
    			options,
    			id: create_fragment$E.name
    		});
    	}
    }

    var GraphicSVGS = /*#__PURE__*/Object.freeze({
        __proto__: null,
        ekstrabladet: Ekstrabladet_svg
    });

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-down.svg.svelte generated by Svelte v3.42.1 */

    const file$D = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-down.svg.svelte";

    function create_fragment$D(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "angle-down" },
    		{
    			class: "svg-inline--fa fa-angle-down fa-w-10"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 320 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M151.5 347.8L3.5 201c-4.7-4.7-4.7-12.3 0-17l19.8-19.8c4.7-4.7 12.3-4.7 17 0L160 282.7l119.7-118.5c4.7-4.7 12.3-4.7 17 0l19.8 19.8c4.7 4.7 4.7 12.3 0 17l-148 146.8c-4.7 4.7-12.3 4.7-17 0z");
    			add_location(path, file$D, 0, 210, 210);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$D, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "angle-down" },
    				{
    					class: "svg-inline--fa fa-angle-down fa-w-10"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 320 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$D.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$D($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Angle_down_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Angle_down_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$D, create_fragment$D, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Angle_down_svg",
    			options,
    			id: create_fragment$D.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-left.svg.svelte generated by Svelte v3.42.1 */

    const file$C = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-left.svg.svelte";

    function create_fragment$C(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "angle-left" },
    		{
    			class: "svg-inline--fa fa-angle-left fa-w-6"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 192 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M4.2 247.5L151 99.5c4.7-4.7 12.3-4.7 17 0l19.8 19.8c4.7 4.7 4.7 12.3 0 17L69.3 256l118.5 119.7c4.7 4.7 4.7 12.3 0 17L168 412.5c-4.7 4.7-12.3 4.7-17 0L4.2 264.5c-4.7-4.7-4.7-12.3 0-17z");
    			add_location(path, file$C, 1, 2, 212);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$C, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "angle-left" },
    				{
    					class: "svg-inline--fa fa-angle-left fa-w-6"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 192 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$C.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$C($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Angle_left_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Angle_left_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$C, create_fragment$C, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Angle_left_svg",
    			options,
    			id: create_fragment$C.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-right.svg.svelte generated by Svelte v3.42.1 */

    const file$B = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-right.svg.svelte";

    function create_fragment$B(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "angle-right" },
    		{
    			class: "svg-inline--fa fa-angle-right fa-w-6"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 192 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M187.8 264.5L41 412.5c-4.7 4.7-12.3 4.7-17 0L4.2 392.7c-4.7-4.7-4.7-12.3 0-17L122.7 256 4.2 136.3c-4.7-4.7-4.7-12.3 0-17L24 99.5c4.7-4.7 12.3-4.7 17 0l146.8 148c4.7 4.7 4.7 12.3 0 17z");
    			add_location(path, file$B, 0, 211, 211);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$B, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "angle-right" },
    				{
    					class: "svg-inline--fa fa-angle-right fa-w-6"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 192 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$B.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$B($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Angle_right_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Angle_right_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$B, create_fragment$B, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Angle_right_svg",
    			options,
    			id: create_fragment$B.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-up.svg.svelte generated by Svelte v3.42.1 */

    const file$A = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/angle-up.svg.svelte";

    function create_fragment$A(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "angle-up" },
    		{
    			class: "svg-inline--fa fa-angle-up fa-w-10"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 320 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M168.5 164.2l148 146.8c4.7 4.7 4.7 12.3 0 17l-19.8 19.8c-4.7 4.7-12.3 4.7-17 0L160 229.3 40.3 347.8c-4.7 4.7-12.3 4.7-17 0L3.5 328c-4.7-4.7-4.7-12.3 0-17l148-146.8c4.7-4.7 12.3-4.7 17 0z");
    			add_location(path, file$A, 0, 206, 206);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$A, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "angle-up" },
    				{
    					class: "svg-inline--fa fa-angle-up fa-w-10"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 320 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$A.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$A($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Angle_up_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Angle_up_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$A, create_fragment$A, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Angle_up_svg",
    			options,
    			id: create_fragment$A.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/article.svg.svelte generated by Svelte v3.42.1 */

    const file$z = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/article.svg.svelte";

    function create_fragment$z(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 51 47" },
    		{
    			style: "enable-background:new 0 0 51 47;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M27,46.5h-4.5c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5H27c0.8,0,1.5,0.7,1.5,1.5S27.8,46.5,27,46.5z M15,46.5H2\n\tc-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h13c0.8,0,1.5,0.7,1.5,1.5S15.8,46.5,15,46.5z M49,35.4H2c-0.8,0-1.5-0.7-1.5-1.5\n\ts0.7-1.5,1.5-1.5h47c0.8,0,1.5,0.7,1.5,1.5S49.8,35.4,49,35.4z M49,24.3H33.5c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5H49\n\tc0.8,0,1.5,0.7,1.5,1.5S49.8,24.3,49,24.3z M22.7,24.3H3.3c-1.6,0-2.8-1.2-2.8-2.8V3c0-1.6,1.2-2.8,2.8-2.8h19.4\n\tc1.6,0,2.8,1.2,2.8,2.8v18.5C25.4,23.1,24.3,24.3,22.7,24.3z M3.5,21.3l18.9,0V3.3l-18.9,0L3.5,21.3z M49,13.2H33.5\n\tc-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5H49c0.8,0,1.5,0.7,1.5,1.5S49.8,13.2,49,13.2z M49,3.3H33.5c-0.8,0-1.5-0.7-1.5-1.5\n\ts0.7-1.5,1.5-1.5H49c0.8,0,1.5,0.7,1.5,1.5S49.8,3.3,49,3.3z");
    			add_location(path, file$z, 11, 2, 244);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$z, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 51 47" },
    				{
    					style: "enable-background:new 0 0 51 47;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$z.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$z($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Article_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Article_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$z, create_fragment$z, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Article_svg",
    			options,
    			id: create_fragment$z.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/at.svg.svelte generated by Svelte v3.42.1 */

    const file$y = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/at.svg.svelte";

    function create_fragment$y(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 16 16" },
    		{
    			style: "enable-background:new 0 0 16 16;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "class", "st0");
    			attr_dev(path, "d", "M8,15.6c-4.2,0-7.6-3.4-7.6-7.6S3.8,0.4,8,0.4s7.6,3.4,7.6,7.6v1.3c0,1.3-1.1,2.4-2.4,2.4c-1,0-1.8-0.6-2.2-1.4\n\tc-0.7,0.9-1.7,1.4-2.9,1.4C6,11.7,4.3,10,4.3,8C4.3,6,6,4.3,8,4.3c1.1,0,2,0.5,2.7,1.2V4.8h1v4.5c0,0.8,0.6,1.4,1.4,1.4\n\ts1.4-0.6,1.4-1.4V8c0-3.6-2.9-6.6-6.6-6.6C4.4,1.4,1.4,4.4,1.4,8c0,3.6,2.9,6.6,6.6,6.6V15.6z M8,5.3C6.5,5.3,5.3,6.5,5.3,8\n\tc0,1.5,1.2,2.7,2.7,2.7c1.5,0,2.7-1.2,2.7-2.7C10.7,6.5,9.5,5.3,8,5.3z");
    			add_location(path, file$y, 3, 0, 226);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$y, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 16 16" },
    				{
    					style: "enable-background:new 0 0 16 16;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$y.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$y($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('At_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class At_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$y, create_fragment$y, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "At_svg",
    			options,
    			id: create_fragment$y.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/check.svg.svelte generated by Svelte v3.42.1 */

    const file$x = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/check.svg.svelte";

    function create_fragment$x(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 442.6 335.1" },
    		{
    			style: "enable-background:new 0 0 442.6 335.1;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M410.8,3.5l-280,280l-99-99c-4.7-4.7-12.3-4.7-17,0L3.5,195.8c-4.7,4.7-4.7,12.3,0,17l118.8,118.8c4.7,4.7,12.3,4.7,17,0\n\tL439.1,31.8c4.7-4.7,4.7-12.3,0-17L427.8,3.5C423.1-1.2,415.5-1.2,410.8,3.5L410.8,3.5z");
    			add_location(path, file$x, 10, 2, 211);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$x, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 442.6 335.1" },
    				{
    					style: "enable-background:new 0 0 442.6 335.1;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$x.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$x($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Check_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Check_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$x, create_fragment$x, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Check_svg",
    			options,
    			id: create_fragment$x.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/clock.svg.svelte generated by Svelte v3.42.1 */

    const file$w = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/clock.svg.svelte";

    function create_fragment$w(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "clock" },
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 512 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200zm61.8-104.4l-84.9-61.7c-3.1-2.3-4.9-5.9-4.9-9.7V116c0-6.6 5.4-12 12-12h32c6.6 0 12 5.4 12 12v141.7l66.8 48.6c5.4 3.9 6.5 11.4 2.6 16.8L334.6 349c-3.9 5.3-11.4 6.5-16.8 2.6z");
    			add_location(path, file$w, 0, 160, 160);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$w, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "clock" },
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 512 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$w.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$w($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Clock_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Clock_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$w, create_fragment$w, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clock_svg",
    			options,
    			id: create_fragment$w.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/creditcard.svg.svelte generated by Svelte v3.42.1 */

    const file$v = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/creditcard.svg.svelte";

    function create_fragment$v(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 576 448" },
    		{
    			style: "enable-background:new 0 0 576 448;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M528,0H48C21.5,0,0,21.5,0,48v352c0,26.5,21.5,48,48,48h480c26.5,0,48-21.5,48-48V48C576,21.5,554.5,0,528,0z M48,32h480\n\tc8.8,0,16,7.2,16,16v48H32V48C32,39.2,39.2,32,48,32z M528,416H48c-8.8,0-16-7.2-16-16V192h512v208C544,408.8,536.8,416,528,416z\n\t M192,332v8c0,6.6-5.4,12-12,12h-72c-6.6,0-12-5.4-12-12v-8c0-6.6,5.4-12,12-12h72C186.6,320,192,325.4,192,332z M384,332v8\n\tc0,6.6-5.4,12-12,12H236c-6.6,0-12-5.4-12-12v-8c0-6.6,5.4-12,12-12h136C378.6,320,384,325.4,384,332z");
    			add_location(path, file$v, 10, 2, 203);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$v, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 576 448" },
    				{
    					style: "enable-background:new 0 0 576 448;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$v.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$v($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Creditcard_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Creditcard_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$v, create_fragment$v, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Creditcard_svg",
    			options,
    			id: create_fragment$v.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/ebplus_icon.svg.svelte generated by Svelte v3.42.1 */

    const file$u = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/ebplus_icon.svg.svelte";

    function create_fragment$u(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 72.8 72.8" },
    		{
    			style: "enable-background:new 0 0 72.8 72.8;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M36.4,0C16.3,0,0,16.3,0,36.4s16.3,36.4,36.4,36.4s36.4-16.3,36.4-36.4S56.5,0,36.4,0z M56.5,41.9H42.2v14.2\n\tH30.6V41.9H16.3V31.4h14.2V17.2h11.7v14.1h14.2V41.9z");
    			add_location(path, file$u, 11, 2, 252);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$u, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 72.8 72.8" },
    				{
    					style: "enable-background:new 0 0 72.8 72.8;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$u.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$u($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Ebplus_icon_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Ebplus_icon_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$u, create_fragment$u, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ebplus_icon_svg",
    			options,
    			id: create_fragment$u.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/ebplus_sort.svg.svelte generated by Svelte v3.42.1 */

    const file$t = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/ebplus_sort.svg.svelte";

    function create_fragment$t(ctx) {
    	let svg;
    	let g1;
    	let g0;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 122.1 595.3 597.4" },
    		{
    			"enable-background": "new 0 122.1 595.3 597.4"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			path = svg_element("path");
    			attr_dev(path, "d", "M237.4,122.1h120.5v238.5h237.4V481H357.9v238.5H237.4V481H0V360.5h237.4V122.1z");
    			add_location(path, file$t, 13, 6, 275);
    			add_location(g0, file$t, 12, 4, 265);
    			add_location(g1, file$t, 11, 2, 257);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$t, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			append_dev(g0, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 122.1 595.3 597.4" },
    				{
    					"enable-background": "new 0 122.1 595.3 597.4"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$t.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$t($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Ebplus_sort_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Ebplus_sort_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$t, create_fragment$t, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Ebplus_sort_svg",
    			options,
    			id: create_fragment$t.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/envelope.svg.svelte generated by Svelte v3.42.1 */

    const file$s = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/envelope.svg.svelte";

    function create_fragment$s(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 512 384" },
    		{
    			style: "enable-background:new 0 0 512 384;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M464,0H48C21.5,0,0,21.5,0,48v288c0,26.5,21.5,48,48,48h416c26.5,0,48-21.5,48-48V48C512,21.5,490.5,0,464,0z M48,32h416\n\tc8.8,0,16,7.2,16,16v41.4c-21.9,18.5-53.2,44-150.6,121.3c-16.9,13.4-50.2,45.7-73.4,45.3c-23.2,0.4-56.6-31.9-73.4-45.3\n\tC85.2,133.4,53.9,107.9,32,89.4V48C32,39.2,39.2,32,48,32z M464,352H48c-8.8,0-16-7.2-16-16V131c22.8,18.7,58.8,47.6,130.7,104.7\n\tc20.5,16.4,56.7,52.5,93.3,52.3c36.4,0.3,72.3-35.5,93.3-52.3c71.9-57.1,107.9-86,130.7-104.7v205C480,344.8,472.8,352,464,352z");
    			add_location(path, file$s, 10, 2, 203);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$s, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 512 384" },
    				{
    					style: "enable-background:new 0 0 512 384;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$s.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$s($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Envelope_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Envelope_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$s, create_fragment$s, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Envelope_svg",
    			options,
    			id: create_fragment$s.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/figcaption-pin.svg.svelte generated by Svelte v3.42.1 */

    const file$r = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/figcaption-pin.svg.svelte";

    function create_fragment$r(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	let svg_levels = [
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 34 16.4" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M15.6.8c.8-.8 2-.8 2.8 0l6.7 6.7c1.9 1.9 4.4 2.9 7.1 2.9H34v6H0v-6h1.9c2.7 0 5.2-1.1 7.1-2.9L15.6.8z");
    			attr_dev(path0, "fill", "#fff");
    			add_location(path0, file$r, 0, 76, 76);
    			attr_dev(path1, "d", "M9.7 12.9l6.6-6.6c.4-.4 1-.4 1.4 0l6.6 6.6c.6.6.2 1.7-.7 1.7H10.4c-.9 0-1.3-1-.7-1.7z");
    			add_location(path1, file$r, 0, 201, 201);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$r, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 34 16.4" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$r.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$r($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Figcaption_pin_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Figcaption_pin_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$r, create_fragment$r, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Figcaption_pin_svg",
    			options,
    			id: create_fragment$r.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/gallery.svg.svelte generated by Svelte v3.42.1 */

    const file$q = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/gallery.svg.svelte";

    function create_fragment$q(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 55 55" },
    		{
    			style: "enable-background:new 0 0 55 55;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M43.7,54.5c-0.3,0-0.6,0-0.9-0.1l-32.7-6.6c-0.8-0.2-1.3-1-1.2-1.8c0.2-0.8,1-1.3,1.8-1.2l32.8,6.6c0.1,0,0.1,0,0.2,0\n\tc0.1,0,0.1,0,0.6-0.1l0.1,0c0,0,0-0.1,0.1-0.1c0-0.1,0-0.1,0-0.2l7.1-35c0-0.2,0-0.4-0.1-0.6c-0.1-0.1-0.2-0.2-0.4-0.3L46,14.3\n\tc-0.8-0.1-1.4-0.9-1.2-1.7c0.1-0.8,0.9-1.4,1.7-1.2l4.9,0.9c1,0.2,1.8,0.7,2.4,1.5c0.6,0.9,0.8,1.9,0.6,2.9l-7.1,34.9\n\tc-0.1,1-0.8,2-1.7,2.5c-0.1,0-0.1,0.1-0.2,0.1l-0.2,0.1C44.8,54.3,44.3,54.5,43.7,54.5z M39.6,43.3H4.2c-2.2,0-3.7-1.6-3.7-3.7V4.2\n\tc0-2.2,1.6-3.7,3.7-3.7h35.4c2.2,0,3.7,1.6,3.7,3.7v35.4C43.3,41.8,41.8,43.3,39.6,43.3z M3.5,36.7v2.9c0,0.5,0.2,0.7,0.7,0.7h35.4\n\tc0.5,0,0.7-0.2,0.7-0.7v-2.9H3.5z M37.7,33.7h2.6V4.2c0-0.5-0.2-0.7-0.7-0.7H4.2c-0.5,0-0.7,0.2-0.7,0.7v29.5h2.6\n\tc0.2-1.7,0.6-3.4,1.4-5.1c1.2-2.4,4.8-3.7,9.8-5.4c0.2-0.5,0.2-1.7,0-2.1c-2.1-2.4-3-5.2-2.8-8.1c0-2.2,0.6-4,1.9-5.5\n\tc1.4-1.6,3.3-2.5,5.6-2.5c2,0,3.9,0.9,5.5,2.4c0,0,0.1,0.1,0.1,0.1c1.3,1.6,1.9,3.5,1.7,5.6c0.2,3-0.8,5.9-2.7,7.9\n\tc-0.2,0.5-0.2,1.8,0,2.3c0.6,0.2,1.3,0.5,1.9,0.7c4,1.5,6.9,2.6,7.9,4.6C37.1,30.3,37.6,32,37.7,33.7z M9.1,33.7h25.6\n\tc-0.2-1.3-0.5-2.6-1.1-3.9c-0.4-0.9-3.4-2-6.2-3c-0.7-0.3-1.4-0.5-2.2-0.8c-0.5-0.2-1.2-0.7-1.5-1.8c-0.5-1.5-0.3-3.9,0.4-4.9\n\tc0.1-0.1,0.1-0.2,0.2-0.2c1.4-1.4,2.2-3.6,2-5.9c0-0.1,0-0.2,0-0.3c0.2-1.3-0.1-2.5-0.9-3.4c-0.6-0.6-1.8-1.5-3.3-1.5\n\tc-1.4,0-2.5,0.5-3.3,1.5c-0.8,1-1.2,2.2-1.2,3.7c0,0,0,0.1,0,0.1c-0.2,2.2,0.5,4.2,2.1,6c0.9,0.9,1.1,3.3,0.8,4.6\n\tc-0.4,1.6-1.3,2.1-1.8,2.3c-2.8,0.9-7.5,2.5-8.2,3.9C9.7,31.1,9.3,32.4,9.1,33.7z M17.3,21.1C17.3,21.2,17.3,21.2,17.3,21.1\n\tC17.3,21.2,17.3,21.2,17.3,21.1z");
    			add_location(path, file$q, 11, 2, 244);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$q, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 55 55" },
    				{
    					style: "enable-background:new 0 0 55 55;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$q.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Gallery_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Gallery_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$q, create_fragment$q, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Gallery_svg",
    			options,
    			id: create_fragment$q.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/headphones.svg.svelte generated by Svelte v3.42.1 */

    const file$p = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/headphones.svg.svelte";

    function create_fragment$p(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 53 53" },
    		{
    			style: "enable-background:new 0 0 53 53;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M14.9,52.7c-0.5,0-1.1-0.1-1.6-0.3c-0.9-0.4-1.6-1.2-2-2.3L6.7,38.3c-0.4-1-0.4-2.1,0.1-3c0.4-0.9,1.2-1.6,2.2-1.9l2-0.9\n\tc1-0.4,2.1-0.4,3.1,0c0.9,0.4,1.6,1.2,2,2.3l4.6,11.8c0.4,1,0.4,2.1-0.1,3c-0.4,0.9-1.2,1.6-2.2,1.9l-2,0.9\n\tC15.9,52.6,15.4,52.7,14.9,52.7z M12.5,35.1c-0.1,0-0.2,0-0.3,0.1l-2,0.9c0,0-0.1,0-0.1,0.1c-0.2,0.1-0.4,0.2-0.5,0.4\n\tc-0.1,0.2-0.1,0.4,0,0.7c0,0,0,0,0,0l4.7,11.9c0.1,0.3,0.2,0.5,0.4,0.6c0.2,0.1,0.4,0.1,0.7,0l2-0.9c0,0,0.1,0,0.1-0.1\n\tc0.2-0.1,0.4-0.2,0.5-0.4c0.1-0.2,0.1-0.4,0-0.7l-4.7-11.9c-0.1-0.3-0.2-0.5-0.4-0.6C12.7,35.1,12.6,35.1,12.5,35.1z M38,52.6\n\tc-0.5,0-0.9-0.1-1.3-0.3l-2.2-1c-1.9-0.8-2.9-3.1-2.2-5L37,34.6c0.8-2,3.1-3,5-2.2l2.2,1c0.9,0.3,1.6,1.1,2.1,2c0.5,1,0.5,2,0.1,3\n\tl-4.7,11.9c0,0,0,0,0,0c-0.4,0.9-1.1,1.7-2,2.1C39.1,52.5,38.6,52.6,38,52.6z M40.7,35.1c-0.3,0-0.7,0.3-0.9,0.6l-4.7,11.9\n\tc-0.2,0.4,0.1,0.9,0.6,1.1l2.2,1c0.3,0.1,0.9-0.2,1-0.6l4.7-11.9c0.1-0.2,0.1-0.4,0-0.6c-0.1-0.2-0.3-0.4-0.5-0.5l-2.2-1\n\tC40.8,35.1,40.7,35.1,40.7,35.1z M40.3,49.6L40.3,49.6L40.3,49.6z M44,52.5c-0.2,0-0.5-0.1-0.7-0.2c-0.7-0.4-1-1.3-0.6-2\n\tc0.1-0.1,6.8-12.6,6.8-23.8c0-12.7-10.3-23-23-23c-12.7,0-23,10.3-23,23c0,11.1,6.7,23.7,6.8,23.8c0.4,0.7,0.1,1.6-0.6,2\n\tc-0.7,0.4-1.6,0.1-2-0.6c-0.3-0.5-7.2-13.3-7.2-25.2c0-14.3,11.7-26,26-26c14.3,0,26,11.7,26,26c0,11.9-6.9,24.7-7.2,25.2\n\tC45,52.2,44.5,52.5,44,52.5z");
    			add_location(path, file$p, 2, 0, 225);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$p, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 53 53" },
    				{
    					style: "enable-background:new 0 0 53 53;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$p.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Headphones_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Headphones_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$p, create_fragment$p, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Headphones_svg",
    			options,
    			id: create_fragment$p.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/headset.svg.svelte generated by Svelte v3.42.1 */

    const file$o = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/headset.svg.svelte";

    function create_fragment$o(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 512 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M192 208c0-17.67-14.33-32-32-32h-16c-35.35 0-64 28.65-64 64v48c0 35.35 28.65 64 64 64h16c17.67 0 32-14.33 32-32V208zm176 144c35.35 0 64-28.65 64-64v-48c0-35.35-28.65-64-64-64h-16c-17.67 0-32 14.33-32 32v112c0 17.67 14.33 32 32 32h16zM256 0C113.18 0 4.58 118.83 0 256v16c0 8.84 7.16 16 16 16h16c8.84 0 16-7.16 16-16v-16c0-114.69 93.31-208 208-208s208 93.31 208 208h-.12c.08 2.43.12 165.72.12 165.72 0 23.35-18.93 42.28-42.28 42.28H320c0-26.51-21.49-48-48-48h-32c-26.51 0-48 21.49-48 48s21.49 48 48 48h181.72c49.86 0 90.28-40.42 90.28-90.28V256C507.42 118.83 398.82 0 256 0z");
    			add_location(path, file$o, 0, 76, 76);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$o, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 512 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Headset_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Headset_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Headset_svg",
    			options,
    			id: create_fragment$o.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/history-regular.svg.svelte generated by Svelte v3.42.1 */

    const file$n = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/history-regular.svg.svelte";

    function create_fragment$n(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "history" },
    		{
    			class: "svg-inline--fa fa-history fa-w-16"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 512 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M504 255.532c.252 136.64-111.182 248.372-247.822 248.468-64.014.045-122.373-24.163-166.394-63.942-5.097-4.606-5.3-12.543-.443-17.4l16.96-16.96c4.529-4.529 11.776-4.659 16.555-.395C158.208 436.843 204.848 456 256 456c110.549 0 200-89.468 200-200 0-110.549-89.468-200-200-200-55.52 0-105.708 22.574-141.923 59.043l49.091 48.413c7.641 7.535 2.305 20.544-8.426 20.544H26.412c-6.627 0-12-5.373-12-12V45.443c0-10.651 12.843-16.023 20.426-8.544l45.097 44.474C124.866 36.067 187.15 8 256 8c136.811 0 247.747 110.781 248 247.532zm-167.058 90.173l14.116-19.409c3.898-5.36 2.713-12.865-2.647-16.763L280 259.778V116c0-6.627-5.373-12-12-12h-24c-6.627 0-12 5.373-12 12v168.222l88.179 64.13c5.36 3.897 12.865 2.712 16.763-2.647z");
    			add_location(path, file$n, 0, 204, 204);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$n, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "history" },
    				{
    					class: "svg-inline--fa fa-history fa-w-16"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 512 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('History_regular_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class History_regular_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "History_regular_svg",
    			options,
    			id: create_fragment$n.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/lock-old.svg.svelte generated by Svelte v3.42.1 */

    const file$m = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/lock-old.svg.svelte";

    function create_fragment$m(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 448 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M400 192h-32v-46.6C368 65.8 304 .2 224.4 0 144.8-.2 80 64.5 80 144v48H48c-26.5 0-48 21.5-48 48v224c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V240c0-26.5-21.5-48-48-48zm-272-48c0-52.9 43.1-96 96-96s96 43.1 96 96v48H128v-48zm272 320H48V240h352v224z");
    			add_location(path, file$m, 1, 17, 79);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$m, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 448 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Lock_old_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Lock_old_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lock_old_svg",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/lock.svg.svelte generated by Svelte v3.42.1 */

    const file$l = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/lock.svg.svelte";

    function create_fragment$l(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 448 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M400 192h-32v-46.6C368 65.8 304 .2 224.4 0 144.8-.2 80 64.5 80 144v48H48c-26.5 0-48 21.5-48 48v224c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V240c0-26.5-21.5-48-48-48zm-272-48c0-52.9 43.1-96 96-96s96 43.1 96 96v48H128v-48zm272 320H48V240h352v224z");
    			add_location(path, file$l, 0, 76, 76);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$l, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 448 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Lock_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Lock_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lock_svg",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/medielogin.svg.svelte generated by Svelte v3.42.1 */

    const file$k = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/medielogin.svg.svelte";

    function create_fragment$k(ctx) {
    	let svg;
    	let g;
    	let rect;
    	let polygon0;
    	let path;
    	let polygon1;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 63.6 81.5" },
    		{
    			style: "enable-background:new 0 0 63.6 81.5;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			rect = svg_element("rect");
    			polygon0 = svg_element("polygon");
    			path = svg_element("path");
    			polygon1 = svg_element("polygon");
    			attr_dev(rect, "y", "70.7");
    			attr_dev(rect, "width", "63.3");
    			attr_dev(rect, "height", "10.9");
    			add_location(rect, file$k, 12, 4, 260);
    			attr_dev(polygon0, "points", "0,81.5 21.2,61.8 21.2,47.8 0,67.5 \t");
    			add_location(polygon0, file$k, 13, 4, 309);
    			attr_dev(path, "d", "M31.8,0C14.2,0,0,14.2,0,31.8c0,13.8,8.9,25.6,21.2,30v-14c-5.2-3.4-8.6-9.3-8.6-16c0-10.6,8.6-19.2,19.2-19.2\n\t\tS51,21.2,51,31.8c0,6.7-3.4,12.5-8.6,16v14c12.3-4.4,21.2-16.1,21.2-30C63.6,14.2,49.3,0,31.8,0z");
    			add_location(path, file$k, 14, 4, 370);
    			attr_dev(polygon1, "points", "63.6,81.5 42.4,61.7 42.4,47.8 63.6,67.5 \t");
    			add_location(polygon1, file$k, 18, 4, 600);
    			add_location(g, file$k, 11, 2, 252);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$k, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);
    			append_dev(g, rect);
    			append_dev(g, polygon0);
    			append_dev(g, path);
    			append_dev(g, polygon1);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 63.6 81.5" },
    				{
    					style: "enable-background:new 0 0 63.6 81.5;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Medielogin_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Medielogin_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Medielogin_svg",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/menu-bars.svg.svelte generated by Svelte v3.42.1 */

    const file$j = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/menu-bars.svg.svelte";

    function create_fragment$j(ctx) {
    	let svg;
    	let g1;
    	let g0;
    	let rect0;
    	let g3;
    	let g2;
    	let rect1;
    	let g5;
    	let g4;
    	let rect2;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Lag_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 30 30" },
    		{ "enable-background": "new 0 0 30 30" },
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			rect0 = svg_element("rect");
    			g3 = svg_element("g");
    			g2 = svg_element("g");
    			rect1 = svg_element("rect");
    			g5 = svg_element("g");
    			g4 = svg_element("g");
    			rect2 = svg_element("rect");
    			attr_dev(rect0, "y", "4.3");
    			attr_dev(rect0, "width", "30");
    			attr_dev(rect0, "height", "4");
    			add_location(rect0, file$j, 13, 6, 253);
    			add_location(g0, file$j, 12, 4, 243);
    			add_location(g1, file$j, 11, 2, 235);
    			attr_dev(rect1, "y", "12.3");
    			attr_dev(rect1, "width", "30");
    			attr_dev(rect1, "height", "4");
    			add_location(rect1, file$j, 18, 6, 328);
    			add_location(g2, file$j, 17, 4, 318);
    			add_location(g3, file$j, 16, 2, 310);
    			attr_dev(rect2, "y", "20.3");
    			attr_dev(rect2, "width", "30");
    			attr_dev(rect2, "height", "4");
    			add_location(rect2, file$j, 23, 6, 404);
    			add_location(g4, file$j, 22, 4, 394);
    			add_location(g5, file$j, 21, 2, 386);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$j, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g1);
    			append_dev(g1, g0);
    			append_dev(g0, rect0);
    			append_dev(svg, g3);
    			append_dev(g3, g2);
    			append_dev(g2, rect1);
    			append_dev(svg, g5);
    			append_dev(g5, g4);
    			append_dev(g4, rect2);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Lag_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 30 30" },
    				{ "enable-background": "new 0 0 30 30" },
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Menu_bars_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Menu_bars_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu_bars_svg",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/miteb-regular.svg.svelte generated by Svelte v3.42.1 */

    const file$i = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/miteb-regular.svg.svelte";

    function create_fragment$i(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "miteb-regular" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0" },
    		{ y: "0" },
    		{ viewBox: "0 0 512 512" },
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M210.3 26.5H22.5C10 26.5-.1 36.5-.1 48.8v115.4c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3V48.8c.1-12.3-10.1-22.3-22.6-22.3zm-23.3 115H45.8V71.7H187v69.8zM489.4 26.5H301.6c-12.5 0-22.6 10-22.6 22.3v231.1c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3V48.8c0-12.3-10.1-22.3-22.6-22.3zm-23.3 230.7H324.9V71.7h141.2v185.5zM210.3 235.3H22.5c-12.5 0-22.6 10-22.6 22.3v205.6c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3V257.6c.1-12.3-10.1-22.3-22.6-22.3zM187 440.5H45.8v-160H187v160zM489.4 350.1H301.6c-12.5 0-22.6 10-22.6 22.3v90.8c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3v-90.8c0-12.3-10.1-22.3-22.6-22.3zm-23.3 90.4H324.9v-45.2h141.2v45.2z");
    			add_location(path, file$i, 0, 185, 185);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$i, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "miteb-regular" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0" },
    				{ y: "0" },
    				{ viewBox: "0 0 512 512" },
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Miteb_regular_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Miteb_regular_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Miteb_regular_svg",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/miteb-solid.svg.svelte generated by Svelte v3.42.1 */

    const file$h = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/miteb-solid.svg.svelte";

    function create_fragment$h(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "miteb-solid" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0" },
    		{ y: "0" },
    		{ viewBox: "0 0 512 512" },
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M210.3 26.5H22.5C10 26.5-.1 36.5-.1 48.8v115.4c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3V48.8c.1-12.3-10.1-22.3-22.6-22.3zM489.4 26.5H301.6c-12.5 0-22.6 10-22.6 22.3v231.1c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3V48.8c0-12.3-10.1-22.3-22.6-22.3zM210.3 235.3H22.5c-12.5 0-22.6 10-22.6 22.3v205.6c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3V257.6c.1-12.3-10.1-22.3-22.6-22.3zM489.4 350.1H301.6c-12.5 0-22.6 10-22.6 22.3v90.8c0 12.3 10.1 22.3 22.6 22.3h187.8c12.5 0 22.6-10 22.6-22.3v-90.8c0-12.3-10.1-22.3-22.6-22.3z");
    			add_location(path, file$h, 0, 183, 183);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$h, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "miteb-solid" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0" },
    				{ y: "0" },
    				{ viewBox: "0 0 512 512" },
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Miteb_solid_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Miteb_solid_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Miteb_solid_svg",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/newspaper.svg.svelte generated by Svelte v3.42.1 */

    const file$g = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/newspaper.svg.svelte";

    function create_fragment$g(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 42 39" },
    		{
    			style: "enable-background:new 0 0 42 39;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M35.8,38.5H6.2c-3.5,0-6.2-2.7-6.2-6.2V2.7C0,1.2,1.2,0,2.7,0h26.1c1.6,0,2.7,1.2,2.7,2.7v29.6c0,2.4,1.8,4.2,4.2,4.2\n\ts4.2-1.8,4.2-4.2V6.2c0-0.6,0.4-1,1-1s1,0.4,1,1v26.1C42,35.8,39.3,38.5,35.8,38.5z M2.7,2C2.2,2,2,2.2,2,2.7v29.6\n\tc0,2.4,1.8,4.2,4.2,4.2h25c-1-1.1-1.6-2.6-1.6-4.2V2.7c0-0.5-0.2-0.7-0.7-0.7H2.7z M35.8,33.8c-0.6,0-1-0.4-1-1V6.2c0-0.6,0.4-1,1-1\n\ts1,0.4,1,1v26.5C36.8,33.3,36.3,33.8,35.8,33.8z M25.3,29.8H6.2c-0.6,0-1-0.4-1-1s0.4-1,1-1h19.1c0.6,0,1,0.4,1,1\n\tS25.9,29.8,25.3,29.8z M25.3,24.6H6.2c-0.6,0-1-0.4-1-1s0.4-1,1-1h19.1c0.6,0,1,0.4,1,1S25.9,24.6,25.3,24.6z M25.3,19.4h-4.9\n\tc-0.6,0-1-0.4-1-1s0.4-1,1-1h4.9c0.6,0,1,0.4,1,1S25.9,19.4,25.3,19.4z M15.8,19.4H7.1c-1.1,0-1.9-0.8-1.9-1.9V8.8\n\tC5.2,7.8,6,7,7.1,7h8.7c1.1,0,1.9,0.8,1.9,1.9v8.7C17.7,18.6,16.8,19.4,15.8,19.4z M7.2,17.4l8.4,0V9L7.2,9L7.2,17.4z M25.3,14.2\n\th-4.9c-0.6,0-1-0.4-1-1s0.4-1,1-1h4.9c0.6,0,1,0.4,1,1S25.9,14.2,25.3,14.2z M25.3,9h-4.9c-0.6,0-1-0.4-1-1s0.4-1,1-1h4.9\n\tc0.6,0,1,0.4,1,1S25.9,9,25.3,9z");
    			add_location(path, file$g, 11, 2, 244);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$g, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 42 39" },
    				{
    					style: "enable-background:new 0 0 42 39;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Newspaper_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Newspaper_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Newspaper_svg",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/phone.svg.svelte generated by Svelte v3.42.1 */

    const file$f = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/phone.svg.svelte";

    function create_fragment$f(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 15 15" },
    		{
    			style: "enable-background:new 0 0 15 15;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M12.9,14.2c-0.1,0-0.1,0-0.2,0v0c-6.3-0.6-11.3-5.7-12-12c0-0.5,0.1-0.9,0.4-1.3C1.5,0.6,2,0.4,2.5,0.4h2.3\n\tc0.8,0,1.5,0.5,1.7,1.2l0.7,2.2c0.2,0.6,0,1.3-0.4,1.8L6.4,6c0,0-0.1,0.1,0,0.2c0.7,1,1.3,1.6,2.4,2.4c0.1,0,0.1,0,0.2,0l0.4-0.4\n\tc0.5-0.5,1.2-0.6,1.8-0.4l2.2,0.7c0.7,0.2,1.2,0.9,1.2,1.7v2.3c0,0.5-0.2,1-0.6,1.3C13.7,14,13.3,14.2,12.9,14.2z M2.5,1.4\n\tc-0.2,0-0.4,0.1-0.6,0.2C1.8,1.8,1.7,1.9,1.8,2.1C2.3,8,7,12.6,12.8,13.2l0,0c0.2,0,0.4,0,0.5-0.2c0.2-0.1,0.2-0.3,0.2-0.6v-2.3\n\tc0-0.3-0.2-0.6-0.5-0.7l-2.2-0.7c-0.3-0.1-0.6,0-0.8,0.2L9.6,9.2c-0.4,0.4-1,0.4-1.4,0.1C7,8.5,6.3,7.9,5.6,6.7\n\tc-0.3-0.4-0.2-1,0.1-1.4L6.1,5c0.2-0.2,0.3-0.5,0.2-0.8L5.5,1.9C5.4,1.6,5.1,1.4,4.8,1.4H2.5z M14,5.2c-0.3,0-0.5-0.2-0.5-0.5\n\tc0-1.9-1.5-3.4-3.4-3.4c-0.3,0-0.5-0.2-0.5-0.5s0.2-0.5,0.5-0.5c2.4,0,4.4,2,4.4,4.4C14.5,5,14.3,5.2,14,5.2z M11.5,5.2\n\tC11.2,5.2,11,5,11,4.8C11,4.3,10.6,4,10.2,4C9.9,4,9.7,3.7,9.7,3.5S9.9,3,10.2,3c1,0,1.8,0.8,1.8,1.8C12,5,11.8,5.2,11.5,5.2z");
    			add_location(path, file$f, 2, 0, 225);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$f, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 15 15" },
    				{
    					style: "enable-background:new 0 0 15 15;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Phone_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Phone_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Phone_svg",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/play.svg.svelte generated by Svelte v3.42.1 */

    const file$e = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/play.svg.svelte";

    function create_fragment$e(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "fal" },
    		{ "data-icon": "play-circle" },
    		{
    			class: "svg-inline--fa fa-play-circle fa-w-16"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 512 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M256 504c137 0 248-111 248-248S393 8 256 8 8 119 8 256s111 248 248 248zM40 256c0-118.7 96.1-216 216-216 118.7 0 216 96.1 216 216 0 118.7-96.1 216-216 216-118.7 0-216-96.1-216-216zm331.7-18l-176-107c-15.8-8.8-35.7 2.5-35.7 21v208c0 18.4 19.8 29.8 35.7 21l176-101c16.4-9.1 16.4-32.8 0-42zM192 335.8V176.9c0-4.7 5.1-7.6 9.1-5.1l134.5 81.7c3.9 2.4 3.8 8.1-.1 10.3L201 341c-4 2.3-9-.6-9-5.2z");
    			add_location(path, file$e, 0, 212, 212);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$e, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "fal" },
    				{ "data-icon": "play-circle" },
    				{
    					class: "svg-inline--fa fa-play-circle fa-w-16"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 512 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Play_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Play_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Play_svg",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/rss.svg.svelte generated by Svelte v3.42.1 */

    const file$d = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/rss.svg.svelte";

    function create_fragment$d(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 24 10" },
    		{
    			style: "enable-background:new 0 0 24 10;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(path0, "d", "M0,9V0.4h3.7c0.9,0,1.6,0.1,2,0.2c0.4,0.2,0.8,0.4,1,0.8C6.9,1.9,7,2.3,7,2.8C7,3.5,6.8,4,6.5,4.4C6.1,4.8,5.5,5.1,4.8,5.2\n\tc0.4,0.2,0.7,0.5,0.9,0.7c0.2,0.3,0.6,0.7,1,1.4l1,1.7H5.6L4.4,7.1C3.9,6.5,3.6,6,3.5,5.9C3.3,5.7,3.1,5.6,3,5.5\n\tC2.8,5.4,2.5,5.4,2.1,5.4H1.7V9H0z M1.7,4H3c0.8,0,1.4,0,1.6-0.1s0.4-0.2,0.5-0.4c0.1-0.2,0.2-0.4,0.2-0.6c0-0.3-0.1-0.5-0.2-0.7\n\tC4.9,2.1,4.6,1.9,4.4,1.9c-0.1,0-0.6,0-1.3,0H1.7V4z");
    			add_location(path0, file$d, 2, 0, 225);
    			attr_dev(path1, "d", "M8.2,6.2L9.9,6c0.1,0.6,0.3,1,0.6,1.2c0.3,0.3,0.7,0.4,1.3,0.4c0.6,0,1-0.1,1.3-0.4c0.3-0.2,0.4-0.5,0.4-0.8\n\tc0-0.2-0.1-0.4-0.2-0.5c-0.1-0.1-0.3-0.3-0.6-0.4c-0.2-0.1-0.7-0.2-1.4-0.4c-0.9-0.2-1.6-0.5-2-0.8c-0.5-0.5-0.8-1-0.8-1.7\n\tc0-0.4,0.1-0.8,0.4-1.2C9.2,1.1,9.5,0.8,10,0.6c0.5-0.2,1-0.3,1.7-0.3c1.1,0,1.9,0.2,2.4,0.7c0.5,0.5,0.8,1.1,0.9,1.9l-1.7,0.1\n\tC13.2,2.5,13,2.2,12.8,2c-0.2-0.2-0.6-0.3-1.1-0.3c-0.5,0-0.9,0.1-1.2,0.3c-0.2,0.1-0.3,0.3-0.3,0.5c0,0.2,0.1,0.4,0.3,0.5\n\tc0.2,0.2,0.8,0.4,1.6,0.6c0.8,0.2,1.5,0.4,1.9,0.6c0.4,0.2,0.7,0.5,0.9,0.9c0.2,0.4,0.3,0.8,0.3,1.4c0,0.5-0.1,1-0.4,1.4\n\tc-0.3,0.4-0.7,0.8-1.2,1c-0.5,0.2-1.1,0.3-1.9,0.3c-1.1,0-1.9-0.2-2.5-0.8C8.7,7.9,8.3,7.2,8.2,6.2z");
    			add_location(path1, file$d, 6, 0, 644);
    			attr_dev(path2, "d", "M16.2,6.2L17.9,6c0.1,0.6,0.3,1,0.6,1.2c0.3,0.3,0.7,0.4,1.3,0.4c0.6,0,1-0.1,1.3-0.4c0.3-0.2,0.4-0.5,0.4-0.8\n\tc0-0.2-0.1-0.4-0.2-0.5c-0.1-0.1-0.3-0.3-0.6-0.4c-0.2-0.1-0.7-0.2-1.4-0.4c-0.9-0.2-1.6-0.5-2-0.8c-0.5-0.5-0.8-1-0.8-1.7\n\tc0-0.4,0.1-0.8,0.4-1.2c0.2-0.4,0.6-0.7,1.1-0.9c0.5-0.2,1-0.3,1.7-0.3c1.1,0,1.9,0.2,2.4,0.7c0.5,0.5,0.8,1.1,0.9,1.9l-1.7,0.1\n\tC21.2,2.5,21,2.2,20.8,2c-0.2-0.2-0.6-0.3-1.1-0.3c-0.5,0-0.9,0.1-1.2,0.3c-0.2,0.1-0.3,0.3-0.3,0.5c0,0.2,0.1,0.4,0.3,0.5\n\tc0.2,0.2,0.8,0.4,1.6,0.6c0.8,0.2,1.5,0.4,1.9,0.6c0.4,0.2,0.7,0.5,0.9,0.9c0.2,0.4,0.3,0.8,0.3,1.4c0,0.5-0.1,1-0.4,1.4\n\tc-0.3,0.4-0.7,0.8-1.2,1c-0.5,0.2-1.1,0.3-1.9,0.3c-1.1,0-1.9-0.2-2.5-0.8C16.7,7.9,16.3,7.2,16.2,6.2z");
    			add_location(path2, file$d, 12, 0, 1341);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$d, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 24 10" },
    				{
    					style: "enable-background:new 0 0 24 10;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Rss_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Rss_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Rss_svg",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/smartphone.svg.svelte generated by Svelte v3.42.1 */

    const file$c = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/smartphone.svg.svelte";

    function create_fragment$c(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 320 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M272 0H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h224c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM160 480c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm112-108c0 6.6-5.4 12-12 12H60c-6.6 0-12-5.4-12-12V60c0-6.6 5.4-12 12-12h200c6.6 0 12 5.4 12 12v312z");
    			add_location(path, file$c, 0, 76, 76);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$c, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 320 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Smartphone_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Smartphone_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Smartphone_svg",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/star-regular.svg.svelte generated by Svelte v3.42.1 */

    const file$b = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/star-regular.svg.svelte";

    function create_fragment$b(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "star" },
    		{ class: "svg-inline--fa fa-star fa-w-18" },
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 576 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM388.6 312.3l23.7 138.4L288 385.4l-124.3 65.3 23.7-138.4-100.6-98 139-20.2 62.2-126 62.2 126 139 20.2-100.6 98z");
    			add_location(path, file$b, 0, 198, 198);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$b, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "star" },
    				{ class: "svg-inline--fa fa-star fa-w-18" },
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 576 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Star_regular_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Star_regular_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Star_regular_svg",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tag-regular.svg.svelte generated by Svelte v3.42.1 */

    const file$a = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tag-regular.svg.svelte";

    function create_fragment$a(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ id: "tag-regular" },
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "tag" },
    		{ class: "svg-inline--fa fa-tag fa-w-16" },
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 512 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M497.941 225.941L286.059 14.059A48 48 0 0 0 252.118 0H48C21.49 0 0 21.49 0 48v204.118a47.998 47.998 0 0 0 14.059 33.941l211.882 211.882c18.745 18.745 49.137 18.746 67.882 0l204.118-204.118c18.745-18.745 18.745-49.137 0-67.882zM259.886 463.996L48 252.118V48h204.118L464 259.882 259.886 463.996zM192 144c0 26.51-21.49 48-48 48s-48-21.49-48-48 21.49-48 48-48 48 21.49 48 48z");
    			add_location(path, file$a, 0, 213, 213);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$a, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ id: "tag-regular" },
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "tag" },
    				{ class: "svg-inline--fa fa-tag fa-w-16" },
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 512 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tag_regular_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Tag_regular_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tag_regular_svg",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tag-solid.svg.svelte generated by Svelte v3.42.1 */

    const file$9 = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tag-solid.svg.svelte";

    function create_fragment$9(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ id: "tag-solid" },
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "fas" },
    		{ "data-icon": "tag" },
    		{ class: "svg-inline--fa fa-tag fa-w-16" },
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 512 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M0 252.118V48C0 21.49 21.49 0 48 0h204.118a48 48 0 0 1 33.941 14.059l211.882 211.882c18.745 18.745 18.745 49.137 0 67.882L293.823 497.941c-18.745 18.745-49.137 18.745-67.882 0L14.059 286.059A48 48 0 0 1 0 252.118zM112 64c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48z");
    			add_location(path, file$9, 0, 211, 211);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$9, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ id: "tag-solid" },
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "fas" },
    				{ "data-icon": "tag" },
    				{ class: "svg-inline--fa fa-tag fa-w-16" },
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 512 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tag_solid_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Tag_solid_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tag_solid_svg",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tags-regular.svg.svelte generated by Svelte v3.42.1 */

    const file$8 = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tags-regular.svg.svelte";

    function create_fragment$8(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ id: "tags-regular" },
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "tags" },
    		{ class: "svg-inline--fa fa-tags fa-w-20" },
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 640 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M625.941 293.823L421.823 497.941c-18.746 18.746-49.138 18.745-67.882 0l-.36-.36L592 259.882 331.397 0h48.721a48 48 0 0 1 33.941 14.059l211.882 211.882c18.745 18.745 18.745 49.137 0 67.882zm-128 0L293.823 497.941C284.451 507.314 272.166 512 259.882 512c-12.284 0-24.569-4.686-33.941-14.059L14.059 286.059A48 48 0 0 1 0 252.118V48C0 21.49 21.49 0 48 0h204.118a47.998 47.998 0 0 1 33.941 14.059l211.882 211.882c18.745 18.745 18.745 49.137 0 67.882zM464 259.882L252.118 48H48v204.118l211.886 211.878L464 259.882zM144 96c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48z");
    			add_location(path, file$8, 0, 216, 216);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ id: "tags-regular" },
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "tags" },
    				{ class: "svg-inline--fa fa-tags fa-w-20" },
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 640 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tags_regular_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Tags_regular_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tags_regular_svg",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tags-solid.svg.svelte generated by Svelte v3.42.1 */

    const file$7 = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/tags-solid.svg.svelte";

    function create_fragment$7(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ id: "tags-solid" },
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "fas" },
    		{ "data-icon": "tags" },
    		{ class: "svg-inline--fa fa-tags fa-w-20" },
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 640 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M497.941 225.941L286.059 14.059A48 48 0 0 0 252.118 0H48C21.49 0 0 21.49 0 48v204.118a48 48 0 0 0 14.059 33.941l211.882 211.882c18.744 18.745 49.136 18.746 67.882 0l204.118-204.118c18.745-18.745 18.745-49.137 0-67.882zM112 160c-26.51 0-48-21.49-48-48s21.49-48 48-48 48 21.49 48 48-21.49 48-48 48zm513.941 133.823L421.823 497.941c-18.745 18.745-49.137 18.745-67.882 0l-.36-.36L527.64 323.522c16.999-16.999 26.36-39.6 26.36-63.64s-9.362-46.641-26.36-63.64L331.397 0h48.721a48 48 0 0 1 33.941 14.059l211.882 211.882c18.745 18.745 18.745 49.137 0 67.882z");
    			add_location(path, file$7, 0, 214, 214);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ id: "tags-solid" },
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "fas" },
    				{ "data-icon": "tags" },
    				{ class: "svg-inline--fa fa-tags fa-w-20" },
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 640 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tags_solid_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Tags_solid_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tags_solid_svg",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/toggle-off.svg.svelte generated by Svelte v3.42.1 */

    const file$6 = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/toggle-off.svg.svelte";

    function create_fragment$6(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "toggle-off" },
    		{
    			class: "svg-inline--fa fa-toggle-off fa-w-18"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 576 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M384 64H192C85.961 64 0 149.961 0 256s85.961 192 192 192h192c106.039 0 192-85.961 192-192S490.039 64 384 64zM48 256c0-79.583 64.404-144 144-144 79.582 0 144 64.404 144 144 0 79.582-64.404 144-144 144-79.582 0-144-64.404-144-144zm336 144h-65.02c86.704-76.515 86.683-211.504 0-288H384c79.582 0 144 64.404 144 144 0 79.582-64.404 144-144 144z");
    			add_location(path, file$6, 0, 210, 210);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "toggle-off" },
    				{
    					class: "svg-inline--fa fa-toggle-off fa-w-18"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 576 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Toggle_off_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Toggle_off_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toggle_off_svg",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/toggle-on.svg.svelte generated by Svelte v3.42.1 */

    const file$5 = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/toggle-on.svg.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ "aria-hidden": "true" },
    		{ focusable: "false" },
    		{ "data-prefix": "far" },
    		{ "data-icon": "toggle-on" },
    		{
    			class: "svg-inline--fa fa-toggle-on fa-w-18"
    		},
    		{ role: "img" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{ viewBox: "0 0 576 512" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M384 64H192C86 64 0 150 0 256s86 192 192 192h192c106 0 192-86 192-192S490 64 384 64zm0 336c-79.6 0-144-64.4-144-144s64.4-144 144-144 144 64.4 144 144-64.4 144-144 144z");
    			add_location(path, file$5, 0, 208, 208);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ "aria-hidden": "true" },
    				{ focusable: "false" },
    				{ "data-prefix": "far" },
    				{ "data-icon": "toggle-on" },
    				{
    					class: "svg-inline--fa fa-toggle-on fa-w-18"
    				},
    				{ role: "img" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{ viewBox: "0 0 576 512" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Toggle_on_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Toggle_on_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toggle_on_svg",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/video.svg.svelte generated by Svelte v3.42.1 */

    const file$4 = "node_modules/@ekstra-bladet/designsystem/src/components/icon/svgs/video.svg.svelte";

    function create_fragment$4(ctx) {
    	let svg;
    	let path;

    	let svg_levels = [
    		{ version: "1.1" },
    		{ id: "Layer_1" },
    		{ xmlns: "http://www.w3.org/2000/svg" },
    		{
    			"xmlns:xlink": "http://www.w3.org/1999/xlink"
    		},
    		{ x: "0px" },
    		{ y: "0px" },
    		{ viewBox: "0 0 51 48" },
    		{
    			style: "enable-background:new 0 0 51 48;"
    		},
    		{ "xml:space": "preserve" },
    		/*$$props*/ ctx[0]
    	];

    	let svg_data = {};

    	for (let i = 0; i < svg_levels.length; i += 1) {
    		svg_data = assign(svg_data, svg_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M45,47.5H6.1c-3.1,0-5.6-2.5-5.6-5.6V6.1C0.5,3,3,0.5,6.1,0.5H45c3.1,0,5.6,2.5,5.6,5.6v35.8\n\tC50.6,45,48.1,47.5,45,47.5z M6.1,3.5c-1.4,0-2.6,1.2-2.6,2.6v35.8c0,1.4,1.2,2.6,2.6,2.6H45c1.4,0,2.6-1.2,2.6-2.6V6.1\n\tc0-1.4-1.2-2.6-2.6-2.6H6.1z M30.7,43.4c-2.1,0-3.5-1.5-3.5-3.5v-0.5h-19c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h19v-0.5\n\tc0-2.1,1.5-3.5,3.5-3.5s3.5,1.5,3.5,3.5v0.5H43c0.8,0,1.5,0.7,1.5,1.5s-0.7,1.5-1.5,1.5h-8.7v0.5C34.2,41.9,32.8,43.4,30.7,43.4z\n\t M30.1,37.8v2c0,0.4,0.1,0.5,0.5,0.5s0.5-0.1,0.5-0.5v-4.1c0-0.4-0.1-0.5-0.5-0.5s-0.5,0.1-0.5,0.5V37.8z M20.2,30.3\n\tc-0.5,0-0.9-0.1-1.3-0.4c-0.8-0.5-1.3-1.3-1.3-2.3V13.7c0-1,0.6-1.9,1.4-2.4c0.9-0.5,1.9-0.4,2.6,0.1l12,6.9\n\tc0.8,0.4,1.4,1.3,1.4,2.3c0,1-0.6,1.9-1.4,2.4l-12,6.9c0,0-0.1,0-0.1,0C21.1,30.2,20.6,30.3,20.2,30.3z M20.8,28.7L20.8,28.7\n\tL20.8,28.7z M20.9,27.6C20.9,27.6,20.9,27.6,20.9,27.6C20.9,27.6,20.9,27.6,20.9,27.6z M20.7,14.3V27l11-6.3L20.7,14.3z M32.2,21\n\tC32.2,21,32.2,21,32.2,21L32.2,21z M32.2,20.4C32.2,20.4,32.2,20.4,32.2,20.4L32.2,20.4z M19.8,13.8C19.8,13.8,19.8,13.8,19.8,13.8\n\tC19.8,13.8,19.8,13.8,19.8,13.8z");
    			add_location(path, file$4, 11, 2, 244);
    			set_svg_attributes(svg, svg_data);
    			add_location(svg, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			set_svg_attributes(svg, svg_data = get_spread_update(svg_levels, [
    				{ version: "1.1" },
    				{ id: "Layer_1" },
    				{ xmlns: "http://www.w3.org/2000/svg" },
    				{
    					"xmlns:xlink": "http://www.w3.org/1999/xlink"
    				},
    				{ x: "0px" },
    				{ y: "0px" },
    				{ viewBox: "0 0 51 48" },
    				{
    					style: "enable-background:new 0 0 51 48;"
    				},
    				{ "xml:space": "preserve" },
    				dirty & /*$$props*/ 1 && /*$$props*/ ctx[0]
    			]));
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Video_svg', slots, []);

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class Video_svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Video_svg",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    var IconSVGS = /*#__PURE__*/Object.freeze({
        __proto__: null,
        angledown: Angle_down_svg,
        angleleft: Angle_left_svg,
        angleright: Angle_right_svg,
        angleup: Angle_up_svg,
        article: Article_svg,
        at: At_svg,
        check: Check_svg,
        clock: Clock_svg,
        creditcard: Creditcard_svg,
        ebplus_icon: Ebplus_icon_svg,
        ebplus_sort: Ebplus_sort_svg,
        envelope: Envelope_svg,
        figcaptionpin: Figcaption_pin_svg,
        gallery: Gallery_svg,
        headphones: Headphones_svg,
        headset: Headset_svg,
        historyregular: History_regular_svg,
        lockold: Lock_old_svg,
        lock: Lock_svg,
        medielogin: Medielogin_svg,
        menubars: Menu_bars_svg,
        mitebregular: Miteb_regular_svg,
        mitebsolid: Miteb_solid_svg,
        newspaper: Newspaper_svg,
        phone: Phone_svg,
        play: Play_svg,
        rss: Rss_svg,
        smartphone: Smartphone_svg,
        starregular: Star_regular_svg,
        tagregular: Tag_regular_svg,
        tagsolid: Tag_solid_svg,
        tagsregular: Tags_regular_svg,
        tagssolid: Tags_solid_svg,
        toggleoff: Toggle_off_svg,
        toggleon: Toggle_on_svg,
        video: Video_svg
    });

    /* node_modules/@ekstra-bladet/designsystem/src/components/icon/Icon.svelte generated by Svelte v3.42.1 */

    const { Object: Object_1 } = globals;
    const file$3 = "node_modules/@ekstra-bladet/designsystem/src/components/icon/Icon.svelte";

    // (20:0) {:else}
    function create_else_block$2(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", /*className*/ ctx[1]);
    			attr_dev(i, "style", /*style*/ ctx[0]);
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$3, 20, 2, 794);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*className*/ 2) {
    				attr_dev(i, "class", /*className*/ ctx[1]);
    			}

    			if (dirty & /*style*/ 1) {
    				attr_dev(i, "style", /*style*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(20:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (18:0) {#if type === 'svg'}
    function create_if_block$2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = allSVGs[/*name*/ ctx[2].replace('-', '')];

    	function switch_props(ctx) {
    		return {
    			props: {
    				style: /*style*/ ctx[0],
    				class: /*baseClass*/ ctx[5],
    				"data-flipped": /*flipped*/ ctx[3]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("click", /*click_handler*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*style*/ 1) switch_instance_changes.style = /*style*/ ctx[0];
    			if (dirty & /*flipped*/ 8) switch_instance_changes["data-flipped"] = /*flipped*/ ctx[3];

    			if (switch_value !== (switch_value = allSVGs[/*name*/ ctx[2].replace('-', '')])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("click", /*click_handler*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(18:0) {#if type === 'svg'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[4] === 'svg') return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }


    const allSVGs = Object.assign(Object.assign({}, GraphicSVGS), IconSVGS);

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Icon', slots, []);
    	let { className = undefined } = $$props;
    	let { name = undefined } = $$props;
    	let { flipped = false } = $$props;
    	let { type = 'svg' } = $$props;
    	let { width = 36 } = $$props;
    	let { style = undefined } = $$props;

    	const defaultStyle = type === 'svg'
    	? `width: ${width}px; height: ${width}px;`
    	: '';

    	let baseClass = className ? `icon-svg ${className}` : 'icon-svg';
    	const writable_props = ['className', 'name', 'flipped', 'type', 'width', 'style'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('className' in $$props) $$invalidate(1, className = $$props.className);
    		if ('name' in $$props) $$invalidate(2, name = $$props.name);
    		if ('flipped' in $$props) $$invalidate(3, flipped = $$props.flipped);
    		if ('type' in $$props) $$invalidate(4, type = $$props.type);
    		if ('width' in $$props) $$invalidate(6, width = $$props.width);
    		if ('style' in $$props) $$invalidate(0, style = $$props.style);
    	};

    	$$self.$capture_state = () => ({
    		IconSVGS,
    		GraphicSVGS,
    		allSVGs,
    		className,
    		name,
    		flipped,
    		type,
    		width,
    		style,
    		defaultStyle,
    		baseClass
    	});

    	$$self.$inject_state = $$props => {
    		if ('className' in $$props) $$invalidate(1, className = $$props.className);
    		if ('name' in $$props) $$invalidate(2, name = $$props.name);
    		if ('flipped' in $$props) $$invalidate(3, flipped = $$props.flipped);
    		if ('type' in $$props) $$invalidate(4, type = $$props.type);
    		if ('width' in $$props) $$invalidate(6, width = $$props.width);
    		if ('style' in $$props) $$invalidate(0, style = $$props.style);
    		if ('baseClass' in $$props) $$invalidate(5, baseClass = $$props.baseClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*style*/ 1) {
    			$$invalidate(0, style = style ? `${defaultStyle} ${style}` : defaultStyle);
    		}
    	};

    	return [style, className, name, flipped, type, baseClass, width, click_handler];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			className: 1,
    			name: 2,
    			flipped: 3,
    			type: 4,
    			width: 6,
    			style: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get className() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set className(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flipped() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flipped(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/badge/Badge.svelte generated by Svelte v3.42.1 */

    const file$2 = "node_modules/@ekstra-bladet/designsystem/src/components/badge/Badge.svelte";

    // (22:0) {:else}
    function create_else_block$1(ctx) {
    	let span;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			attr_dev(span, "class", /*cssClass*/ ctx[3]);
    			attr_dev(span, "style", /*style*/ ctx[1]);
    			attr_dev(span, "data-type", /*type*/ ctx[2]);
    			add_location(span, file$2, 22, 2, 593);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*click_handler_1*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[7],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*cssClass*/ 8) {
    				attr_dev(span, "class", /*cssClass*/ ctx[3]);
    			}

    			if (!current || dirty & /*style*/ 2) {
    				attr_dev(span, "style", /*style*/ ctx[1]);
    			}

    			if (!current || dirty & /*type*/ 4) {
    				attr_dev(span, "data-type", /*type*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(22:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (18:0) {#if href}
    function create_if_block$1(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "href", /*href*/ ctx[0]);
    			attr_dev(a, "class", /*cssClass*/ ctx[3]);
    			attr_dev(a, "style", /*style*/ ctx[1]);
    			attr_dev(a, "data-type", /*type*/ ctx[2]);
    			add_location(a, file$2, 18, 2, 501);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*click_handler*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 128)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[7],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*href*/ 1) {
    				attr_dev(a, "href", /*href*/ ctx[0]);
    			}

    			if (!current || dirty & /*cssClass*/ 8) {
    				attr_dev(a, "class", /*cssClass*/ ctx[3]);
    			}

    			if (!current || dirty & /*style*/ 2) {
    				attr_dev(a, "style", /*style*/ ctx[1]);
    			}

    			if (!current || dirty & /*type*/ 4) {
    				attr_dev(a, "data-type", /*type*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(18:0) {#if href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let cssClass;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Badge', slots, ['default']);
    	let { className = '' } = $$props;
    	let { extension = undefined } = $$props;
    	let { href = undefined } = $$props;
    	let { style = undefined } = $$props;
    	let { type = undefined } = $$props;
    	let baseClass = 'badge';

    	if (extension) {
    		if (typeof extension === 'string') {
    			baseClass = `${baseClass} badge--${extension}`;
    		} else if (Array.isArray(extension)) {
    			baseClass = `${baseClass} badge--${extension.join(' badge--')}`;
    		}
    	}

    	const writable_props = ['className', 'extension', 'href', 'style', 'type'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Badge> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function click_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('className' in $$props) $$invalidate(4, className = $$props.className);
    		if ('extension' in $$props) $$invalidate(5, extension = $$props.extension);
    		if ('href' in $$props) $$invalidate(0, href = $$props.href);
    		if ('style' in $$props) $$invalidate(1, style = $$props.style);
    		if ('type' in $$props) $$invalidate(2, type = $$props.type);
    		if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		className,
    		extension,
    		href,
    		style,
    		type,
    		baseClass,
    		cssClass
    	});

    	$$self.$inject_state = $$props => {
    		if ('className' in $$props) $$invalidate(4, className = $$props.className);
    		if ('extension' in $$props) $$invalidate(5, extension = $$props.extension);
    		if ('href' in $$props) $$invalidate(0, href = $$props.href);
    		if ('style' in $$props) $$invalidate(1, style = $$props.style);
    		if ('type' in $$props) $$invalidate(2, type = $$props.type);
    		if ('baseClass' in $$props) $$invalidate(6, baseClass = $$props.baseClass);
    		if ('cssClass' in $$props) $$invalidate(3, cssClass = $$props.cssClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*baseClass, className*/ 80) {
    			$$invalidate(3, cssClass = `${baseClass} ${className}`);
    		}
    	};

    	return [
    		href,
    		style,
    		type,
    		cssClass,
    		className,
    		extension,
    		baseClass,
    		$$scope,
    		slots,
    		click_handler,
    		click_handler_1
    	];
    }

    class Badge extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			className: 4,
    			extension: 5,
    			href: 0,
    			style: 1,
    			type: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Badge",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get className() {
    		throw new Error("<Badge>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set className(value) {
    		throw new Error("<Badge>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get extension() {
    		throw new Error("<Badge>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set extension(value) {
    		throw new Error("<Badge>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Badge>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Badge>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Badge>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Badge>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Badge>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Badge>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/@ekstra-bladet/designsystem/src/components/buttongroup/ButtonGroup.svelte generated by Svelte v3.42.1 */

    const BUTTONS = {};

    /* node_modules/@ekstra-bladet/designsystem/src/components/button/Button.svelte generated by Svelte v3.42.1 */
    const file$1 = "node_modules/@ekstra-bladet/designsystem/src/components/button/Button.svelte";

    // (48:0) {:else}
    function create_else_block(ctx) {
    	let button_1;
    	let button_1_data_selected_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], null);

    	const block = {
    		c: function create() {
    			button_1 = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button_1, "class", /*cssClass*/ ctx[4]);
    			button_1.disabled = /*disabled*/ ctx[0];
    			attr_dev(button_1, "data-selected", button_1_data_selected_value = /*$selectedButton*/ ctx[5] === /*button*/ ctx[6]);
    			add_location(button_1, file$1, 48, 2, 1400);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button_1, anchor);

    			if (default_slot) {
    				default_slot.m(button_1, null);
    			}

    			/*button_1_binding*/ ctx[18](button_1);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button_1, "click", /*click_handler_1*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8192)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[13],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[13], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*cssClass*/ 16) {
    				attr_dev(button_1, "class", /*cssClass*/ ctx[4]);
    			}

    			if (!current || dirty & /*disabled*/ 1) {
    				prop_dev(button_1, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (!current || dirty & /*$selectedButton*/ 32 && button_1_data_selected_value !== (button_1_data_selected_value = /*$selectedButton*/ ctx[5] === /*button*/ ctx[6])) {
    				attr_dev(button_1, "data-selected", button_1_data_selected_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button_1);
    			if (default_slot) default_slot.d(detaching);
    			/*button_1_binding*/ ctx[18](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(48:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (44:0) {#if href}
    function create_if_block(ctx) {
    	let a;
    	let a_data_selected_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "href", /*href*/ ctx[1]);
    			attr_dev(a, "class", /*cssClass*/ ctx[4]);
    			attr_dev(a, "disabled", /*disabled*/ ctx[0]);
    			attr_dev(a, "data-selected", a_data_selected_value = /*$selectedButton*/ ctx[5] === /*button*/ ctx[6]);
    			add_location(a, file$1, 44, 2, 1258);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			/*a_binding*/ ctx[17](a);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*click_handler*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8192)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[13],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[13], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*href*/ 2) {
    				attr_dev(a, "href", /*href*/ ctx[1]);
    			}

    			if (!current || dirty & /*cssClass*/ 16) {
    				attr_dev(a, "class", /*cssClass*/ ctx[4]);
    			}

    			if (!current || dirty & /*disabled*/ 1) {
    				attr_dev(a, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (!current || dirty & /*$selectedButton*/ 32 && a_data_selected_value !== (a_data_selected_value = /*$selectedButton*/ ctx[5] === /*button*/ ctx[6])) {
    				attr_dev(a, "data-selected", a_data_selected_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			/*a_binding*/ ctx[17](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(44:0) {#if href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*href*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let cssClass;

    	let $selectedButton,
    		$$unsubscribe_selectedButton = noop,
    		$$subscribe_selectedButton = () => ($$unsubscribe_selectedButton(), $$unsubscribe_selectedButton = subscribe(selectedButton, $$value => $$invalidate(5, $selectedButton = $$value)), selectedButton);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_selectedButton());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Button', slots, ['default']);
    	let { className = undefined } = $$props;
    	let { disabled = false } = $$props;
    	let { extension = undefined } = $$props;
    	let { href = undefined } = $$props;
    	let { size = undefined } = $$props;
    	let { type = undefined } = $$props;
    	let baseClass = 'button';

    	if (extension) {
    		let extSplit = extension.split(' ');

    		extSplit.forEach(extClass => {
    			$$invalidate(12, baseClass = `${baseClass} button--${extClass}`);
    		});
    	}

    	if (size) {
    		baseClass = `${baseClass} button--${size}`;
    	}

    	if (type) {
    		baseClass = `${baseClass} button--${type}`;
    	}

    	let buttonEl;
    	let { initial = false } = $$props;
    	let registerTab, selectButton, selectedButton;
    	const button = {};
    	const contextButtons = getContext(BUTTONS);

    	if (contextButtons) {
    		registerTab = contextButtons.registerTab;
    		selectButton = contextButtons.selectButton;
    		$$subscribe_selectedButton(selectedButton = contextButtons.selectedButton);
    		registerTab(button);

    		if (initial) {
    			selectButton(button);
    		}
    	}

    	onMount(() => {
    		if (typeof selectButton !== 'undefined') {
    			buttonEl.addEventListener('click', () => selectButton(button));
    		}
    	});

    	const writable_props = ['className', 'disabled', 'extension', 'href', 'size', 'type', 'initial'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function click_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	function a_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			buttonEl = $$value;
    			$$invalidate(2, buttonEl);
    		});
    	}

    	function button_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			buttonEl = $$value;
    			$$invalidate(2, buttonEl);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('className' in $$props) $$invalidate(7, className = $$props.className);
    		if ('disabled' in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ('extension' in $$props) $$invalidate(8, extension = $$props.extension);
    		if ('href' in $$props) $$invalidate(1, href = $$props.href);
    		if ('size' in $$props) $$invalidate(9, size = $$props.size);
    		if ('type' in $$props) $$invalidate(10, type = $$props.type);
    		if ('initial' in $$props) $$invalidate(11, initial = $$props.initial);
    		if ('$$scope' in $$props) $$invalidate(13, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		className,
    		disabled,
    		extension,
    		href,
    		size,
    		type,
    		baseClass,
    		buttonEl,
    		getContext,
    		onMount,
    		BUTTONS,
    		initial,
    		registerTab,
    		selectButton,
    		selectedButton,
    		button,
    		contextButtons,
    		cssClass,
    		$selectedButton
    	});

    	$$self.$inject_state = $$props => {
    		if ('className' in $$props) $$invalidate(7, className = $$props.className);
    		if ('disabled' in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ('extension' in $$props) $$invalidate(8, extension = $$props.extension);
    		if ('href' in $$props) $$invalidate(1, href = $$props.href);
    		if ('size' in $$props) $$invalidate(9, size = $$props.size);
    		if ('type' in $$props) $$invalidate(10, type = $$props.type);
    		if ('baseClass' in $$props) $$invalidate(12, baseClass = $$props.baseClass);
    		if ('buttonEl' in $$props) $$invalidate(2, buttonEl = $$props.buttonEl);
    		if ('initial' in $$props) $$invalidate(11, initial = $$props.initial);
    		if ('registerTab' in $$props) registerTab = $$props.registerTab;
    		if ('selectButton' in $$props) selectButton = $$props.selectButton;
    		if ('selectedButton' in $$props) $$subscribe_selectedButton($$invalidate(3, selectedButton = $$props.selectedButton));
    		if ('cssClass' in $$props) $$invalidate(4, cssClass = $$props.cssClass);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*className, baseClass*/ 4224) {
    			$$invalidate(4, cssClass = className ? `${baseClass} ${className}` : baseClass);
    		}
    	};

    	return [
    		disabled,
    		href,
    		buttonEl,
    		selectedButton,
    		cssClass,
    		$selectedButton,
    		button,
    		className,
    		extension,
    		size,
    		type,
    		initial,
    		baseClass,
    		$$scope,
    		slots,
    		click_handler,
    		click_handler_1,
    		a_binding,
    		button_1_binding
    	];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			className: 7,
    			disabled: 0,
    			extension: 8,
    			href: 1,
    			size: 9,
    			type: 10,
    			initial: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get className() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set className(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get extension() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set extension(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get initial() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set initial(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.42.1 */
    const file = "src/App.svelte";

    // (17:4) <Button>
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Her!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(17:4) <Button>",
    		ctx
    	});

    	return block;
    }

    // (19:4) <Badge>
    function create_default_slot_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Her er et Badge");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(19:4) <Badge>",
    		ctx
    	});

    	return block;
    }

    // (20:4) <Badge type="primary">
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("primary");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(20:4) <Badge type=\\\"primary\\\">",
    		ctx
    	});

    	return block;
    }

    // (21:4) <Badge type="secondary">
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("secondary");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(21:4) <Badge type=\\\"secondary\\\">",
    		ctx
    	});

    	return block;
    }

    // (22:4) <Badge type="success">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("success");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(22:4) <Badge type=\\\"success\\\">",
    		ctx
    	});

    	return block;
    }

    // (23:4) <Badge type="danger">
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("danger");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(23:4) <Badge type=\\\"danger\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let main;
    	let h1;
    	let icon;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p0;
    	let t4;
    	let a0;
    	let t6;
    	let t7;
    	let p1;
    	let t8;
    	let a1;
    	let t10;
    	let t11;
    	let button;
    	let t12;
    	let accordion;
    	let t13;
    	let badge0;
    	let t14;
    	let badge1;
    	let t15;
    	let badge2;
    	let t16;
    	let badge3;
    	let t17;
    	let badge4;
    	let current;

    	icon = new Icon({
    			props: { name: "ekstrabladet" },
    			$$inline: true
    		});

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	accordion = new Accordion({
    			props: {
    				dataTheme: "lightmode",
    				tabs: /*tabs*/ ctx[1]
    			},
    			$$inline: true
    		});

    	badge0 = new Badge({
    			props: {
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	badge1 = new Badge({
    			props: {
    				type: "primary",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	badge2 = new Badge({
    			props: {
    				type: "secondary",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	badge3 = new Badge({
    			props: {
    				type: "success",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	badge4 = new Badge({
    			props: {
    				type: "danger",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			main = element("main");
    			h1 = element("h1");
    			create_component(icon.$$.fragment);
    			t0 = text(" Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			p0 = element("p");
    			t4 = text("Visit the ");
    			a0 = element("a");
    			a0.textContent = "Svelte tutorial";
    			t6 = text(" to learn how to build Svelte apps.");
    			t7 = space();
    			p1 = element("p");
    			t8 = text("And visit the ");
    			a1 = element("a");
    			a1.textContent = "Designsystem documentation";
    			t10 = text(" to\n      learn how the designsystem works");
    			t11 = space();
    			create_component(button.$$.fragment);
    			t12 = space();
    			create_component(accordion.$$.fragment);
    			t13 = space();
    			create_component(badge0.$$.fragment);
    			t14 = space();
    			create_component(badge1.$$.fragment);
    			t15 = space();
    			create_component(badge2.$$.fragment);
    			t16 = space();
    			create_component(badge3.$$.fragment);
    			t17 = space();
    			create_component(badge4.$$.fragment);
    			add_location(h1, file, 8, 4, 320);
    			attr_dev(a0, "href", "https://svelte.dev/tutorial");
    			add_location(a0, file, 10, 16, 396);
    			add_location(p0, file, 9, 4, 376);
    			attr_dev(a1, "href", "https://ekstrabladetudvikling.github.io/eb-designsystem/");
    			add_location(a1, file, 13, 20, 526);
    			add_location(p1, file, 12, 4, 502);
    			attr_dev(main, "class", "grid-width--medium");
    			add_location(main, file, 7, 2, 282);
    			attr_dev(div, "class", "flex flex-justify--center");
    			add_location(div, file, 6, 0, 240);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, main);
    			append_dev(main, h1);
    			mount_component(icon, h1, null);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(main, t3);
    			append_dev(main, p0);
    			append_dev(p0, t4);
    			append_dev(p0, a0);
    			append_dev(p0, t6);
    			append_dev(main, t7);
    			append_dev(main, p1);
    			append_dev(p1, t8);
    			append_dev(p1, a1);
    			append_dev(p1, t10);
    			append_dev(main, t11);
    			mount_component(button, main, null);
    			append_dev(main, t12);
    			mount_component(accordion, main, null);
    			append_dev(main, t13);
    			mount_component(badge0, main, null);
    			append_dev(main, t14);
    			mount_component(badge1, main, null);
    			append_dev(main, t15);
    			mount_component(badge2, main, null);
    			append_dev(main, t16);
    			mount_component(badge3, main, null);
    			append_dev(main, t17);
    			mount_component(badge4, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    			const badge0_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				badge0_changes.$$scope = { dirty, ctx };
    			}

    			badge0.$set(badge0_changes);
    			const badge1_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				badge1_changes.$$scope = { dirty, ctx };
    			}

    			badge1.$set(badge1_changes);
    			const badge2_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				badge2_changes.$$scope = { dirty, ctx };
    			}

    			badge2.$set(badge2_changes);
    			const badge3_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				badge3_changes.$$scope = { dirty, ctx };
    			}

    			badge3.$set(badge3_changes);
    			const badge4_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				badge4_changes.$$scope = { dirty, ctx };
    			}

    			badge4.$set(badge4_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			transition_in(accordion.$$.fragment, local);
    			transition_in(badge0.$$.fragment, local);
    			transition_in(badge1.$$.fragment, local);
    			transition_in(badge2.$$.fragment, local);
    			transition_in(badge3.$$.fragment, local);
    			transition_in(badge4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			transition_out(accordion.$$.fragment, local);
    			transition_out(badge0.$$.fragment, local);
    			transition_out(badge1.$$.fragment, local);
    			transition_out(badge2.$$.fragment, local);
    			transition_out(badge3.$$.fragment, local);
    			transition_out(badge4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    			destroy_component(button);
    			destroy_component(accordion);
    			destroy_component(badge0);
    			destroy_component(badge1);
    			destroy_component(badge2);
    			destroy_component(badge3);
    			destroy_component(badge4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	let tabs = [{ content: 'flurps', title: 'Step 1' }];
    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		Accordion,
    		Badge,
    		Button,
    		Icon,
    		name,
    		tabs
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('tabs' in $$props) $$invalidate(1, tabs = $$props.tabs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, tabs];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'Ekstra Bladet',
        },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
