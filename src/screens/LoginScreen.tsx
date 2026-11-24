import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { colors, headingFont } from '../theme';
import { demoCredentials, signIn, type Driver } from '../services/auth';

export function LoginScreen({ onSignIn }: { onSignIn: (driver: Driver) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setError('Enter a valid email address and your password.');
      return;
    }
    setError('');
    setBusy(true);
    try { onSignIn(await signIn(email, password)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <View style={styles.badge}><Icon name="truck" size={23} color={colors.button} /></View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to start managing your assigned loads.</Text>
          </View>
          <View style={styles.form}>
            <Text nativeID="email-label" style={styles.label}>Email address</Text>
            <View style={styles.inputBox}>
              <Icon name="mail" color={colors.subtle} />
              <TextInput accessibilityLabel="Email address" style={styles.input} placeholder="Enter your email address" placeholderTextColor={colors.subtle} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" editable={!busy} />
            </View>
            <Text style={[styles.label, { marginTop: 19 }]}>Password</Text>
            <View style={styles.inputBox}>
              <Icon name="lock" color={colors.subtle} />
              <TextInput accessibilityLabel="Password" style={styles.input} placeholder="Enter your password" placeholderTextColor={colors.subtle} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} editable={!busy} />
              <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} hitSlop={10}><Icon name={visible ? 'eye' : 'eye-off'} color={colors.subtle} /></Pressable>
            </View>
            <Pressable accessibilityRole="button" style={styles.forgot} onPress={() => Alert.alert('Reset your password', 'Contact your Fleet Admin to reset your password. Password recovery will be connected when your account service is available.')}><Text style={styles.link}>Forgot password?</Text></Pressable>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={submit} style={({ pressed }) => [styles.signIn, { opacity: pressed || busy ? 0.75 : 1 }]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.signInText}>Sign in</Text>}
            </Pressable>
          </View>
          <View style={styles.help}><Text style={styles.helpText}>Need help?</Text><Pressable accessibilityRole="button" onPress={() => Alert.alert('Contact your Fleet Admin', 'Please contact the administrator who assigned your loads. Their contact details will appear here once your fleet account is connected.')}><Text style={styles.contact}>Contact your Fleet Admin</Text></Pressable></View>
          <Pressable accessibilityRole="button" style={styles.demo} onPress={() => { setEmail(demoCredentials.email); setPassword(demoCredentials.password); setError(''); }}><Text style={styles.demoText}>Testing the app? Use demo account</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  intro: { alignItems: 'center', marginBottom: 34 },
  badge: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.green, backgroundColor: '#EDFAF5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontFamily: headingFont, fontSize: 27, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  form: { borderWidth: 1, borderColor: '#F0F1F4', borderRadius: 17, padding: 17, paddingTop: 21, backgroundColor: colors.white, boxShadow: '0px 7px 16px rgba(17,24,39,0.035)' },
  label: { fontSize: 16, fontWeight: '500', color: colors.ink, marginBottom: 12 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 47, borderRadius: 12, borderColor: colors.border, borderWidth: 1, backgroundColor: '#F8F9FA' },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.ink, minWidth: 0 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 14 },
  link: { color: colors.green, fontSize: 12, fontWeight: '600' },
  signIn: { backgroundColor: colors.button, minHeight: 51, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signInText: { color: colors.white, fontSize: 17, fontWeight: '600' },
  error: { color: '#B42318', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  help: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 22 },
  helpText: { color: colors.muted, fontSize: 14 },
  contact: { color: colors.orange, fontSize: 14, fontWeight: '500' },
  demo: { alignSelf: 'center', padding: 12, marginTop: 14 },
  demoText: { color: colors.subtle, fontSize: 12, textDecorationLine: 'underline' },
});
