import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { theme } from '../theme';
import { login } from '../api';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('owner@spice-garden.com');
  const [password, setPassword] = useState('Sumaya@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onLogin();
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>S</Text>
        <Text style={styles.title}>Sumaya Resto</Text>
        <Text style={styles.subtitle}>Restaurant Management Mobile</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.colors.cream },
  hero: { backgroundColor: theme.colors.espresso, padding: 40, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: theme.colors.amber, color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', lineHeight: 64, overflow: 'hidden' },
  title: { color: theme.colors.cream, fontSize: 28, fontWeight: 'bold', marginTop: 16 },
  subtitle: { color: theme.colors.gray, marginTop: 4 },
  form: { padding: 24 },
  label: { color: theme.colors.coffee, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.amber + '40', padding: 14, fontSize: 16 },
  btn: { backgroundColor: theme.colors.chili, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: theme.colors.chili, marginTop: 8 },
});
