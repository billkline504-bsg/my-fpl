import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { colors } from "../lib/ui";

function iconStyle(size: number) {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  };
}

export function Icon({ iconUrl, size = 24 }: { iconUrl: string | null; size?: number }) {
  return (
    <View style={iconStyle(size)}>
      {iconUrl ? (
        <Image source={{ uri: iconUrl }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: colors.subtext, fontSize: size * 0.4 }}>?</Text>
      )}
    </View>
  );
}

export function IconUpload({
  iconUrl,
  onUpload,
  busy,
  size = 32,
}: {
  iconUrl: string | null;
  onUpload: (formData: FormData) => void;
  busy?: boolean;
  size?: number;
}) {
  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (!asset) return;

    const formData = new FormData();
    formData.append("file", {
      uri: asset.uri,
      name: asset.fileName ?? "icon.jpg",
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob);
    onUpload(formData);
  }

  return (
    <Pressable onPress={pickImage} disabled={busy} style={iconStyle(size)}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.subtext} />
      ) : iconUrl ? (
        <Image source={{ uri: iconUrl }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: colors.subtext, fontSize: size * 0.4 }}>?</Text>
      )}
    </Pressable>
  );
}
