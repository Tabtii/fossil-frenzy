import { useState } from 'react';

import { eraForAct } from '@/engine/run';
import { GuideLessons } from '@/features/shell/FieldGuideSheet';
import { AppText, BottomSheet, Button, ERA_LABELS } from '@/ui';

export function BattlePauseSheet({ visible, act, floor, onClose, onLeave, reducedMotion }: {
  visible: boolean; act: number; floor: number | null; onClose: () => void; onLeave: () => void; reducedMotion: boolean;
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Expeditionspause" reducedMotion={reducedMotion} testID="battle-pause-sheet"
      footer={<>
        <Button label="Weiterspielen" fullWidth onPress={onClose} testID="battle-pause-continue" />
        <Button label="Zurück zum Lager" variant="secondary" fullWidth onPress={onLeave} accessibilityHint="Behält den aktuellen Kampf bei, damit du ihn später fortsetzen kannst." testID="battle-pause-home" />
      </>}
    >
      <AppText variant="overline" tone="accent">AKT {act + 1} · {ERA_LABELS[eraForAct(act)].toUpperCase()}{floor === null ? '' : ` · ETAGE ${floor + 1}`}</AppText>
      <AppText tone="secondary">Deine Expedition bleibt aktiv. Im Lager kannst du sie später an genau dieser Stelle fortsetzen.</AppText>
      <Button label={rulesOpen ? 'Regeln ausblenden' : 'Spielregeln nachschlagen'} variant="ghost" fullWidth onPress={() => setRulesOpen((open) => !open)} testID="battle-pause-rules" />
      {rulesOpen ? <GuideLessons /> : null}
    </BottomSheet>
  );
}
