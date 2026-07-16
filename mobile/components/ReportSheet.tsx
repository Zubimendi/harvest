import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Button } from './ui/Button';
import { useState } from 'react';

interface ReportSheetProps {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const REASONS = [
  { id: 'SPOILED_OR_UNSAFE', label: 'Food was spoiled or unsafe' },
  { id: 'MISLEADING', label: 'Listing was misleading' },
  { id: 'NO_SHOW', label: 'Counterpart did not show up' },
  { id: 'INAPPROPRIATE', label: 'Inappropriate behavior or content' },
  { id: 'OTHER', label: 'Other issue' },
];

export function ReportSheet({ onClose, onSubmit }: ReportSheetProps) {
  const [selected, setSelected] = useState('');

  return (
    <View className="p-6 bg-surface dark:bg-surface-dark rounded-t-3xl border-t border-border dark:border-border-dark shadow-xl max-h-[80%]">
      <Text className="font-display text-2xl text-accent-error dark:text-accent-error-dark mb-2">
        Report Issue
      </Text>
      <Text className="font-body text-text-secondary dark:text-text-secondary-dark mb-6">
        We take reports seriously. The other party will not be notified that you reported them.
      </Text>

      <ScrollView className="mb-6">
        {REASONS.map(reason => (
          <TouchableOpacity
            key={reason.id}
            onPress={() => setSelected(reason.id)}
            className={`p-4 border-b border-border dark:border-border-dark flex-row items-center ${selected === reason.id ? 'bg-surface-alt dark:bg-surface-alt-dark' : ''}`}
          >
            <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${selected === reason.id ? 'border-brand dark:border-brand-dark' : 'border-border'}`}>
              {selected === reason.id && <View className="w-2.5 h-2.5 rounded-full bg-brand dark:bg-brand-dark" />}
            </View>
            <Text className="font-body text-text-primary dark:text-text-primary-dark text-base">
              {reason.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="flex-row">
        <View className="flex-1 mr-2">
          <Button label="Cancel" variant="secondary" onPress={onClose} />
        </View>
        <View className="flex-1 ml-2">
          <Button 
            label="Submit Report" 
            variant="destructive" 
            onPress={() => onSubmit(selected)}
          />
        </View>
      </View>
    </View>
  );
}
