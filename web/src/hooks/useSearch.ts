import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchSearch } from '../api/search';
import type { SearchParams } from '../types/search';
import type { SearchPage } from '../types/provider';

export function useSearch(params: SearchParams, enabled: boolean) {
  return useInfiniteQuery<SearchPage, Error>({
    queryKey: ['search', params],
    queryFn: ({ pageParam }) =>
      fetchSearch({ ...params, page: (pageParam as number) ?? 1 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}
