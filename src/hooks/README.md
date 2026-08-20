# Hooks

Shared client-side React hooks (e.g. `use-debounced-value`, `use-media-query`)
go here as they're needed. Nothing lives here yet in Phase 1 - components
have used built-in hooks (`useState`, `useTransition`, `useActionState`) and
CSS breakpoints so far. Add a hook here only once two or more components
need the same non-trivial stateful logic.
