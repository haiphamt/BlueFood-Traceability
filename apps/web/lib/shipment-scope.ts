type StoreAssignmentRow = {
  store_id: string;
  stores: { id: string; name: string | null } | { id: string; name: string | null }[] | null;
};

export type StoreScope = {
  storeId: string;
  storeName: string | null;
  destinationLocations: string[];
};

function cleanLocation(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function stripDiacritics(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}

function stripStorePrefix(value: string) {
  const cleaned = cleanLocation(value);
  const ascii = stripDiacritics(cleaned).toLowerCase();
  const prefixes = ['cua hang ', 'ch '];
  const prefix = prefixes.find((p) => ascii.startsWith(p));
  return prefix ? cleanLocation(cleaned.slice(prefix.length)) : cleaned;
}

export function buildStoreDestinationLocations(storeName: string | null | undefined) {
  if (!storeName) return [];

  const cleaned = cleanLocation(storeName);
  const withoutPrefix = stripStorePrefix(cleaned);
  const withoutDiacritics = stripDiacritics(withoutPrefix);
  const cleanedWithoutDiacritics = stripDiacritics(cleaned);

  return Array.from(new Set([
    cleaned,
    withoutPrefix,
    cleanedWithoutDiacritics,
    withoutDiacritics,
  ].filter(Boolean)));
}

export function shipmentDestinationMatchesStore(
  toLocation: string | null | undefined,
  storeScope: StoreScope | null,
) {
  if (!toLocation || !storeScope) return false;
  const normalizedDestination = stripDiacritics(cleanLocation(toLocation)).toLowerCase();

  return storeScope.destinationLocations.some((location) => {
    return stripDiacritics(cleanLocation(location)).toLowerCase() === normalizedDestination;
  });
}

export async function getStoreScopeForUser(client: any, userId: string): Promise<StoreScope | null> {
  const { data, error } = await client
    .from('store_users')
    .select('store_id, stores(id, name)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as StoreAssignmentRow;
  const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
  const storeName = store?.name ?? null;

  return {
    storeId: row.store_id,
    storeName,
    destinationLocations: buildStoreDestinationLocations(storeName),
  };
}
