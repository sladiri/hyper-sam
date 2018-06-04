module.exports = {
    parser: "babel-eslint",
    plugins: [],
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: ["eslint:recommended", "prettier"],
    rules: {
        "no-debugger": 0,
        "no-console": 0,
        "no-unused-vars": 1,
    },
};
