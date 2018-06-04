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
                actions,
                _state: state,
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
    const actions = Actions({ propose });
    await setupRouting({ route: actions.route });
    return { accept, actions, render: () => render({ state, actions }) };
};

export const Dispatch = ({ actions }) => (name, handler, ...args) => {
    return async function(event) {
        await handler(...args).apply(this, [event, actions[name]]);
    };
};

export const Propose = ({ accept, render, nextAction }) => {
    const inProgress = new Map();
    return clientPropose({
        accept,
        render,
        nextAction,
        inProgress,
    });
};

// setImmediate is broken because of webpack-env + mjs https://github.com/webpack/webpack/issues/7032
const setImmediate = func => {
    return setTimeout(func, 0);
};

export const clientPropose = ({
    accept,
    render,
    nextAction,
    inProgress,
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

export const setupRouting = async ({ route }) => {
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
