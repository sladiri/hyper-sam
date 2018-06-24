import viper from "viperhtml";
import { ssrDefaultProps, ssrDispatch } from "./control/server";

const wire = viper.wire;

export const SsrApp = ({
    state = Object.create(null),
    app,
    Accept,
    service,
}) => {
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
    const accept = Accept({ state, service });
    return { renderHTMLString, accept };
};
