import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnalysisResult } from '../engine/types';
import { describeFinding, ui, verdictTexts } from '../i18n/fr';
import { openCybermalveillance, reportMissedScam, reportTo33700, showBlockHelp } from './actions';
import type { Palette } from './theme';

interface Props {
  result: AnalysisResult;
  message: string;
  palette: Palette;
}

export function ResultCard({ result, message, palette }: Props) {
  const tone = palette.verdict[result.verdict];
  const text = verdictTexts[result.verdict];
  const findings = result.findings.filter((item) => item.points !== 0 || item.code === 'officialLinks');
  const showActions = result.verdict !== 'clean';

  return (
    <View style={styles.container}>
      <View
        style={[styles.verdict, { backgroundColor: tone.background, borderColor: tone.border }]}
        accessibilityRole="summary"
      >
        <Text style={styles.icon}>{text.icon}</Text>
        <Text style={[styles.verdictTitle, { color: tone.text }]}>{text.title}</Text>
        <Text style={[styles.verdictSummary, { color: tone.text }]}>{text.summary}</Text>
      </View>

      <Section title={ui.findingsTitle} palette={palette}>
        {findings.length === 0 ? (
          <Text style={[styles.body, { color: palette.muted }]}>{ui.noFindings}</Text>
        ) : (
          findings.map((item, index) => (
            <View key={`${item.code}-${index}`} style={styles.row}>
              <Text style={[styles.bullet, { color: palette.verdict[item.points >= 40 ? 'scam' : item.points > 0 ? 'suspicious' : 'clean'].border }]}>
                ●
              </Text>
              <Text style={[styles.body, styles.flex, { color: palette.text }]}>{describeFinding(item)}</Text>
            </View>
          ))
        )}
      </Section>

      {result.links.length > 0 && (
        <Section title={ui.linksTitle} palette={palette}>
          <Text style={[styles.hint, { color: palette.muted }]}>{ui.linksHint}</Text>
          {result.links.map((link) => (
            <Text key={link.raw} style={[styles.link, { color: palette.text, borderColor: palette.border }]} selectable={false}>
              {link.host}
            </Text>
          ))}
        </Section>
      )}

      <Section title={ui.adviceTitle} palette={palette}>
        <Text style={[styles.body, { color: palette.text }]}>{ui.advice}</Text>
      </Section>

      {showActions && (
        <Section title={ui.actionsTitle} palette={palette}>
          <ActionButton label={ui.report33700} onPress={() => reportTo33700(message)} palette={palette} primary />
          <ActionButton label={ui.cybermalveillance} onPress={openCybermalveillance} palette={palette} />
          <ActionButton label={ui.blockNumber} onPress={showBlockHelp} palette={palette} />
        </Section>
      )}

      {result.verdict !== 'scam' && (
        <Pressable
          onPress={() => reportMissedScam(message, result.verdict)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.reportLink, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.reportLinkText, { color: palette.primary }]}>{ui.missedScamLink}</Text>
        </Pressable>
      )}

      <Text style={[styles.disclaimer, { color: palette.muted }]}>{ui.disclaimer}</Text>
    </View>
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

function ActionButton({
  label,
  onPress,
  palette,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  palette: Palette;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: primary ? palette.primary : 'transparent',
          borderColor: palette.primary,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.actionText, { color: primary ? palette.onPrimary : palette.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  verdict: { borderWidth: 2, borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  icon: { fontSize: 40 },
  verdictTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  verdictSummary: { fontSize: 17, lineHeight: 24, textAlign: 'center' },
  section: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { fontSize: 14, lineHeight: 24 },
  flex: { flex: 1 },
  body: { fontSize: 17, lineHeight: 24 },
  hint: { fontSize: 15, lineHeight: 21 },
  link: { fontSize: 16, fontFamily: 'monospace', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  action: { borderWidth: 2, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  actionText: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  reportLink: { paddingVertical: 10, paddingHorizontal: 8 },
  reportLinkText: { fontSize: 16, textAlign: 'center', textDecorationLine: 'underline' },
  disclaimer: { fontSize: 14, textAlign: 'center', marginTop: 4 },
});
