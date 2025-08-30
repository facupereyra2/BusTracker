import { StyleSheet } from "react-native";
import { COLORS } from "./theme";

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "90%",
    maxWidth: 340,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  heading: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginBottom: 2,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    color: COLORS.text,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
    width: "100%",
  },
  buttonSecondary: {
    backgroundColor: COLORS.accentSecondary,
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "bold",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  outlineButtonText: {
    color: COLORS.accent,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 8,
    fontSize: 14,
  },
});