// Messages between a staff member and the managers of their home marina. Staff see their own
// conversation; managers and admins open a staff member's conversation with ?staff=<id>.
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessagesSquare, SendHorizontal } from "lucide-react-native";
import { fmtShort, fmtTime, localDay, nextId, today } from "@marina/shared";
import { EmptyState, StackHeader, Txt } from "@/components/ui";
import { useMe, useStore } from "@/store";
import { fonts, useTheme } from "@/theme";

export default function Chat() {
  const { db, ix, update, user, isManager, scope } = useStore();
  const self = useMe();
  const { staff: staffParam } = useLocalSearchParams<{ staff?: string }>();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const scroll = useRef<ScrollView>(null);
  // Managers write as the office (fromStaff false); staff write as themselves.
  const other = isManager ? db.staff.find((s) => s.id === staffParam && scope.includes(s.marinaId)) : undefined;
  const me = isManager ? other : self;
  const asStaff = !isManager;
  const manager = me && db.staff.find((s) => s.marinaId === me.marinaId && s.position === "Marina Manager");
  const thread = me ? db.chat.filter((m) => m.staffId === me.id) : [];
  const unread = thread.some((m) => m.fromStaff !== asStaff && !m.read);

  // Opening the conversation marks the other side's messages as read.
  useEffect(() => {
    if (me && unread) update((d) => ({ ...d, chat: d.chat.map((m) => (m.staffId === me.id && m.fromStaff !== asStaff ? { ...m, read: true } : m)) }));
  }, [me, unread, update, asStaff]);

  if (!user) return <Redirect href="/login" />;

  const send = () => {
    const body = text.trim();
    if (!body || !me) return;
    const by = asStaff ? me.name : user.name;
    update((d) => ({ ...d, chat: [...d.chat, { id: nextId("ch", d.chat), staffId: me.id, fromStaff: asStaff, by, text: body, at: new Date().toISOString(), read: false }] }));
    setText("");
  };

  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StackHeader title="Messages" />
        {isManager
          ? <EmptyState icon={MessagesSquare} title="Choose someone to message" body="Open Team → Messages and pick a staff member." />
          : <EmptyState icon={MessagesSquare} title="No staff record linked" body="Ask your manager to add you to the staff list." />}
      </View>
    );
  }

  const mine = (m: { fromStaff: boolean }) => m.fromStaff === asStaff;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {asStaff
        ? <StackHeader title={`${ix.marina(me.marinaId)?.name} office`} subtitle={manager ? `${manager.name}, Marina Manager` : "Marina managers"} />
        : <StackHeader title={me.name} subtitle={`${me.position} · ${ix.marina(me.marinaId)?.name}`} />}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {thread.length === 0 && <EmptyState icon={MessagesSquare} title="No messages yet" body={asStaff ? "Questions about shifts, boats or repairs go straight to your manager." : `${me.name.split(" ")[0]} sees your message in the app.`} />}
          {thread.map((m, i) => {
            const day = localDay(m.at);
            const newDay = i === 0 || localDay(thread[i - 1].at) !== day;
            return (
              <View key={m.id}>
                {newDay && <Txt v="caption" color={t.text3} style={{ textAlign: "center", marginVertical: 8 }}>{day === today() ? "Today" : fmtShort(day)}</Txt>}
                <View style={{ alignSelf: mine(m) ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                  <View style={{ backgroundColor: mine(m) ? t.primary : t.surface, borderWidth: mine(m) ? 0 : 1, borderColor: t.border, borderRadius: 18, borderBottomRightRadius: mine(m) ? 6 : 18, borderBottomLeftRadius: mine(m) ? 18 : 6, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Txt color={mine(m) ? t.onPrimary : t.text}>{m.text}</Txt>
                  </View>
                  <Txt v="caption" color={t.text3} style={{ marginTop: 2, textAlign: mine(m) ? "right" : "left" }}>
                    {mine(m) && asStaff ? "" : `${m.by.split(" ")[0]} · `}{fmtTime(m.at)}{mine(m) && m.read ? " · Seen" : ""}
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
