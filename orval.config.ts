import { defineConfig } from 'orval';

export default defineConfig({
  gadaApi: {
    input: {
      // Live spec — same endpoint confirmed reachable in Step 1
      target: 'https://api.dev.gadaapp.com/v1/docs-json',
    },
    output: {
      mode: 'tags-split',          // one file per OpenAPI tag (Admin, Auth, etc.)
      target: 'lib/api/generated', // generated hooks land here
      schemas: 'lib/api/generated/model', // TS types in a sub-folder
      client: 'react-query',
      httpClient: 'fetch',
      override: {
        mutator: {
          path: 'lib/api/client.ts',
          name: 'customInstance',
        },
        // Don't generate a default query-client — we supply our own in providers.tsx
        useQuery: true,
        useMutation: true,
      },
    },
  },
});
