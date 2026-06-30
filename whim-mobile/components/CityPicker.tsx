import { useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { citiesByCountry } from '@/data/cities';

interface CityPickerProps {
  visible: boolean;
  current: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}

/** Bottom-sheet list of every available city, grouped by country. */
export default function CityPicker({ visible, current, onSelect, onClose }: CityPickerProps) {
  const sheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    [],
  );

  const groups = citiesByCountry();

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['72%']}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      handleIndicatorStyle={{ backgroundColor: '#E2DDD3', width: 38 }}
      backgroundStyle={{ backgroundColor: '#fff', borderRadius: 28 }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <Text className="mb-1 font-serif text-2xl font-semibold text-ink">Where to?</Text>
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
                  <Text className={`text-[16px] font-semibold ${selected ? 'text-white' : 'text-ink'}`}>
                    {c.flag}  {c.name}
                  </Text>
                  {selected && <Text className="text-white">✓</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
