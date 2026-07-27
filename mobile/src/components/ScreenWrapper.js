/**
 * ScreenWrapper — wraps every main screen with SafeAreaView + ScrollView.
 * Usage:
 *   <ScreenWrapper>
 *     <View>...</View>
 *   </ScreenWrapper>
 *
 * Pass `noScroll` to render children directly inside SafeAreaView without
 * a ScrollView (for screens that manage their own scroll, e.g. Chat).
 */
import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, pageStyles } from '../styles/theme';

export default function ScreenWrapper({
  children,
  noScroll = false,
  style,
  contentStyle,
  refreshing = false,
  onRefresh,
}) {
  if (noScroll) {
    return (
      <SafeAreaView style={[pageStyles.container, style]} edges={['bottom']}>
        <View style={[{ flex: 1, padding: spacing[4] }, contentStyle]}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[pageStyles.container, style]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[pageStyles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh
            ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
