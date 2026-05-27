import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';

interface Props extends RefreshControlProps {
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Standardized RefreshControl with Hunty brand colors.
 */
export const HuntyRefreshControl = ({ refreshing, onRefresh, ...props }: Props) => {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#3737A4" // Primary Brand Blue
      colors={["#3737A4"]} // Android implementation
      {...props}
    />
  );
};