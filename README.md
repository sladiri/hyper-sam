# Hyper SAM

A framework for web apps powered by [HyperHTML](https://viperhtml.js.org/) and the [SAM pattern](http://sam.js.org/).

## App Rendering

1.  Every component may be a stateless function. A wrapping **connect function** (cn) may be used to inject state or actions into the props. It also allows for DOM nodes to be reused at render.
2.  **Actions propose state updates**. Any action may be asynchronous and call external APIs (eg. validators).
3.  The **Accept function** updates the state. **The logic here may either accept or reject** action proposals and enforces a consistent state. It may be asynchronous too, to persist its data to a database for example. The state is a plain object, there is not immutability required.
4.  If required, actions may be called automatically if the state is in a particular shape.

## Package Usage

This package is published as a native ES Node module. If you have bundling problems, please try importing the files _client_ or _server_ inside _src_ directly, instead of using _index.mjs_.

## API and example usage

### Client Constructor

-   A factory produces an app instance.
-   By default it will restore the server-side-rendered state.
-   While the page parses client-side code, a dispatcher records actions to be replayed when the client app is ready.
-   Will do an initial render.

```javascript
import { ClientApp } from "hyper-sam";
// app-shell is our app logic with a model, and actions.
import { appShell, Actions, Accept, nextAction } from "./app-shell";

const { accept, actions } = ClientApp({
    state, // Initial state (eg. empty arrays instead of undefined, keep API consistent for render). Only needed without server-side render.
    app: appShell, // the root render function
    rootElement: document.body,
    Accept, // the update function for the state
    Actions, // an object of functions which propose state updates
    nextAction, // automatic actions according to state
})
    .then(({ accept, actions }) => {
        // May call accept or actions manually here.
    })
    .catch(error => {
        console.error("App error", error);
    });
```

### Server Constructor

-   A factory produces an object with two fields.
-   The first is a function which renders an HTML string of the app.
-   The second is the app-model Accept function. The app state may be updated with this function in order to reuse the model's logic.

```javascript
import { SsrApp } from "hyper-sam";
// app-shell is our app logic with a model, and actions.
// actions are optional, automatic next-action not yet supported
import { appShell, Accept } from "./app-shell";

const state = { /* ... */ }; // Initial state (eg. empty arrays instead of undefined, keep API consistent for render).
const { renderHTMLString, accept } = SsrApp({
    state,
    app: appShell,
    Accept,
});
// ... may get data to propose to model here
await accept({ route, query, title, description, posts });
const appString = renderHTMLString();
// insert into HTML body ...
```
