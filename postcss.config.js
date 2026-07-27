// Tailwind v4: the PostCSS plugin moved out of the `tailwindcss` package into
// `@tailwindcss/postcss`, and vendor prefixing is now done internally (Lightning CSS), so
// autoprefixer is no longer part of the chain.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
