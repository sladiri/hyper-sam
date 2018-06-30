import {
    restoreSsrState,
    setupSamHyperHtmlContainer,
    replayIntermediateEvents,
} from "./control/client";

export const ClientApp = async options => {
    console.assert(
        window && window instanceof Window,
        "ClientApp: window && window instanceof Window",
    );
    console.assert(
        typeof options === "object" && options !== null,
        "ClientApp: typeof options === 'object' && options !== null",
    );
    const { rootElement, state = Object.create(null) } = options;
    console.assert(
        rootElement instanceof HTMLElement,
        "ClientApp: rootElement instanceof HTMLElement",
    );
    console.assert(
        typeof state === "object" && state !== null,
        "ClientApp: typeof state === 'object' && state !== null",
    );
    let serverSideRender = !!window.dispatcher;
    if (serverSideRender) {
        console.assert(
            typeof window.dispatcher === "object" && window.dispatcher !== null,
            "ClientApp: typeof window.dispatcher === 'object' && window.dispatcher !== null",
        );
        console.assert(
            Array.isArray(window.dispatcher.toReplay),
            "ClientApp: Array.isArray(window.dispatcher.toReplay)",
        );
    } else {
        window["dispatcher"] = { toReplay: [] };
    }
    const containerState = serverSideRender
        ? restoreSsrState({ rootElement })
        : state;
    const containerOptions = Object.assign(options, {
        state: containerState,
    });
    const { accept, actions, render } = await setupSamHyperHtmlContainer(
        containerOptions,
    );
    await render();
    // TODO: Do not allow actions until replay done?
    await replayIntermediateEvents({ actions });
    window["dispatcher"] = null;
    return { accept, actions };
};
