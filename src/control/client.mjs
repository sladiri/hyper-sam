import { wire, bind } from "hyperhtml/esm";
import { Connect } from "./connect";

export const setupSamHyperHtmlContainer = async ({
    app,
    state,
    rootElement,
    accept,
    actions,
    nextAction,
}) => {
    const idComponentMap = new WeakMap();
    const wiresMap = new Map();
    const namespaceSet = new Set();
    let defaultProps;
    let props;
    const render = ({ state, actions }) => {
        wiresMap.clear();
        namespaceSet.clear();
        if (!defaultProps) {
            actions.dispatch = Dispatch({ actions });
            Object.seal(actions);
            defaultProps = Object.assign(Object.create(null), {
                state,
                actions,
                dispatch: Dispatch({ actions }),
                _wire: wire,
            });
            defaultProps._connect = Connect({
                wire,
                defaultProps,
                idComponentMap,
                wiresMap,
                namespaceSet,
                globalState: state,
            });
            props = defaultProps;
        }
        props._namespace = [];
        Object.seal(props);
        const { title, rand } = state;
        const appString = defaultProps._connect()(app, { title, rand });
        return bind(rootElement)`${appString}`;
    };
    const propose = Propose({
        state,
        accept,
        render: () => render({ state, actions: actionsWrapped }),
        nextAction: () => nextAction({ state, actions: actionsWrapped }),
    });
    const actionsWithMetaData = Object.entries(actions).reduce(
        (acc, [name, Fn]) => {
            const proposeWrapper = (proposal, cancellable) => {
                return propose({ name, proposal, cancellable });
            };
            return Object.assign(acc, {
                [name]: Fn(proposeWrapper),
            });
        },
        Object.create(null),
    );
    const actionsWrapped = Object.assign(
        Object.create(null),
        { route: defaultRouteAction({ propose }) },
        actionsWithMetaData,
    );
    await setupRouting({ route: actionsWrapped.route });
    return {
        accept,
        actions: actionsWrapped,
        render: () => render({ state, actions: actionsWrapped }),
    };
};

export const Dispatch = ({ actions }) => (name, handler, ...args) => {
    return async function(event) {
        await handler(...args).apply(this, [event, actions[name]]);
    };
};

// setImmediate is broken because of webpack-env + mjs https://github.com/webpack/webpack/issues/7032
const setImmediate = func => {
    return setTimeout(func, 0);
};

export const Propose = ({
    state,
    accept,
    render,
    nextAction = () => {},
    inProgress = new Map(),
}) => async ({ name, proposal, cancellable }) => {
    try {
        console.assert(
            typeof name === "string",
            "propose: typeof name === 'string'",
        );
        console.assert(!!proposal, "propose: !!proposal");
        if (state.busy) {
            console.warn(
                `Ignored action because model is still processing previous action [${name}]`,
            );
            return false;
        }
        const cancelId = Math.random();
        if (cancellable) {
            const { pendingId, cancelled } = inProgress.get(name) || {};
            if (!pendingId) {
                inProgress.set(name, { pendingId: cancelId, cancelled: false });
            }
            if (pendingId && pendingId !== cancelId) {
                inProgress.set(name, {
                    pendingId,
                    cancelled: true,
                });
                return;
            }
        }
        const data = await proposal;
        if (cancellable) {
            console.assert(
                typeof inProgress.get(name) === "object" &&
                    inProgress.get(name) !== null,
                "ClientApp: typeof inProgress.get(name) === 'object' && inProgress.get(name) !== null",
            );
            const { pendingId, cancelled } = inProgress.get(name);
            console.assert(
                pendingId === cancelId,
                "propose: pendingId === cancelId",
            );
            if (cancelled) {
                inProgress.set(name, { pendingId: null });
                return;
            }
        }
        inProgress.set(name, { pendingId: null });
        if (!data) {
            return;
        }
        console.assert(!state.busy, "propose: !state.busy");
        state._busy = true;
        render();
        await accept({ state, proposal: data });
        state.busy = false;
        render();
        setImmediate(nextAction);
    } catch (error) {
        console.error("Propose error", error);
        throw error;
    }
};

export const routeRegex = /^\/(.+)?$/;
export const defaultRouteAction = ({ propose }) => ({ oldPath, location }) => {
    if (oldPath === location.href) {
        return;
    }
    const [, route = "home"] = routeRegex.exec(location.pathname) || [];
    const params = new URLSearchParams(location.search);
    let query = [...params.keys()].reduce(
        (keys, key) => keys.add(key),
        new Set(),
    );
    query = [...query.values()].reduce(
        (obj, key) => Object.assign(obj, { [key]: params.getAll(key) }),
        Object.create(null),
    );
    return propose({ name: "route", proposal: { route, query } });
};

export const setupRouting = async ({ route }) => {
    if (!route) {
        // no route action present.
        return;
    }
    console.assert(window, "window");
    await import("onpushstate");
    window["onpushstate"] = async event => {
        if (event.state) {
            // history changed because of pushState/replaceState
            await route({
                oldPath: event.state,
                location: window.location,
            });
        } else {
            // history changed because of a page load
        }
    };
};

export const restoreSsrState = ({ rootElement }) => {
    const dataElement = document.getElementById("app-ssr-data");
    console.assert(dataElement && dataElement.value, "dataElement.value");
    const state = Object.assign(
        Object.create(null),
        JSON.parse(dataElement.value),
    );
    rootElement.removeChild(dataElement);
    return state;
};

export const replayIntermediateEvents = async ({ actions }) => {
    console.assert(window["dispatcher"].toReplay, "dispatcher.toReplay");
    console.log(`replaying [${window["dispatcher"].toReplay.length}] actions`);
    for (const entry of window["dispatcher"].toReplay) {
        console.log("replaying entry", entry);
        const { handler, args, name, target, event } = entry;
        const action = handler.apply(null, args);
        const hook = actions[name];
        await action.apply(target, [event, hook]);
    }
    console.log("replaying end");
};
