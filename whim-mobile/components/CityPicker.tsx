import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { citiesByCountry } from '@/data/cities';

interface CityPickerProps {
  visible: boolean;
  current: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}

// Bottom-sheet city picker built on React Native's own Modal (reliable — the
// gorhom bottom-sheet version wasn't presenting). Grouped by country.
export default function CityPicker({ visible, current, onSelect, onClose }: CityPickerProps) {
  const groups = citiesByCountry();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0" style={{ backgroundColor: 'rgba(28,28,28,0.42)' }} onPress={onClose} />
        <View
          className="max-h-[74%] rounded-t-[28px] bg-white pt-3"
          style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: -8 } }}
        >
          <View className="mb-1 h-1.5 w-10 self-center rounded-full bg-[#E2DDD3]" />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 36, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
            <Text className="mb-1 font-serif text-2xl text-ink">Where to?</Text>
            <Text className="mb-4 text-[14px] text-muted">Pick a city to start discovering.</Text>

            {groups.map(({ country, cities }) => (
              <View key={country} className="mb-2">
                <Text className="mb-1 mt-3 text-[12px] font-bold uppercase tracking-wide text-muted">{country}</Text>
                {cities.map((c) => {
                  const selected = c.name === current;
                  return (
                    <Pressable
                      key={c.name}
                      onPress={() => onSelect(c.name)}
                      className={`mb-1.5 flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
                        selected ? 'border-ink bg-ink' : 'border-ink/10 bg-white'
                      }`}
                    >
                      <Text className={`text-[16px] font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{c.name}</Text>
                      {selected && <Text className="text-white">✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
