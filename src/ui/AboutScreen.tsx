import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import appConfig from '../../app.json';
import { CONTRIBUTING_URL, ISSUES_URL, LICENSE_URL, PRIVACY_URL, REPO_URL } from '../config';
import { defaultRules } from '../engine/rules';
import { ui } from '../i18n/fr';
import { openUrl } from './actions';
import type { Palette } from './theme';

interface Props {
  palette: Palette;
  onBack: () => void;
}

export function AboutScreen({ palette, onBack }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.backText, { color: palette.primary }]}>‹ {ui.back}</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
          {ui.appName}
        </Text>
        <Text style={[styles.muted, { color: palette.muted }]}>
          {ui.aboutVersion(appConfig.expo.version, defaultRules.version, defaultRules.updated)}
        </Text>
      </View>

      <Section title={ui.aboutHowTitle} palette={palette}>
        <Text style={[styles.body, { color: palette.text }]}>{ui.aboutHowBody}</Text>
      </Section>

      <Section title={ui.aboutContributeTitle} palette={palette}>
        <Text style={[styles.body, { color: palette.text }]}>{ui.aboutContributeBody}</Text>
        <LinkButton label={ui.aboutReport} url={ISSUES_URL} palette={palette} primary />
        <LinkButton label={ui.aboutContributing} url={CONTRIBUTING_URL} palette={palette} />
      </Section>

      <Section title={ui.aboutCodeTitle} palette={palette}>
        <Text style={[styles.body, { color: palette.text }]}>{ui.aboutCodeBody}</Text>
        <LinkButton label={ui.aboutSource} url={REPO_URL} palette={palette} />
        <LinkButton label={ui.aboutLicense} url={LICENSE_URL} palette={palette} />
        <LinkButton label={ui.aboutPrivacy} url={PRIVACY_URL} palette={palette} />
      </Section>

      <Text style={[styles.footer, { color: palette.muted }]}>{ui.aboutAuthor}</Text>
    </ScrollView>
  );
}

function Section({ title, palette, children }: { title: string; palette: Palette; children: ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.sectionTitle, { color: palette.text }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function LinkButton({
  label,
  url,
  palette,
  primary = false,
}: {
  label: string;
  url: string;
  palette: Palette;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={() => openUrl(url)}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? palette.primary : 'transparent',
          borderColor: palette.primary,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? palette.onPrimary : palette.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  back: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 16 },
  backText: { fontSize: 18, fontWeight: '600' },
  header: { gap: 6 },
  title: { fontSize: 32, fontWeight: '800' },
  muted: { fontSize: 15 },
  section: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24 },
  button: { borderWidth: 2, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  footer: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
