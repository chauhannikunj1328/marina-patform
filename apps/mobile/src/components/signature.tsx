// Signature pad: draw with a finger (or mouse in the web preview). Produces an SVG path.
import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme";
import { Txt } from "./ui";

export type Signature = { d: string; w: number; h: number };

export function SignaturePad({ value, onChange, label }: { value?: Signature; onChange: (s?: Signature) => void; label: string }) {
  const { t } = useTheme();
  const [size, setSize] = useState({ w: 300, h: 160 });
  const [live, setLive] = useState("");
  const path = useRef("");
  const sizeRef = useRef(size);
  const commit = useRef(onChange);
  const prev = useRef(value?.d ?? "");
  useEffect(() => {
    commit.current = onChange;
    prev.current = value?.d ?? "";
  });
  // The touch handlers read these refs only while a finger is moving, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        path.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
        setLive(path.current);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        path.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
        setLive(path.current);
      },
      onPanResponderRelease: () => {
        const d = `${prev.current} ${path.current}`.trim();
        path.current = "";
        setLive("");
        commit.current({ d, ...sizeRef.current });
      },
    }),
  );
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { w: Math.round(width), h: Math.round(height) };
    setSize(sizeRef.current);
  };
  const d = `${value?.d ?? ""} ${live}`.trim();
  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityLabel={label}
        accessibilityHint="Draw a signature with your finger"
        onLayout={onLayout}
        {...responder.panHandlers}
        style={{ height: 160, borderRadius: 12, borderWidth: 1, borderColor: t.borderStrong, borderStyle: value ? "solid" : "dashed", backgroundColor: "#FFFFFF", overflow: "hidden" }}
      >
        <Svg width={size.w} height={size.h} pointerEvents="none">
          {d ? <Path d={d} stroke="#17191E" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </Svg>
        {!d && <Txt v="bodySm" color="#8A8F98" style={{ position: "absolute", top: 68, left: 0, right: 0, textAlign: "center" }} >Sign here</Txt>}
        <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 32, height: 1, backgroundColor: "#D7D7D2" }} />
      </View>
      {value && (
        <Pressable accessibilityRole="button" onPress={() => onChange(undefined)} hitSlop={8} style={{ alignSelf: "flex-end" }}>
          <Txt v="caption" weight="semibold" color={t.greenText}>Clear signature</Txt>
        </Pressable>
      )}
    </View>
  );
}

/** A saved signature, scaled to fit. */
export function SignatureView({ value, height = 72 }: { value: Signature; height?: number }) {
  const { t } = useTheme();
  return (
    <View style={{ height, borderRadius: 8, borderWidth: 1, borderColor: t.border, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${value.w} ${value.h}`} preserveAspectRatio="xMidYMid meet">
        <Path d={value.d} stroke="#17191E" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
