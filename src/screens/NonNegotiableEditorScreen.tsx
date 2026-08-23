// src/screens/NonNegotiableEditorScreen.tsx
// Alta y edición de un no negociable. Ver docs/no-negociables.md 4.1.
//
// v1: solo tipo 'simple'. El selector de tipo calculado no se expone porque
// depende de un perfil de usuario que no existe (P1).

import React, {useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useNonNegotiablesStore} from '../stores/nonNegotiablesStore';
import {ScreenContainer, Card, TextField, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'NonNegotiableEditor'>;

const EMOJI_CHOICES = ['🎯', '💪', '🥩', '💧', '🚶', '📖', '🧘', '😴', '🌱', '🧠', '☀️', '🚭'];

export default function NonNegotiableEditorScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();

  const {items, addItem, updateItem} = useNonNegotiablesStore();
  const existing = route.params?.id ? items.find(n => n.id === route.params!.id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? EMOJI_CHOICES[0]);

  const canSave = title.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (existing) {
      updateItem(existing.id, {title: title.trim(), emoji});
    } else {
      addItem(title, emoji);
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.block}>
          <TextField
            label={t('routine.title')}
            value={title}
            onChangeText={setTitle}
            placeholder="Comer suficiente proteína"
          />
        </Card>

        <Card style={styles.block}>
          <Text style={styles.label}>Emoji</Text>
          <View style={styles.emojiGrid}>
            {EMOJI_CHOICES.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiChip, emoji === e && styles.emojiChipActive]}
                onPress={() => setEmoji(e)}
                accessibilityRole="button"
                accessibilityState={{selected: emoji === e}}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('common.cancel')}
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.footerBtn}
        />
        <Button
          title={t('common.save')}
          variant="primary"
          onPress={handleSave}
          disabled={!canSave}
          style={styles.footerBtn}
        />
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    content: {padding: spacing.lg, gap: spacing.md},
    block: {marginBottom: spacing.md},
    label: {
      fontSize: typography.sm,
      fontWeight: typography.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    emojiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    emojiChip: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emojiChipActive: {borderColor: colors.primary, borderWidth: 2},
    emojiText: {fontSize: 24},
    footer: {
      flexDirection: 'row',
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerBtn: {flex: 1},
  });
