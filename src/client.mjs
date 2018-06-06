import {
    restoreSsrState,
    setupSamHyperHtmlContainer,
    replayIntermediateEvents,
} from "./control/client";

export const ClientApp = async options => {
    const { rootElement, state = Object.create(null) } = options;
    let serverSideRender = !!window["dispatcher"];
    if (window["dispatcher"]) {
        serverSideRender = true;
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
