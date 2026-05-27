import React from 'react';
import { FlatList, View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HuntyRefreshControl } from '@/components/HuntyRefreshControl';
import { useRefreshByUser } from '@/hooks/useRefreshByUser';

// Placeholder for hunt data fetching
const fetchHunts = async () => [];

export default function HomeFeed() {
  const { data: hunts, refetch } = useQuery({
    queryKey: ['hunts'],
    queryFn: fetchHunts,
  });

  const { isRefreshing, onRefresh } = useRefreshByUser(refetch);

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <FlatList
        data={hunts}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View className="p-4 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-slate-900 dark:text-white font-semibold">{item.title}</Text>
          </View>
        )}
        refreshControl={
          <HuntyRefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
          />
        }
        ListEmptyComponent={<Text className="p-10 text-center text-slate-500">No active hunts found.</Text>}
      />
    </View>
  );
}