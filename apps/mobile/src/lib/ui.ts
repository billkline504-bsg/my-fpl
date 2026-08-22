import { StyleSheet } from "react-native";

export const colors = {
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  subtext: "#64748b",
  primary: "#0f172a",
  primaryText: "#ffffff",
  danger: "#dc2626",
  success: "#15803d",
};

export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  h1: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
  },
  h2: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  text: {
    fontSize: 14,
    color: colors.text,
  },
  subtext: {
    fontSize: 12,
    color: colors.subtext,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  successText: {
    fontSize: 13,
    color: colors.success,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonSmall: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonTextSmall: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "600",
  },
  linkText: {
    fontSize: 13,
    color: colors.subtext,
    textDecorationLine: "underline",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    flexDirection: "row",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  tabButtonTextActive: {
    color: colors.text,
  },
});
