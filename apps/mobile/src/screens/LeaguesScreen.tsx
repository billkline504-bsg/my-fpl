import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { api, type League } from "../lib/api";
import { ui } from "../lib/ui";
import type { RootStackParamList } from "../navigation/types";

export function LeaguesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const leaguesQuery = useQuery({ queryKey: ["leagues"], queryFn: api.listMyLeagues });

  const createLeagueMutation = useMutation({
    mutationFn: () => api.createLeague({ name: newLeagueName }),
    onSuccess: () => {
      setNewLeagueName("");
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to create league"),
  });

  const joinLeagueMutation = useMutation({
    mutationFn: () => api.joinLeague(inviteCode),
    onSuccess: () => {
      setInviteCode("");
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Failed to join league"),
  });

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={ui.content}
      ListHeaderComponent={
        <View style={{ gap: 16 }}>
          <View style={ui.card}>
            <Text style={ui.h2}>Create a league</Text>
            <TextInput
              style={ui.input}
              placeholder="League name"
              value={newLeagueName}
              onChangeText={setNewLeagueName}
            />
            <Pressable
              style={[ui.button, createLeagueMutation.isPending && ui.buttonDisabled]}
              onPress={() => createLeagueMutation.mutate()}
              disabled={createLeagueMutation.isPending}
            >
              <Text style={ui.buttonText}>Create</Text>
            </Pressable>
          </View>

          <View style={ui.card}>
            <Text style={ui.h2}>Join a league</Text>
            <TextInput
              style={ui.input}
              placeholder="Invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <Pressable
              style={[ui.button, joinLeagueMutation.isPending && ui.buttonDisabled]}
              onPress={() => joinLeagueMutation.mutate()}
              disabled={joinLeagueMutation.isPending}
            >
              <Text style={ui.buttonText}>Join</Text>
            </Pressable>
          </View>

          {formError && <Text style={ui.errorText}>{formError}</Text>}

          <Text style={ui.h2}>My Leagues</Text>
          {leaguesQuery.isLoading && <Text style={ui.subtext}>Loading leagues...</Text>}
          {leaguesQuery.data?.length === 0 && <Text style={ui.subtext}>You're not in any leagues yet.</Text>}
        </View>
      }
      data={leaguesQuery.data ?? []}
      keyExtractor={(item: League) => item.id}
      renderItem={({ item }) => (
        <View style={[ui.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
          <View>
            <Text style={ui.text}>{item.name}</Text>
            <Text style={ui.subtext}>
              Invite: {item.inviteCode} · max {item.maxUsers} · {item.seasonLabel}
            </Text>
          </View>
          <Pressable style={ui.buttonSmall} onPress={() => navigation.navigate("LeagueDetail", { league: item })}>
            <Text style={ui.buttonTextSmall}>Open</Text>
          </Pressable>
        </View>
      )}
    />
  );
}
