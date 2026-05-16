const postcss = require('postcss');
const path = require('path');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

const defaultFrom = path.resolve(__dirname, 'src/index.css');

const ensureGeneratedSources = {
    postcssPlugin: 'medlab-generated-css-sources',
    Once(root) {
        const fallbackInput = new postcss.Input('', { from: defaultFrom });

        root.walkDecls((decl) => {
            if (decl.source?.input?.file) return;

            decl.source = {
                input: fallbackInput,
                start: { line: 1, column: 1, offset: 0 },
                end: { line: 1, column: 1, offset: 0 },
            };
        });
    },
};

module.exports = {
    plugins: [
        tailwindcss({ config: './tailwind.config.js' }),
        ensureGeneratedSources,
        autoprefixer(),
    ],
}
