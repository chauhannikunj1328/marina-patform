// Messages between a staff member and the managers of their home marina.
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessagesSquare, SendHorizontal } from "lucide-react-native";
import { fmtShort, fmtTime, localDay, nextId, today } from "@marina/shared";
import { EmptyState, StackHeader, Txt } from "@/components/ui";
import { useMe, useStore } from "@/store";
import { fonts, useTheme } from "@/theme";

export default function Chat() {
  const { db, ix, update, user } = useStore();
  const me = useMe();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const scroll = useRef<ScrollView>(null);
  const manager = me && db.staff.find((s) => s.marinaId === me.marinaId && s.position === "Marina Manager");
  const thread = me ? db.chat.filter((m) => m.staffId === me.id) : [];
  const unread = thread.some((m) => !m.fromStaff && !m.read);

  // Opening the conversation marks the manager's messages as read.
  useEffect(() => {
    if (me && unread) update((d) => ({ ...d, chat: d.chat.map((m) => (m.staffId === me.id && !m.fromStaff ? { ...m, read: true } : m)) }));
  }, [me, unread, update]);

  if (!user) return <Redirect href="/login" />;

  const send = () => {
    const body = text.trim();
    if (!body || !me) return;
    update((d) => ({ ...d, chat: [...d.chat, { id: nextId("ch", d.chat), staffId: me.id, fromStaff: true, by: me.name, text: body, at: new Date().toISOString(), read: false }] }));
    setText("");
  };

  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title="Messages" />
        <EmptyState icon={MessagesSquare} title="No staff record linked" body="Ask your manager to add you to the staff list." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StackHeader title={`${ix.marina(me.marinaId)?.name} office`} subtitle={manager ? `${manager.name}, Marina Manager` : "Marina managers"} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {thread.length === 0 && <EmptyState icon={MessagesSquare} title="No messages yet" body="Questions about shifts, boats or repairs go straight to your manager." />}
          {thread.map((m, i) => {
            const day = localDay(m.at);
            const newDay = i === 0 || localDay(thread[i - 1].at) !== day;
            return (
              <View key={m.id}>
                {newDay && <Txt v="caption" color={t.text3} style={{ textAlign: "center", marginVertical: 8 }}>{day === today() ? "Today" : fmtShort(day)}</Txt>}
                <View style={{ alignSelf: m.fromStaff ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                  <View style={{ backgroundColor: m.fromStaff ? t.primary : t.surface, borderWidth: m.fromStaff ? 0 : 1, borderColor: t.border, borderRadius: 18, borderBottomRightRadius: m.fromStaff ? 6 : 18, borderBottomLeftRadius: m.fromStaff ? 18 : 6, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Txt color={m.fromStaff ? t.onPrimary : t.text}>{m.text}</Txt>
                  </View>
                  <Txt v="caption" color={t.text3} style={{ marginTop: 2, textAlign: m.fromStaff ? "right" : "left" }}>
                    {m.fromStaff ? "" : `${m.by.split(" ")[0]} · `}{fmtTime(m.at)}{m.fromStaff && m.read ? " · Seen" : ""}
                  </Txt>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={t.text3}
            accessibilityLabel="Message"
            multiline
            numberOfLines={1}
            style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: t.borderStrong, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontFamily: fonts.regular, fontSize: 15, color: t.text, backgroundColor: t.bg }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={!text.trim()} onPress={send} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? t.primaryPressed : t.primary, opacity: text.trim() ? 1 : 0.4 })}>
            <SendHorizontal size={20} color={t.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
