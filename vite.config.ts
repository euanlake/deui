import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    base: '',
    plugins: [
        react({
            jsxImportSource: '@emotion/react',
            babel: {
                plugins: [
                    'babel-plugin-macros',
                    '@emotion/babel-plugin',
                    [
                        '@emotion/babel-plugin-jsx-pragmatic',
                        {
                            export: 'jsx',
                            import: '__cssprop',
                            module: '@emotion/react',
                        },
                    ],
                    ['@babel/plugin-transform-react-jsx', { pragma: '__cssprop' }, 'twin.macro'],
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            $: resolve(__dirname, './src'),
        },
    },
    build: {
        target: 'es2020',
        outDir: 'dist',
        assetsDir: 'assets',
        minify: 'terser',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    ui: ['@emotion/react', '@emotion/styled', 'twin.macro'],
                },
            },
        },
    },
    server: {
        port: 3000,
        strictPort: false,
        open: true,
    },
})
