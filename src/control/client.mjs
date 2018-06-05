import { wire, bind } from "hyperhtml/esm";
import { Connect } from "./connect";

export const setupSamHyperHtmlContainer = async ({
    app,
    state,
    rootElement,
    Accept,
    Actions,
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
            props = Object.assign(Object.create(null), defaultProps);
        }
        props._namespace = [];
        const { title, rand } = state;
        const appString = defaultProps._connect()(app, { title, rand });
        return bind(rootElement)`${appString}`;
    };
    const accept = Accept({ state });
    const propose = Propose({
        accept,
        render: () => render({ state, actions }),
        nextAction: () => nextAction({ state, actions }),
    });
    const actions = Object.assign(
        Object.create(null),
        { route: defaultRouteAction({ propose }) },
        Actions({ propose }),
    );
    await setupRouting({ route: actions.route });
    return { accept, actions, render: () => render({ state, actions }) };
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
    accept,
    render,
    nextAction = () => {},
    inProgress = new Map(),
}) => async ({ proposal }, cancelId) => {
    try {
        let actionFlag;
        if (cancelId) {
            const inProgressValue = !(inProgress.get(cancelId) || false);
            inProgress.set(cancelId, inProgressValue);
            actionFlag = inProgressValue;
        }
        const data = await proposal;
        if (!data) {
            return;
        }
        if (cancelId && actionFlag !== inProgress.get(cancelId)) {
            return;
        }
        await accept(data);
        render();
        setImmediate(nextAction);
    } catch (error) {
        console.error("Propose error", error);
        throw error;
    }
};

export const routeRegex = /^\/app\/(.+)?$/;
export const defaultRouteAction = ({ propose }) => ({ oldPath, location }) => {
    if (oldPath === location.href) {
        return;
    }
    const routeMatch = routeRegex.exec(location.pathname);
    const route = routeMatch ? routeMatch[1] : "/";
    const params = new URLSearchParams(location.search);
    let query = [...params.keys()].reduce(
        (keys, key) => keys.add(key),
        new Set(),
    );
    query = [...query.values()].reduce(
        (obj, key) => Object.assign(obj, { [key]: params.getAll(key) }),
        Object.create(null),
    );
    return propose({ proposal: { route, query } });
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
