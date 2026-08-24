import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, getRecommendedCupRounds, type CupEvent, type CupFormat, type League } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ui } from "../lib/ui";
import { Icon, IconUpload } from "./IconUpload";

function CupBracket({
  cup,
  displayName,
  isCommissioner,
  onUploadIcon,
  uploadingIconCupId,
}: {
  cup: CupEvent;
  displayName: (userId: string) => string;
  isCommissioner: boolean;
  onUploadIcon: (cupId: string, formData: FormData) => void;
  uploadingIconCupId: string | null;
}) {
  const rounds = new Map<number, typeof cup.matchups>();
  for (const m of cup.matchups) {
    const existing = rounds.get(m.roundNumber);
    if (existing) existing.push(m);
    else rounds.set(m.roundNumber, [m]);
  }

  return (
    <View style={ui.card}>
      <View style={ui.row}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isCommissioner ? (
            <IconUpload
              iconUrl={cup.iconUrl}
              busy={uploadingIconCupId === cup.id}
              onUpload={(formData) => onUploadIcon(cup.id, formData)}
            />
          ) : (
            <Icon iconUrl={cup.iconUrl} />
          )}
          <Text style={ui.h2}>
            {cup.name} <Text style={ui.subtext}>({cup.format} elimination)</Text>
          </Text>
        </View>
        <Text style={cup.status === "completed" ? ui.successText : ui.subtext}>
          {cup.status === "completed"
            ? `Champion${cup.champions.length > 1 ? "s" : ""}: ${cup.champions.map(displayName).join(", ")}`
            : "In progress"}
        </Text>
      </View>

      {[...rounds.entries()].map(([roundNumber, matchups]) => (
        <View key={roundNumber} style={{ gap: 4 }}>
          <Text style={ui.subtext}>
            Round {roundNumber} (GW{cup.startingGameweekNumber + roundNumber - 1})
          </Text>
          {matchups.map((m) => (
            <View key={m.id} style={ui.listItem}>
              <Text style={m.winnerId === m.userAId ? [ui.text, { fontWeight: "700" }] : ui.text}>
                {displayName(m.userAId)} {m.userAScore ?? ""}
              </Text>
              {m.isBye ? (
                <Text style={ui.subtext}>BYE</Text>
              ) : (
                <>
                  <Text style={ui.subtext}>vs</Text>
                  <Text style={m.winnerId === m.userBId ? [ui.text, { fontWeight: "700" }] : ui.text}>
                    {m.userBScore ?? ""} {displayName(m.userBId!)}
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function CupsPanel({ league }: { league: League }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCommissioner = user?.id === league.commissionerId;

  const [name, setName] = useState("");
  const [format, setFormat] = useState<CupFormat>("single");
  const [startingGameweekNumber, setStartingGameweekNumber] = useState("1");
  const [rounds, setRounds] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const cupsQuery = useQuery({ queryKey: ["cups", league.id], queryFn: () => api.listCups(league.id) });
  const membersQuery = useQuery({
    queryKey: ["league-members", league.id],
    queryFn: () => api.getLeagueMembers(league.id),
  });

  function displayName(userId: string) {
    return membersQuery.data?.find((m) => m.userId === userId)?.displayName ?? userId.slice(0, 8);
  }

  const hasActiveCup = cupsQuery.data?.some((c) => c.status === "in_progress") ?? false;
  const recommendedRounds = getRecommendedCupRounds(format, membersQuery.data?.length ?? 0);

  const [uploadingIconCupId, setUploadingIconCupId] = useState<string | null>(null);
  const uploadCupIconMutation = useMutation({
    mutationFn: ({ cupId, formData }: { cupId: string; formData: FormData }) => api.uploadCupIcon(league.id, cupId, formData),
    onMutate: ({ cupId }) => setUploadingIconCupId(cupId),
    onSettled: () => setUploadingIconCupId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cups", league.id] }),
  });

  const createCupMutation = useMutation({
    mutationFn: () =>
      api.createCup(league.id, {
        name,
        format,
        startingGameweekNumber: Number(startingGameweekNumber),
        configuredRounds: rounds ? Number(rounds) : undefined,
      }),
    onSuccess: () => {
      setCreateError(null);
      setName("");
      setRounds("");
      queryClient.invalidateQueries({ queryKey: ["cups", league.id] });
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Failed to create cup"),
  });

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
      {isCommissioner && !hasActiveCup && (
        <View style={[ui.card, { gap: 8 }]}>
          <Text style={ui.h2}>Start a cup competition</Text>
          <TextInput style={ui.input} placeholder="Name (e.g. MyFACup)" value={name} onChangeText={setName} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["single", "double"] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFormat(f)}
                style={[ui.buttonSmall, format !== f && { backgroundColor: "#e2e8f0" }]}
              >
                <Text style={format === f ? ui.buttonTextSmall : { fontSize: 12, color: "#334155" }}>
                  {f === "single" ? "Single elim" : "Double elim"}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={ui.input}
            placeholder="Starting gameweek"
            keyboardType="number-pad"
            value={startingGameweekNumber}
            onChangeText={setStartingGameweekNumber}
          />
          <TextInput
            style={ui.input}
            placeholder={`Rounds (recommended: ${recommendedRounds})`}
            keyboardType="number-pad"
            value={rounds}
            onChangeText={setRounds}
          />
          <Text style={ui.subtext}>
            {membersQuery.data?.length ?? 0} entrants (all current league members)
          </Text>
          {createError && <Text style={ui.errorText}>{createError}</Text>}
          <Pressable
            style={[ui.button, createCupMutation.isPending && ui.buttonDisabled]}
            onPress={() => createCupMutation.mutate()}
            disabled={createCupMutation.isPending}
          >
            <Text style={ui.buttonText}>Start Cup</Text>
          </Pressable>
        </View>
      )}
      {isCommissioner && hasActiveCup && (
        <Text style={ui.subtext}>This league already has an active cup — start a new one once it completes.</Text>
      )}

      {cupsQuery.isLoading && <Text style={ui.subtext}>Loading cups...</Text>}
      {cupsQuery.isError && (
        <Text style={ui.errorText}>
          {cupsQuery.error instanceof Error ? cupsQuery.error.message : "Failed to load cups"}
        </Text>
      )}
      {cupsQuery.data?.length === 0 && <Text style={ui.subtext}>No cup competitions yet.</Text>}
      {cupsQuery.data?.map((cup) => (
        <CupBracket
          key={cup.id}
          cup={cup}
          displayName={displayName}
          isCommissioner={isCommissioner}
          onUploadIcon={(cupId, formData) => uploadCupIconMutation.mutate({ cupId, formData })}
          uploadingIconCupId={uploadingIconCupId}
        />
      ))}
    </ScrollView>
  );
}
