import {
    restoreSsrState,
    setupSamHyperHtmlContainer,
    replayIntermediateEvents,
} from "./control/client";

export const ClientApp = async options => {
    const { rootElement, state } = options;
    if (!state) {
        console.assert(window["dispatcher"], "dispatcher");
    } else {
        window["dispatcher"] = { toReplay: [] };
    }
    const containerOptions = Object.assign(options, {
        state: state || restoreSsrState({ rootElement }),
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
