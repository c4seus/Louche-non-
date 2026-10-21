import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { analyze } from './src/engine';
import type { AnalysisResult } from './src/engine';
import { ui } from './src/i18n/fr';
import { AboutScreen } from './src/ui/AboutScreen';
import { ResultCard } from './src/ui/ResultCard';
import { usePalette } from './src/ui/theme';
import type { Palette } from './src/ui/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const palette = usePalette();
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (!showAbout) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowAbout(false);
      return true;
    });
    return () => subscription.remove();
  }, [showAbout]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      <StatusBar style="auto" />
      <View style={[styles.screen, showAbout && styles.hidden]}>
        <HomeScreen palette={palette} onOpenAbout={() => setShowAbout(true)} />
      </View>
      {showAbout && <AboutScreen palette={palette} onBack={() => setShowAbout(false)} />}
    </SafeAreaView>
  );
}

function HomeScreen({ palette, onOpenAbout }: { palette: Palette; onOpenAbout: () => void }) {
  const [message, setMessage] = useState('');
  const [analyzedMessage, setAnalyzedMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runAnalysis = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === '') {
      setResult(null);
      setNotice(ui.emptyInput);
      return;
    }
    setNotice(null);
    setAnalyzedMessage(trimmed);
    setResult(analyze(trimmed));
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text.trim() === '') {
      setNotice(ui.emptyClipboard);
      return;
    }
    setMessage(text);
    runAnalysis(text);
  };

  const clear = () => {
    setMessage('');
    setAnalyzedMessage('');
    setResult(null);
    setNotice(null);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, styles.flex, { color: palette.text }]} accessibilityRole="header">
              {ui.appName}
            </Text>
            <Pressable
              onPress={onOpenAbout}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.aboutButton, { borderColor: palette.border, opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.aboutText, { color: palette.primary }]}>{ui.about}</Text>
            </Pressable>
          </View>
          <Text style={[styles.tagline, { color: palette.muted }]}>{ui.tagline}</Text>
        </View>

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={ui.inputPlaceholder}
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="none"
          style={[
            styles.input,
            { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
          ]}
          accessibilityLabel={ui.inputPlaceholder}
        />

        <View style={styles.buttons}>
          <Button label={ui.paste} onPress={paste} color={palette.primary} textColor={palette.primary} />
          <Button label={ui.clear} onPress={clear} color={palette.border} textColor={palette.muted} />
        </View>
        <Button
          label={ui.analyze}
          onPress={() => runAnalysis(message)}
          color={palette.primary}
          textColor={palette.onPrimary}
          filled
        />

        {notice !== null && <Text style={[styles.notice, { color: palette.muted }]}>{notice}</Text>}

        {result !== null && <ResultCard result={result} message={analyzedMessage} palette={palette} />}

        <Text style={[styles.privacy, { color: palette.muted }]}>{ui.privacy}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Button({
  label,
  onPress,
  color,
  textColor,
  filled = false,
}: {
  label: string;
  onPress: () => void;
  color: string;
  textColor: string;
  filled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        filled ? styles.buttonLarge : styles.buttonInRow,
        { borderColor: color, backgroundColor: filled ? color : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, filled && styles.buttonTextLarge, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hidden: { display: 'none' },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aboutButton: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  aboutText: { fontSize: 15, fontWeight: '600' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { gap: 6, marginTop: 8 },
  title: { fontSize: 32, fontWeight: '800' },
  tagline: { fontSize: 17, lineHeight: 24 },
  input: { minHeight: 160, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 17, lineHeight: 24 },
  buttons: { flexDirection: 'row', gap: 12 },
  button: { borderWidth: 2, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  buttonInRow: { flex: 1 },
  buttonLarge: { paddingVertical: 16 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  buttonTextLarge: { fontSize: 19, fontWeight: '700' },
  notice: { fontSize: 16, textAlign: 'center' },
  privacy: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
