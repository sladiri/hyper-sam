# Hyper SAM

A framework for web apps powered by HyperHTML and the SAM pattern.

-   [HyperHTML](https://viperhtml.js.org/)
-   [SAM pattern](https://sam.js.org/)

## App Rendering via the SAM container

1.  Every component may be a stateless function. A wrapping **connect function** (cn) may be used to inject state or actions into the props. It also allows for DOM nodes to be reused at render.
2.  **Actions propose state updates**. Any action may be asynchronous and call external APIs (eg. validators).
3.  **An asynchronous action may be cancelled**, while it is resolving (eg. API call).
4.  The **Accept function** updates the state. **The logic here may either accept or reject** action proposals and enforces a consistent state. It may be asynchronous too, to persist its data to a database for example. The state is a plain object, there is not immutability required.
5.  Actions may be called automatically if the state is in a particular shape via the optional **Next Action** function.

### Routing

Client side routing is supported via the [onpushstate package](https://www.npmjs.com/package/onpushstate). A **route** action is called with the _old path_ string and the current _window.location_ object.

_Note:_ A default **route** action is defined for convenience:

`route: ({ oldPath, location, }) => propose({ proposal: { route, query } })`.

## Package Usage

This package is published as a native ES Node module. If you have bundling problems, please try importing the files _client_ or _server_ inside _src_ directly, instead of using _index.mjs_.

## API and example usage

### App Interface

This framework is intended to render an app with a specific interface:

-   app: Render function, effectively just a component at the root level (see component examples below).
-   actions: An object containing **Action functions** which may be called from buttons, etc. They may be asynchronous functions and their return value is proposed to the **Accept function** of the model which may update the state. As a convention, the return value is an object with a _proposal_ property (`action: (arg) => ({ proposal })`).
-   accept: `({ proposal }) => void` : This is the **Accept function** of the model.
-   nextAction: `({ state, actions }) => void` : This optional function may call **actions** according to some state. It is automatically called after each state update.
-   state: `{}` Optionally, an initial state can be passed. This minimises checks inside the components, if you already have an empty Array instead of undefined for example.

#### An example app

```javascript
const Actions = ({ propose, service }) => {
    return {
        async exampleAction({ value }) {
            if (typeof value !== "string") {
                return;
            }
            const x = await service.db.get(value);
            await propose({ proposal: { value: x } });
        },
    };
};

const Accept = ({ state, service }) => {
    return ({ proposal }) => {
        if (proposal.route !== undefined) {
            state.route = proposal.route;
        }
        if (proposal.value !== undefined) {
            state.bar = proposal.value;
            service.db.put(state.bar);
        }
    };
};

// This is an optional function of the app
const nextAction = ({ state, actions }) => {
    if (state.foo) {
        actions.exampleAction({ value: "abc" });
    }
};
```

### Client Constructor

-   A factory produces an app instance.
-   By default it will restore the server-side-rendered state.
-   While the page parses client-side code, a dispatch function may record actions to be replayed when the client app is ready.
-   Will do an initial render automatically.

```javascript
import { ClientApp } from "hypersam";
// app-shell is our app logic with a model, and actions.
import { appShell, Actions, Accept, nextAction } from "./app-shell";

const { accept, actions } = ClientApp({
    app: appShell, // the root render function
    rootElement: document.body,
    Accept, // the update function for the state
    Actions, // an object of functions which propose state updates
    nextAction, // optional, automatic actions according to state
    state: {
        // Optional initial state object, ignored with server-side render
    },
    service: { db: new DB() }, // Optional, available to both actions and model
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
import { SsrApp } from "hypersam";
// app-shell is our app logic with a model, and actions.
// actions are optional, automatic next-action is not yet supported
import { appShell, Accept } from "./app-shell";

const { renderHTMLString, accept } = SsrApp({
    state: { /* Optional */ },
    app: appShell,
    Accept,
    service: { /* Optional */ },
});
// May get data to propose to model here
await accept({ route, query, title, description, posts });
const appString = renderHTMLString();
// insert into HTML body ...
```

### Connect Function

The connect function (_cn_) passes some default props to a view:

1.  state: the application state.
2.  actions: an object of the app's actions.
3.  render: used to render a view.
4.  cn: a connect function to be used for child components.
5.  dispatch: a function for click handlers to record actions while the client logic initialises (used with server-side rendering).
6.  \_wire: a HyperHTML render function to force recreation of DOM nodes.

Please also refer to the [HyperHTML docs](https://viperhtml.js.org/hyperhtml/documentation/#essentials-1).

It has multiple call signatures:

```javascript
// one argument
cn(
    component, // function : props => props.render`<!-- HTML -->`
);
// two arguments
cn(
    component,
    childProps, // object : Will be merged into child's props
);
// or
cn(
    component,
    nameSpace, // number|string : Used, if component is used multiple times in same view
);
// three or four arguments
cn(
    component,
    childProps,
    reference, // object|null : Object to weakly bind DOM nodes to (see hyperhtml)
    nameSpace, //optional
);
```

### Basic component example

```javascript
const fetchButtonConnected = props => {
    const childProps = {
        parentProp: props.parentProp,
        fetchData: props.actions.fetchData,
        someState: props.state.someState,
    };
    return props.cn(fetchButton, childProps);
};

const fetchButton = ({ render, parentProp, fetchData, someState }) => {
    return render`
        <button onclick=${fetchData}>
            State ${someState}-${parentProp}
        </button>
        `;
};
```

### Namespacing example

If you render the same component twice, you need to passs a namespace. HyperHTML is used to reuse as many DOM-nodes as possible, and without the namespace, only one instance of the component would be rendered. The namespace should be a unique Number or String for the containing component.

```javascript
const testSpan = props => props.render`<span>Test</span>`;

const appliesNamespace = ({ render, cn }) => render`
    <div>
        ${cn(testSpan, 0)}
        ${cn(testSpan, 1)}
    </div>
    `;
```

### Render reference example

A list component may use render references to free memory when list items are removed from state.

**Note**: The _FetchPosts_ function manipulates the DOM and can pass event data to the actual action _fetchPosts_. This way, the action _fetchPosts_ itself can be used on the server too.

```javascript
const postsConnected = props => {
    const childProps = {
        posts: props.state.posts,
        fetchPosts: props.actions.fetchPosts,
    };
    return props.cn(posts, childProps);
};

const posts = props => {
    const { render, cn, posts, fetchPosts } = props;
    return render`
        <button onclick=${FetchPosts({ fetchPosts })}>Fetch Posts</button>
        <ul class="posts">
            ${posts.map(post => cn(postItem, { ...post }, post))}
        </ul>
        `;
};

const FetchPosts = ({ fetchPosts }) => {
    return async function(event) {
        this.setAttribute("disabled", "true");
        await fetchPosts(); // Wait until its data is accepted or rejected
        this.removeAttribute("disabled");
    };
};

const postItem = props => {
    const { render, cn, title, summary, content } = props;
    return render`
        <li class="posts posts__post">
            <p class="posts posts__title">${title}</p>
            ${cn(postSummary, { summary })}
            <p class="posts posts__content">${content}</p>
        </li>
        `;
};

const postSummary = props => {
    const { render, summary } = props;
    return render`
        <p class="posts posts__summary">${summary}</p>
        `;
};
```

### Dispatch function example

```javascript
const view = props => {
    const { render, dispatch, fetchPosts } = props;
    const args = [1, 2];
    const onClick = dispatch("fetchPosts", FetchPostsSSR, ...args);
    return render`
        <button onclick=${onClick}>Fetch Posts SSR</button>
        `;
};

const FetchPostsSSR = (...args) => {
    return function(event, action) {
        action();
    };
```
