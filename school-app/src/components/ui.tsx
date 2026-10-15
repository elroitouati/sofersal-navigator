// רכיבי ממשק בסיסיים. כל הטקסט מיושר לימין דרך RTL מאולץ (expo-localization forcesRTL).
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';

export function T({
  children, style, dim, size = 15, weight, numberOfLines, selectable,
}: {
  children: ReactNode; style?: StyleProp<TextStyle>; dim?: boolean; size?: number;
  weight?: TextStyle['fontWeight']; numberOfLines?: number; selectable?: boolean;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[{ color: dim ? t.textDim : t.text, fontSize: size, fontWeight: weight, writingDirection: 'rtl' }, style]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children, refreshing, onRefresh, title, subtitle,
}: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void; title?: string; subtitle?: string;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 14 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[t.primary]} progressBackgroundColor={t.card} />
        ) : undefined
      }
    >
      {title ? (
        <View style={{ marginBottom: 2 }}>
          <T size={28} weight="800">{title}</T>
          {subtitle ? <T dim size={13}>{subtitle}</T> : null}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.card, borderRadius: 18, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border,
    shadowColor: '#000', shadowOpacity: t.dark ? 0 : 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: t.dark ? 0 : 1,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.75 }]} android_ripple={{ color: t.border }}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <T size={18} weight="700">{children}</T>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const t = useTheme();
  const c = color ?? t.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
        borderColor: active ? c : t.border, backgroundColor: active ? c : t.card,
      }}
    >
      <Text style={{ color: active ? '#fff' : t.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Button({
  label, onPress, kind = 'primary', loading, disabled, style,
}: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; loading?: boolean; disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.primary : kind === 'danger' ? t.danger : t.cardAlt;
  const fg = kind === 'secondary' ? t.text : kind === 'primary' ? t.primaryText : '#fff';
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        { backgroundColor: bg, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

export function Row({ label, sub, right, onPress }: { label: string; sub?: string; right?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T weight="600">{label}</T>
        {sub ? <T dim size={13}>{sub}</T> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <Row label={label} sub={sub} right={<Switch value={value} onValueChange={onChange} trackColor={{ true: t.primary }} />} />
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />;
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
      <Text style={{ fontSize: 34 }}>{emoji}</Text>
      <T dim>{text}</T>
    </View>
  );
}
