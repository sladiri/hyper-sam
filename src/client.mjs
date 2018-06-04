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
    const { accept, actions, render } = await setupSamHyperHtmlContainer({
        ...options,
        state: state || restoreSsrState({ rootElement }),
    });
    // return;
    // await wait(2000);
    await render();
    // TODO: Do not allow actions until replay done?
    await replayIntermediateEvents({ actions });
    window["dispatcher"] = null;
    return { accept, actions };
};
