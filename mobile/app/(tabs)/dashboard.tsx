import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HuntyRefreshControl } from '@/components/HuntyRefreshControl';
import { useRefreshByUser } from '@/hooks/useRefreshByUser';

// Placeholder for dashboard data fetching
const fetchDashboard = async () => ({ balance: 0 });

export default function Dashboard() {
  const { data, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const { isRefreshing, onRefresh } = useRefreshByUser(refetch);

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-slate-900"
      refreshControl={
        <HuntyRefreshControl 
          refreshing={isRefreshing} 
          onRefresh={onRefresh} 
        />
      }
    >
      <View className="p-6">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Dashboard</Text>
        <Text className="text-slate-600 dark:text-slate-400">Balance: {data?.balance} XLM</Text>
      </View>
    </ScrollView>
  );
}