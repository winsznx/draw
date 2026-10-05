import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// Prerendered pages are served from static assets. Ledger data is read per
// request through the API proxy, so nothing here needs to revalidate.
export default defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache, enableCacheInterception: true });
