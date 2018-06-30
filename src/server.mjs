import viper from "viperhtml";
import { ssrDefaultProps, ssrDispatch } from "./control/server";

const wire = viper.wire;

export const SsrApp = ({ state = Object.create(null), app, accept }) => {
    console.assert(
        typeof state === "object" && state !== null,
        "SsrApp: typeof state === 'object' && state !== null",
    );
    console.assert(
        typeof app === "function",
        "SsrApp: typeof app === 'function'",
    );
    console.assert(
        typeof accept === "function",
        "SsrApp: typeof accept === 'function'",
    );
    const defaultProps = ssrDefaultProps({
        state,
        dispatch: ssrDispatch,
        wire,
    });
    const renderHTMLString = () => {
        return viper.wire()`
            <input
                id="app-ssr-data"
                type="hidden"
                value=${JSON.stringify(state)}
            />
            <script>window.dispatcher = { toReplay: [] };</script>
            ${defaultProps._connect()(app)}
            `;
    };
    return { renderHTMLString, accept };
};
