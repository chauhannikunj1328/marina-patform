// Takes or picks a photo and returns a small JPEG data URL (max 720 px), so repair
// reports stay light enough to keep on the device.
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

async function shrink(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: 720 }).renderAsync();
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return `data:image/jpeg;base64,${out.base64}`;
}

export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  return shrink(res.assets[0].uri);
}

export async function pickPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  return shrink(res.assets[0].uri);
}
