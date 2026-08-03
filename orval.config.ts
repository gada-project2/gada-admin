import { defineConfig } from 'orval';

export default defineConfig({
  gadaApi: {
    input: {
      // Live production spec (requires ENABLE_DOCS=true on the server)
      target: 'https://api.gadaapp.com/v1/docs-json',
      // This admin app only consumes the admin surface. Filtering also avoids two
      // malformed storage operations in the upstream spec
      // (StorageController_presignDownload, StorageController_deleteKey) which declare
      // a {path} URL segment but no matching path parameter — orval hard-fails on them.
      // Remove the filter once the backend fixes those two operations.
      filters: {
        tags: ['admin', 'admin-auth'],
      },
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
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
