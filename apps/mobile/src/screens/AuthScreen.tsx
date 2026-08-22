import { useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { ui } from "../lib/ui";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        await api.upsertMyProfile({ displayName: displayName || email.split("@")[0]! });
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={ui.screen}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
        <Text style={ui.h1}>{mode === "sign-in" ? "Sign in" : "Create an account"}</Text>

        {mode === "sign-up" && (
          <TextInput
            style={ui.input}
            placeholder="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={ui.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={ui.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={ui.errorText}>{error}</Text>}

        <Pressable
          style={[ui.button, submitting && ui.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={ui.buttonText}>{mode === "sign-in" ? "Sign in" : "Sign up"}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
          <Text style={[ui.linkText, { textAlign: "center" }]}>
            {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
