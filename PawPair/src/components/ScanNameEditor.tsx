import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Pencil } from "lucide-react-native";


export default function ScanNameEditor({
  value,
  onSave,
  color = "white",
  disabled = false,
}: {
  value: string;
  onSave: (name: string) => void | Promise<void>;
  color?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Keep the draft in sync when the saved name changes (e.g. loaded from Firestore)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const save = async () => {
    if (savingRef.current) return;
    const name = draft.trim();
    setEditing(false);
    if (!name || name === value) {
      setDraft(value); // nothing to save
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(name);
    } catch (e) {
      console.warn("Couldn't save scan name", e);
      setDraft(value);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={[styles.row, { borderBottomColor: color }]}>
      <Pencil size={20} color={color} />
      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={save}
          onBlur={save}
          autoFocus
          selectTextOnFocus
          maxLength={30}
          returnKeyType="done"
          placeholder="Name this scan"
          placeholderTextColor={color}
          style={[styles.text, styles.input, { color }]}
        />
      ) : (
        <Pressable
          onPress={() => setEditing(true)}
          disabled={disabled}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Scan name: ${value}. Tap to rename.`}
        >
          <Text style={[styles.text, { color }]} numberOfLines={1}>
            {draft || value}
          </Text>
        </Pressable>
      )}
      {saving && <ActivityIndicator size="small" color={color} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    borderBottomWidth: 2,
    paddingBottom: 4,
    marginVertical: 16,
    maxWidth: "85%",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
  },
  input: {
    minWidth: 160,
    padding: 0,
  },
});