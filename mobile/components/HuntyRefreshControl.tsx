import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';

interface Props extends RefreshControlProps {
  onRefresh: () => void;
  refreshing: boolean;
}

export const HuntyRefreshControl = ({ refreshing, onRefresh, ...props }: Props) => {
  return (
    <RefreshControl
      accessible={true}
      accessibilityLabel="Pull to refresh"
      accessibilityState={{ busy: refreshing }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#3737A4"
      colors={["#3737A4"]}
      {...props}
    />
  );
};