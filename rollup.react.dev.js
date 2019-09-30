import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import nodeGlobals from 'rollup-plugin-node-globals';
import { terser } from 'rollup-plugin-terser';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import json from 'rollup-plugin-json';

export default ({ inlineDynamicImports }) => ({
    input: 'src/index.tsx',
    output: {
        dir: 'build',
        format: 'esm',
        sourcemap: true,
        chunkFileNames: 'static/js/[name].chunk.js',
    },
    inlineDynamicImports,
    plugins: [
        resolve({
            extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        }),

        commonjs({
            namedExports: {
                'node_modules/react-dom/index.js': ['render'],
                'node_modules/react/index.js': [
                    'Component',
                    'PropTypes',
                    'Fragment',
                    'Suspense',
                    'createElement',
                    'useEffect',
                    'useState',
                    'useContext',
                    'createContext',
                    'lazy',
                    'cloneElement',
                ],
            },
        }),

        typescriptPlugin({
            typescript,
        }),
        nodeGlobals(),
        terser({
            mangle: {
                toplevel: true,
            },
        }),
        json({
            // All JSON files will be parsed by default,
            // but you can also specifically include/exclude files
            include: 'node_modules/**',
            //exclude: [ 'node_modules/foo/**', 'node_modules/bar/**' ],

            // for tree-shaking, properties will be declared as
            // variables, using either `var` or `const`
            preferConst: true, // Default: false

            // specify indentation for the generated default export —
            // defaults to '\t'
            indent: '  ',

            // ignores indent and generates the smallest code
            compact: true, // Default: false

            // generate a named export for every property of the JSON object
            namedExports: true // Default: true
        }),
    ],
});